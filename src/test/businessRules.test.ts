import { describe, it, expect, beforeEach } from 'vitest';
import { claimsService } from '../services/claimsService';
import { itemsService } from '../services/itemsService';
import { storageService } from '../services/storageService';
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
      location: 'Cricket Ground',
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
      location: 'Main Building',
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
      location: 'Main Building',
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

  it('Blocks claims on lost item reports (claims are strictly for found items)', async () => {
    // 1. Create a "lost" item report by Rohit
    const lostItem = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'lost',
      item_name: 'Lost Wallet',
      category: 'Wallets, Purses & Cash',
      description: 'Lost my brown leather wallet near auditorium',
      location: 'Open Theatre',
      incident_date: '2026-10-26',
      image_path: null,
    });

    // 2. Priya attempts to claim Rohit's lost item report
    await expect(
      claimsService.createClaim(lostItem.id, 'user-priya-002', 'I want to claim this lost item')
    ).rejects.toThrow(/Ownership claims can only be submitted for found items/);
  });

  it('Prevents modifying claim status once finalized (approved or rejected)', async () => {
    const item = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'found',
      item_name: 'Earbuds Case',
      category: 'Electronics & Gadgets',
      description: 'Found white earbuds charging case in library',
      location: 'Central Library',
      incident_date: '2026-10-26',
      image_path: null,
    });

    const claim = await claimsService.createClaim(
      item.id,
      'user-priya-002',
      'The case has a small scratch next to the LED indicator'
    );

    // Approve the claim
    await claimsService.updateClaimStatus(claim.id, 'approved', 'user-rohit-001');

    // Attempt to re-modify or decline the finalized claim
    await expect(
      claimsService.updateClaimStatus(claim.id, 'rejected', 'user-rohit-001')
    ).rejects.toThrow(/Claim has already been resolved and cannot be modified/);
  });

  it('Does not leak claimant phone or email while claim is pending; reveals only upon approval', async () => {
    const item = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'found',
      item_name: 'College Diary',
      category: 'Books, Notes & Stationery',
      description: 'Found diary in reading room',
      location: 'Central Library',
      incident_date: '2026-10-26',
      image_path: null,
    });

    const claim = await claimsService.createClaim(
      item.id,
      'user-priya-002',
      'My name is embossed on the front cover in gold foil'
    );

    // Fetch claims while pending
    const pendingClaims = await claimsService.fetchClaimsByItem(item.id);
    const targetPendingClaim = pendingClaims.find((c) => c.id === claim.id);

    expect(targetPendingClaim).toBeDefined();
    expect(targetPendingClaim?.claimant?.full_name).toBeDefined();
    // Phone and email MUST NOT be exposed while pending
    expect(targetPendingClaim?.claimant?.phone).toBeUndefined();
    expect(targetPendingClaim?.claimant?.email).toBeUndefined();

    // Now approve the claim
    await claimsService.updateClaimStatus(claim.id, 'approved', 'user-rohit-001');

    // Fetch claims after approval
    const approvedClaims = await claimsService.fetchClaimsByItem(item.id);
    const targetApprovedClaim = approvedClaims.find((c) => c.id === claim.id);

    expect(targetApprovedClaim?.status).toBe('approved');
    // Contact information is now accessible for safe campus handover
    expect(targetApprovedClaim?.claimant?.phone).toBeDefined();
    expect(targetApprovedClaim?.claimant?.email).toBeDefined();
  });

  it('Prevents tampering with immutable item fields (id, owner_id, item_type) during update', async () => {
    const item = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'found',
      item_name: 'Gym Bag',
      category: 'Bags & Backpacks',
      description: 'Found black sports bag near gym',
      location: 'Cricket Ground',
      incident_date: '2026-10-26',
      image_path: null,
    });

    // Attempt to hijack item by modifying owner_id or item_type
    const maliciousPayload = {
      ...item,
      owner_id: 'attacker-id-666',
      item_type: 'lost' as const,
      description: 'Legitimate updated description for sports bag',
    };

    const updated = await itemsService.updateItem(item.id, maliciousPayload);

    // Verify description updated, but owner_id and item_type remained immutable
    expect(updated.description).toBe('Legitimate updated description for sports bag');
    expect(updated.owner_id).toBe('user-rohit-001');
    expect(updated.item_type).toBe('found');
  });

  it('Enforces strict image upload validation (file size and MIME types)', () => {
    // 1. Invalid file extension / MIME type
    const invalidFile = new File(['dummy content'], 'script.exe', { type: 'application/x-msdownload' });
    const invalidResult = storageService.validateImage(invalidFile);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toMatch(/Invalid file format/);

    // 2. File size exceeding 5MB
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'huge.png', { type: 'image/png' });
    const largeResult = storageService.validateImage(largeFile);
    expect(largeResult.valid).toBe(false);
    expect(largeResult.error).toMatch(/File size exceeds 5MB/);

    // 3. Valid file
    const validFile = new File(['valid png data'], 'photo.png', { type: 'image/png' });
    const validResult = storageService.validateImage(validFile);
    expect(validResult.valid).toBe(true);
  });
});
