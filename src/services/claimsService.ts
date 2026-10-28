import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockStore } from '../lib/mockStore';
import { Claim, ClaimStatus } from '../types/database';

export const claimsService = {
  async createClaim(itemId: string, claimantId: string, claimMessage: string): Promise<Claim> {
    if (isSupabaseConfigured()) {
      // 1. Check if claimant is the owner and item is open
      const { data: itemData, error: itemErr } = await supabase
        .from('items')
        .select('owner_id, status, item_name, item_type')
        .eq('id', itemId)
        .single();

      if (itemErr || !itemData) throw new Error('Listing could not be found.');
      if (itemData.owner_id === claimantId) {
        throw new Error('You cannot claim an item that you reported.');
      }
      if (itemData.item_type !== 'found') {
        throw new Error('Ownership claims can only be submitted for found items.');
      }
      if (itemData.status === 'returned' || itemData.status === 'closed') {
        throw new Error('This item is no longer open for claims.');
      }

      // 2. Check for active duplicate claim
      const { data: existingClaims } = await supabase
        .from('claims')
        .select('id, status')
        .eq('item_id', itemId)
        .eq('claimant_id', claimantId)
        .in('status', ['pending', 'approved']);

      if (existingClaims && existingClaims.length > 0) {
        throw new Error('You already have an active claim submitted for this item.');
      }

      // 3. Insert claim
      const { data: newClaim, error: insertError } = await supabase
        .from('claims')
        .insert({
          item_id: itemId,
          claimant_id: claimantId,
          claim_message: claimMessage,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting claim:', insertError);
        throw insertError;
      }

      return newClaim as Claim;
    }

    // Local / Mock store execution
    const items = mockStore.getItems();
    const item = items.find((i) => i.id === itemId);
    if (!item) throw new Error('Listing could not be found.');
    if (item.owner_id === claimantId) {
      throw new Error('You cannot claim an item that you reported.');
    }
    if (item.item_type !== 'found') {
      throw new Error('Ownership claims can only be submitted for found items.');
    }
    if (item.status === 'returned' || item.status === 'closed') {
      throw new Error('This item is no longer open for claims.');
    }

    const claims = mockStore.getClaims();
    const duplicate = claims.find(
      (c) => c.item_id === itemId && c.claimant_id === claimantId && (c.status === 'pending' || c.status === 'approved')
    );
    if (duplicate) {
      throw new Error('You already have an active claim submitted for this item.');
    }

    const claimantProfile = mockStore.getProfile(claimantId);
    const newClaim: Claim = {
      id: 'claim-' + Math.random().toString(36).substring(2, 9),
      item_id: itemId,
      claimant_id: claimantId,
      claimant_name: claimantProfile?.full_name || 'Student Claimant',
      claim_message: claimMessage,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    claims.unshift(newClaim);
    mockStore.saveClaims(claims);

    // Update item status to claim_pending if currently open
    if (item.status === 'open') {
      item.status = 'claim_pending';
      item.updated_at = new Date().toISOString();
      mockStore.saveItems(items);
    }

    // Trigger notification to listing owner
    mockStore.addNotification({
      user_id: item.owner_id,
      title: 'New Claim Received',
      message: `A student submitted a verification claim for your found item: "${item.item_name}". Review their description.`,
      related_item_id: item.id,
      related_claim_id: newClaim.id,
    });

    return newClaim;
  },

  async fetchClaimsByItem(itemId: string): Promise<Claim[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          claimant:profiles(id, full_name, email, phone)
        `)
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching claims for item:', error);
        throw error;
      }
      return data as Claim[];
    }

    const claims = mockStore.getClaims().filter((c) => c.item_id === itemId);
    const profiles = mockStore.getUsers().map((u) => u.profile);

    return claims
      .map((c) => {
        const prof = profiles.find((p) => p.id === c.claimant_id);
        const claimantName = c.claimant_name || prof?.full_name || 'Student Claimant';
        return {
          ...c,
          claimant_name: claimantName,
          claimant: prof
            ? {
                id: prof.id,
                full_name: prof.full_name,
                // Handover privacy: phone & email only revealed if claim is approved
                ...(c.status === 'approved' ? { email: prof.email, phone: prof.phone } : {}),
              }
            : { full_name: claimantName },
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async fetchUserClaims(userId: string): Promise<Claim[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          item:items(*)
        `)
        .eq('claimant_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user claims:', error);
        throw error;
      }
      return data as Claim[];
    }

    const claims = mockStore.getClaims().filter((c) => c.claimant_id === userId);
    const items = mockStore.getItems();

    return claims
      .map((c) => ({
        ...c,
        item: items.find((i) => i.id === c.item_id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async updateClaimStatus(claimId: string, status: ClaimStatus, currentUserId: string): Promise<Claim> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('claims')
        .update({ status })
        .eq('id', claimId)
        .select()
        .single();

      if (error) {
        console.error('Error updating claim status:', error);
        throw error;
      }
      return data as Claim;
    }

    const claims = mockStore.getClaims();
    const claimIndex = claims.findIndex((c) => c.id === claimId);
    if (claimIndex === -1) throw new Error('Claim not found.');

    const claim = claims[claimIndex];
    const items = mockStore.getItems();
    const item = items.find((i) => i.id === claim.item_id);
    if (!item) throw new Error('Associated item not found.');

    // Only owner of the item can approve or reject
    if (item.owner_id !== currentUserId) {
      throw new Error('Only the listing finder can approve or reject claims.');
    }

    // Invariant: Once resolved, claim status cannot be altered
    if (claim.status !== 'pending') {
      throw new Error('Claim has already been resolved and cannot be modified.');
    }

    if (status !== 'approved' && status !== 'rejected') {
      throw new Error('Invalid claim status transition.');
    }

    claim.status = status;
    claim.updated_at = new Date().toISOString();
    claims[claimIndex] = claim;

    if (status === 'approved') {
      item.status = 'returned';
      item.updated_at = new Date().toISOString();

      // Reject all other pending claims on this item
      claims.forEach((c) => {
        if (c.item_id === item.id && c.id !== claim.id && c.status === 'pending') {
          c.status = 'rejected';
          c.updated_at = new Date().toISOString();
        }
      });

      // Notify claimant of approval
      mockStore.addNotification({
        user_id: claim.claimant_id,
        title: 'Claim Approved!',
        message: `Your claim for "${item.item_name}" has been approved by the finder. You can now coordinate handover.`,
        related_item_id: item.id,
        related_claim_id: claim.id,
      });
    } else if (status === 'rejected') {
      // Notify claimant of rejection
      mockStore.addNotification({
        user_id: claim.claimant_id,
        title: 'Claim Declined',
        message: `Your claim for "${item.item_name}" was reviewed and declined by the finder.`,
        related_item_id: item.id,
        related_claim_id: claim.id,
      });

      // If no other pending claims, set item back to open
      const hasOtherPending = claims.some((c) => c.item_id === item.id && c.id !== claim.id && c.status === 'pending');
      if (!hasOtherPending && item.status === 'claim_pending') {
        item.status = 'open';
        item.updated_at = new Date().toISOString();
      }
    }

    mockStore.saveClaims(claims);
    mockStore.saveItems(items);
    return claim;
  },

  subscribeToClaims(callback: () => void): () => void {
    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel('public:claims')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => {
          callback();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    const handler = () => callback();
    window.addEventListener('jspm_claims_updated', handler);
    return () => window.removeEventListener('jspm_claims_updated', handler);
  },
};
