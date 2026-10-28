import { describe, it, expect, beforeEach } from 'vitest';
import { claimsService } from '../services/claimsService';
import { itemsService } from '../services/itemsService';
import { mockStore } from '../lib/mockStore';

describe('Campus Lost & Found Business Rules & Security Safeguards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Strictly prevents self-claiming (user cannot claim an item they reported)', async () => {
    // 1. Create item reported by user-rohit-001
    const newItem = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'found',
      item_name: 'Fastrack Watch',
      category: 'Clothing & Accessories',
      description: 'Found black analog watch in sports ground',
      location: 'Sports Complex & Ground',
      incident_date: '2026-10-26',
      image_path: null,
    });

    // 2. Rohit attempts to claim his own reported item
    await expect(
      claimsService.createClaim(newItem.id, 'user-rohit-001', 'This watch belongs to me')
    ).rejects.toThrow(/You cannot claim an item that you reported/);
  });

  it('Prevents duplicate active claims by the same claimant on the same item', async () => {
    // 1. Create item reported by Rohit
    const newItem = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'found',
      item_name: 'Water Bottle',
      category: 'Bottles & Lunchboxes',
      description: 'Milton steel insulated bottle found in library',
      location: 'Central Library',
      incident_date: '2026-10-26',
      image_path: null,
    });

    // 2. Priya submits first claim
    const claim1 = await claimsService.createClaim(
      newItem.id,
      'user-priya-002',
      'It has a JSPM mechanical engineering sticker on the cap'
    );
    expect(claim1.status).toBe('pending');

    // 3. Priya attempts duplicate second claim
    await expect(
      claimsService.createClaim(
        newItem.id,
        'user-priya-002',
        'Attempting duplicate claim for the same bottle'
      )
    ).rejects.toThrow(/You already have an active claim submitted/);
  });

  it('Approving a claim automatically marks the item as returned and creates notifications', async () => {
    // 1. Create item reported by Rohit
    const item = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'found',
      item_name: 'Scientific Calculator',
      category: 'Electronics & Gadgets',
      description: 'Found fx-991EX calculator in CS lab',
      location: 'Computer Science Labs (CS-1/2/3)',
      incident_date: '2026-10-26',
      image_path: null,
    });

    // 2. Priya claims it
    const claim = await claimsService.createClaim(
      item.id,
      'user-priya-002',
      'My initials P.D. are written with white marker on back'
    );

    // Verify notification was created for owner
    const ownerNotifs = mockStore.getNotifications('user-rohit-001');
    expect(ownerNotifs.length).toBeGreaterThan(0);
    expect(ownerNotifs[0].title).toBe('New Claim Received');

    // 3. Rohit approves the claim
    const updatedClaim = await claimsService.updateClaimStatus(claim.id, 'approved', 'user-rohit-001');
    expect(updatedClaim.status).toBe('approved');

    // 4. Verify item is marked returned
    const updatedItem = await itemsService.fetchItemById(item.id);
    expect(updatedItem?.status).toBe('returned');

    // 5. Verify claimant received approval notification
    const claimantNotifs = mockStore.getNotifications('user-priya-002');
    expect(claimantNotifs.length).toBeGreaterThan(0);
    expect(claimantNotifs[0].title).toBe('Claim Approved!');
  });

  it('Blocks unauthorized users from approving claims', async () => {
    // Item owned by Rohit
    const item = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'found',
      item_name: 'Umbrella',
      category: 'Other Items',
      description: 'Blue umbrella found at gate',
      location: 'Bus Bay & Main Entrance Gate',
      incident_date: '2026-10-26',
      image_path: null,
    });

    const claim = await claimsService.createClaim(
      item.id,
      'user-priya-002',
      'It has a wooden curved handle and small rip on side'
    );

    // Impostor user tries to approve
    await expect(
      claimsService.updateClaimStatus(claim.id, 'approved', 'unauthorized-user-999')
    ).rejects.toThrow(/Only the listing finder can approve or reject claims/);
  });
});
