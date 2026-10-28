-- ==============================================================================
-- JSPM Campus Lost & Found - Initial Schema Migration
-- ==============================================================================

-- 1. Create PROFILES table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    prn TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT prn_length CHECK (char_length(prn) >= 5)
);

-- Index for PRN and Email searches
CREATE INDEX IF NOT EXISTS idx_profiles_prn ON public.profiles(prn);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. Create ITEMS table
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('lost', 'found')),
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    incident_date DATE NOT NULL,
    image_path TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claim_pending', 'returned', 'closed')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for items
CREATE INDEX IF NOT EXISTS idx_items_owner_id ON public.items(owner_id);
CREATE INDEX IF NOT EXISTS idx_items_type_status ON public.items(item_type, status);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items(created_at DESC);

-- 3. Create CLAIMS table
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    claimant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    claim_message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Prevent duplicate active claims (pending or approved) for the same item by the same claimant
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_claim 
ON public.claims(item_id, claimant_id) 
WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_claims_item_id ON public.claims(item_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant_id ON public.claims(claimant_id);

-- 4. Create NOTIFICATIONS table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    related_claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ==============================================================================
-- AUTOMATIC TIMESTAMPS TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_items_updated_at ON public.items;
CREATE TRIGGER set_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_claims_updated_at ON public.claims;
CREATE TRIGGER set_claims_updated_at
BEFORE UPDATE ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- AUTH -> PROFILE TRIGGER FUNCTION
-- Automatically creates a profile record when a user signs up with Supabase Auth
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
    user_phone TEXT;
    user_prn TEXT;
BEGIN
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student');
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
    user_prn := COALESCE(NEW.raw_user_meta_data->>'prn', 'PRN-' || SUBSTRING(NEW.id::TEXT, 1, 8));

    INSERT INTO public.profiles (id, full_name, phone, email, prn, created_at, updated_at)
    VALUES (
        NEW.id,
        user_full_name,
        user_phone,
        NEW.email,
        user_prn,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- BUSINESS LOGIC & NOTIFICATION TRIGGERS
-- ==============================================================================

-- 1. Validate Claim Creation (Cannot claim own item)
CREATE OR REPLACE FUNCTION public.validate_claim_insert()
RETURNS TRIGGER AS $$
DECLARE
    item_owner UUID;
    item_curr_status TEXT;
    item_name_text TEXT;
BEGIN
    SELECT owner_id, status, item_name INTO item_owner, item_curr_status, item_name_text
    FROM public.items
    WHERE id = NEW.item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referenced item does not exist.';
    END IF;

    -- Prevent self-claiming
    IF item_owner = NEW.claimant_id THEN
        RAISE EXCEPTION 'You cannot claim an item that you reported.';
    END IF;

    -- Prevent claims on non-claimable items
    IF item_curr_status = 'returned' OR item_curr_status = 'closed' THEN
        RAISE EXCEPTION 'This item is no longer available for claims.';
    END IF;

    -- Create notification for item owner
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
        SET status = 'claim_pending', updated_at = now()
        WHERE id = NEW.item_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_claim_insert ON public.claims;
CREATE TRIGGER on_claim_insert
AFTER INSERT ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.validate_claim_insert();

-- 2. Claim Status Update Trigger (Approval / Rejection)
CREATE OR REPLACE FUNCTION public.handle_claim_status_update()
RETURNS TRIGGER AS $$
DECLARE
    item_name_text TEXT;
    item_owner_id UUID;
    other_pending_count INT;
BEGIN
    -- Only trigger if status actually changed
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT item_name, owner_id INTO item_name_text, item_owner_id
    FROM public.items
    WHERE id = NEW.item_id;

    -- If claim APPROVED
    IF NEW.status = 'approved' THEN
        -- Mark item as returned
        UPDATE public.items
        SET status = 'returned', updated_at = now()
        WHERE id = NEW.item_id;

        -- Reject all other pending claims on this item
        UPDATE public.claims
        SET status = 'rejected', updated_at = now()
        WHERE item_id = NEW.item_id AND id <> NEW.id AND status = 'pending';

        -- Notify claimant
        INSERT INTO public.notifications (user_id, title, message, related_item_id, related_claim_id)
        VALUES (
            NEW.claimant_id,
            'Claim Approved!',
            'Great news! Your claim for "' || item_name_text || '" has been approved by the finder. You can now coordinate handover.',
            NEW.item_id,
            NEW.id
        );
    END IF;

    -- If claim REJECTED
    IF NEW.status = 'rejected' THEN
        -- Notify claimant
        INSERT INTO public.notifications (user_id, title, message, related_item_id, related_claim_id)
        VALUES (
            NEW.claimant_id,
            'Claim Status Update',
            'Your claim for "' || item_name_text || '" was reviewed and not approved by the finder.',
            NEW.item_id,
            NEW.id
        );

        -- Check if any other pending claims exist; if none, reset item status to open
        SELECT COUNT(*) INTO other_pending_count
        FROM public.claims
        WHERE item_id = NEW.item_id AND status = 'pending';

        IF other_pending_count = 0 THEN
            UPDATE public.items
            SET status = 'open', updated_at = now()
            WHERE id = NEW.item_id AND status = 'claim_pending';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_claim_status_update ON public.claims;
CREATE TRIGGER on_claim_status_update
AFTER UPDATE ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.handle_claim_status_update();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Authenticated users can view basic profiles (full_name, id)
-- Users can view and update their own full profile
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- ITEMS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone authenticated can view all items
CREATE POLICY "Authenticated users can view items"
ON public.items FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert their own items
CREATE POLICY "Users can create items"
ON public.items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Owners can update their own items
CREATE POLICY "Owners can update own items"
ON public.items FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Owners can delete their own items
CREATE POLICY "Owners can delete own items"
ON public.items FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- ------------------------------------------------------------------------------
-- CLAIMS POLICIES
-- ------------------------------------------------------------------------------
-- A claimant can view their own claims; an item owner can view claims on their items
CREATE POLICY "Users can view relevant claims"
ON public.claims FOR SELECT
TO authenticated
USING (
    auth.uid() = claimant_id 
    OR 
    item_id IN (SELECT id FROM public.items WHERE owner_id = auth.uid())
);

-- Users can insert claims for items they do not own
CREATE POLICY "Users can create claims"
ON public.claims FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = claimant_id 
    AND 
    item_id NOT IN (SELECT id FROM public.items WHERE owner_id = auth.uid())
);

-- Only the owner of the item can update claim status (approve / reject)
CREATE POLICY "Item owners can update claims"
ON public.claims FOR UPDATE
TO authenticated
USING (
    item_id IN (SELECT id FROM public.items WHERE owner_id = auth.uid())
)
WITH CHECK (
    item_id IN (SELECT id FROM public.items WHERE owner_id = auth.uid())
);

-- Claimants can withdraw/delete their own pending claim
CREATE POLICY "Claimants can delete pending claims"
ON public.claims FOR DELETE
TO authenticated
USING (
    auth.uid() = claimant_id AND status = 'pending'
);

-- ------------------------------------------------------------------------------
-- NOTIFICATIONS POLICIES
-- ------------------------------------------------------------------------------
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- SUPABASE STORAGE BUCKET CONFIGURATION & POLICIES
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files into item-images bucket
CREATE POLICY "Allow authenticated users to upload item images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'item-images');

-- Policy: Allow public read for item images
CREATE POLICY "Allow public read for item images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-images');

-- Policy: Allow users to delete their own images
CREATE POLICY "Allow owners to delete their images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable Realtime on tables for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.claims;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
