-- ==============================================================================
-- JSPM Campus Lost & Found - Security Hardening & Audit Migration
-- ==============================================================================

-- 1. ADD SERVER-SIDE VALIDATION CONSTRAINTS ON PROFILES
DO $$
BEGIN
    -- Check constraint for Indian phone format (+91 or 0 prefix, 10 digits starting with 6-9)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_phone_format') THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT chk_profiles_phone_format 
        CHECK (phone ~ '^(?:\+91|0)?[6-9]\d{9}$');
    END IF;

    -- Check constraint for PRN format (alphanumeric, 5-20 characters)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_prn_format') THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT chk_profiles_prn_format 
        CHECK (prn ~ '^[A-Za-z0-9-]{5,20}$');
    END IF;

    -- Check constraint for Email format
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_email_format') THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT chk_profiles_email_format 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END $$;

-- 2. ADD SERVER-SIDE VALIDATION CONSTRAINTS ON ITEMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_items_name_length') THEN
        ALTER TABLE public.items 
        ADD CONSTRAINT chk_items_name_length 
        CHECK (char_length(trim(item_name)) >= 3 AND char_length(item_name) <= 100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_items_description_length') THEN
        ALTER TABLE public.items 
        ADD CONSTRAINT chk_items_description_length 
        CHECK (char_length(trim(description)) >= 10 AND char_length(description) <= 1000);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_items_incident_date_not_future') THEN
        ALTER TABLE public.items 
        ADD CONSTRAINT chk_items_incident_date_not_future 
        CHECK (incident_date <= CURRENT_DATE);
    END IF;
END $$;

-- Add owner_name column to items for secure display without exposing profiles table
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Backfill existing items with owner_name from profiles
UPDATE public.items i
SET owner_name = p.full_name
FROM public.profiles p
WHERE i.owner_id = p.id AND i.owner_name IS NULL;

-- Trigger to automatically set owner_name on items before insert
CREATE OR REPLACE FUNCTION public.handle_item_insert_owner_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_name IS NULL OR NEW.owner_name = '' THEN
        SELECT full_name INTO NEW.owner_name
        FROM public.profiles
        WHERE id = NEW.owner_id;
        
        IF NEW.owner_name IS NULL THEN
            NEW.owner_name := 'Campus Student';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_item_owner_name ON public.items;
CREATE TRIGGER trg_set_item_owner_name
BEFORE INSERT ON public.items
FOR EACH ROW EXECUTE FUNCTION public.handle_item_insert_owner_name();

-- Trigger to prevent altering immutable fields on items
CREATE OR REPLACE FUNCTION public.validate_item_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'Item ID cannot be changed.';
    END IF;
    IF NEW.owner_id <> OLD.owner_id THEN
        RAISE EXCEPTION 'Item ownership cannot be transferred.';
    END IF;
    IF NEW.item_type <> OLD.item_type THEN
        RAISE EXCEPTION 'Item type (lost/found) cannot be changed after creation.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_item_update ON public.items;
CREATE TRIGGER trg_validate_item_update
BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION public.validate_item_update();

-- 3. ADD SERVER-SIDE VALIDATION CONSTRAINTS ON CLAIMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_claims_message_length') THEN
        ALTER TABLE public.claims 
        ADD CONSTRAINT chk_claims_message_length 
        CHECK (char_length(trim(claim_message)) >= 10 AND char_length(claim_message) <= 800);
    END IF;
END $$;

-- Add claimant_name column to claims for secure display without exposing profiles table
ALTER TABLE public.claims 
ADD COLUMN IF NOT EXISTS claimant_name TEXT;

-- Backfill existing claims with claimant_name from profiles
UPDATE public.claims c
SET claimant_name = p.full_name
FROM public.profiles p
WHERE c.claimant_id = p.id AND c.claimant_name IS NULL;

-- Trigger to automatically set claimant_name on claims before insert
CREATE OR REPLACE FUNCTION public.handle_claim_insert_claimant_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.claimant_name IS NULL OR NEW.claimant_name = '' THEN
        SELECT full_name INTO NEW.claimant_name
        FROM public.profiles
        WHERE id = NEW.claimant_id;
        
        IF NEW.claimant_name IS NULL THEN
            NEW.claimant_name := 'Student Claimant';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_claim_claimant_name ON public.claims;
CREATE TRIGGER trg_set_claim_claimant_name
BEFORE INSERT ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.handle_claim_insert_claimant_name();

-- Prevent claim tampering and unauthorized modifications
CREATE OR REPLACE FUNCTION public.validate_claim_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.item_id <> OLD.item_id THEN
        RAISE EXCEPTION 'Cannot reassign a claim to a different item.';
    END IF;
    IF NEW.claimant_id <> OLD.claimant_id THEN
        RAISE EXCEPTION 'Cannot reassign a claim to a different claimant.';
    END IF;
    IF NEW.claimant_name IS DISTINCT FROM OLD.claimant_name THEN
        RAISE EXCEPTION 'Claimant name cannot be altered.';
    END IF;
    IF NEW.claim_message <> OLD.claim_message THEN
        RAISE EXCEPTION 'Identifying details submitted by claimant cannot be altered.';
    END IF;
    -- Status transition check: only pending claims can transition to approved or rejected
    IF OLD.status <> 'pending' AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Claim status cannot be modified once finalized.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_claim_update ON public.claims;
CREATE TRIGGER trg_validate_claim_update
BEFORE UPDATE ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.validate_claim_update();

-- 4. HARDEN CLAIM INSERT VALIDATION (Block claims on lost items & returned items)
CREATE OR REPLACE FUNCTION public.validate_claim_insert()
RETURNS TRIGGER AS $$
DECLARE
    item_owner UUID;
    item_curr_status TEXT;
    item_curr_type TEXT;
    item_name_text TEXT;
BEGIN
    SELECT owner_id, status, item_type, item_name 
    INTO item_owner, item_curr_status, item_curr_type, item_name_text
    FROM public.items
    WHERE id = NEW.item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referenced item does not exist.';
    END IF;

    -- Block claims on lost item reports (claims are exclusively for found belongings)
    IF item_curr_type <> 'found' THEN
        RAISE EXCEPTION 'Ownership claims can only be submitted for found items.';
    END IF;

    -- Prevent self-claiming
    IF item_owner = NEW.claimant_id THEN
        RAISE EXCEPTION 'You cannot claim an item that you reported.';
    END IF;

    -- Prevent claims on returned or closed items
    IF item_curr_status = 'returned' OR item_curr_status = 'closed' THEN
        RAISE EXCEPTION 'This item is no longer available for claims.';
    END IF;

    -- Insert secure in-app notification for item owner
    INSERT INTO public.notifications (user_id, title, message, related_item_id, related_claim_id)
    VALUES (
        item_owner,
        'New Claim Received',
        'A student has submitted a claim for your reported item: "' || item_name_text || '". Please review identifying details.',
        NEW.item_id,
        NEW.id
    );

    -- Update item status to claim_pending if currently open
    IF item_curr_status = 'open' THEN
        UPDATE public.items
        SET status = 'claim_pending', updated_at = timezone('utc'::text, now())
        WHERE id = NEW.item_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. HARDEN PROFILES IMMUTABILITY (PRN and email cannot be changed after signup)
CREATE OR REPLACE FUNCTION public.validate_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'Profile ID cannot be changed.';
    END IF;
    IF NEW.prn <> OLD.prn THEN
        RAISE EXCEPTION 'College PRN cannot be modified after registration.';
    END IF;
    IF NEW.email <> OLD.email THEN
        RAISE EXCEPTION 'Registered college email cannot be modified directly.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_profile_update ON public.profiles;
CREATE TRIGGER trg_validate_profile_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_update();

-- 6. HARDEN NOTIFICATIONS (Only is_read can be updated)
CREATE OR REPLACE FUNCTION public.validate_notification_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id <> OLD.user_id OR NEW.title <> OLD.title OR NEW.message <> OLD.message OR NEW.related_item_id IS DISTINCT FROM OLD.related_item_id OR NEW.related_claim_id IS DISTINCT FROM OLD.related_claim_id THEN
        RAISE EXCEPTION 'Only the read status of a notification can be modified.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_notification_update ON public.notifications;
CREATE TRIGGER trg_validate_notification_update
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.validate_notification_update();

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 7. TIGHTEN PROFILES ROW LEVEL SECURITY TO PREVENT MASS DATA SCRAPING
-- Drop overly broad policy that allowed any authenticated user to view PRN and phone numbers
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow viewing item owner display names" ON public.profiles;

-- Policy A: Students can view and manage their own full profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy B: Reveal contact coordinates ONLY for approved claim handover between the two authorized parties
DROP POLICY IF EXISTS "Users can view approved claim counterpart profile" ON public.profiles;
CREATE POLICY "Users can view approved claim counterpart profile"
ON public.profiles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.claims c
        JOIN public.items i ON i.id = c.item_id
        WHERE c.status = 'approved'
          AND (
            -- Current user is claimant; profile belongs to finder
            (c.claimant_id = auth.uid() AND i.owner_id = public.profiles.id)
            OR
            -- Current user is finder; profile belongs to approved claimant
            (i.owner_id = auth.uid() AND c.claimant_id = public.profiles.id)
          )
    )
);

-- 8. TIGHTEN SUPABASE STORAGE UPLOAD RLS POLICY
-- Require authenticated users to upload strictly into their own folder (userId/...)
DROP POLICY IF EXISTS "Allow authenticated users to upload item images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload item images to own folder" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload item images to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'item-images' 
    AND 
    auth.uid()::text = (storage.foldername(name))[1]
    AND
    LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);
