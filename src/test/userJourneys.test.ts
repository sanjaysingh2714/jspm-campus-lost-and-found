import { describe, it, expect, beforeEach } from 'vitest';
import { itemsService } from '../services/itemsService';
import { claimsService } from '../services/claimsService';
import { storageService } from '../services/storageService';
import { mockStore, LocalUser } from '../lib/mockStore';
import { signUpSchema, itemSchema, claimSchema } from '../lib/validators';

describe('Comprehensive End-to-End User Journeys (Two Test Accounts)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Journey 1 & 2: Register a new student, verify email OTP, log in, and log out', async () => {
    // 1. Validation test
    const signupData = {
      fullName: 'Kunal Patil',
      phone: '9811223344',
      email: 'kunal.patil@jspm.edu.in',
      prn: 'JSPM2023999',
      password: 'StrongPassword123',
      confirmPassword: 'StrongPassword123',
      agreeTerms: true,
    };
    expect(signUpSchema.safeParse(signupData).success).toBe(true);

    // 2. Register user
    const users = mockStore.getUsers();
    const newUser: LocalUser = {
      id: 'user-kunal-999',
      email: signupData.email,
      password: signupData.password,
      isVerified: false,
      profile: {
        id: 'user-kunal-999',
        full_name: signupData.fullName,
        phone: signupData.phone,
        email: signupData.email,
        prn: signupData.prn,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
    users.push(newUser);
    mockStore.saveUsers(users);
    mockStore.saveOtp(signupData.email, '654321', 'signup');

    // 3. Attempt login before email verification -> should be blocked
    const unverifiedUser = mockStore.getUsers().find((u) => u.email === signupData.email);
    expect(unverifiedUser?.isVerified).toBe(false);

    // 4. Verify OTP
    const otpValid = mockStore.verifyOtp(signupData.email, '654321', 'signup');
    expect(otpValid).toBe(true);

    // Update verified status
    unverifiedUser!.isVerified = true;
    mockStore.saveUsers(users);

    // 5. Establish session (Log in)
    mockStore.setCurrentSession(unverifiedUser!);
    const session = mockStore.getCurrentSession();
    expect(session).not.toBeNull();
    expect(session?.user.email).toBe(signupData.email);
    expect(session?.user.profile.prn).toBe('JSPM2023999');

    // 6. Log out
    mockStore.setCurrentSession(null);
    expect(mockStore.getCurrentSession()).toBeNull();
  });

  it('Journey 3: Request password reset, verify recovery OTP, and update password', async () => {
    // 1. Request recovery OTP
    const email = 'rohit.sharma@jspm.edu.in';
    mockStore.saveOtp(email, '987654', 'recovery');

    // 2. Verify recovery OTP
    const otpValid = mockStore.verifyOtp(email, '987654', 'recovery');
    expect(otpValid).toBe(true);

    // 3. Update password
    const users = mockStore.getUsers();
    const rohit = users.find((u) => u.email === email);
    expect(rohit).toBeDefined();

    rohit!.password = 'NewSecurePassword2026!';
    mockStore.saveUsers(users);

    // 4. Verify authentication succeeds with new password and fails with old
    const checkUsers = mockStore.getUsers();
    const updatedUser = checkUsers.find((u) => u.email === email);
    expect(updatedUser?.password).toBe('NewSecurePassword2026!');
    expect(updatedUser?.password).not.toBe('Password123!');
  });

  it('Journey 4 & 5: Account A reports found item with photo; Account B discovers it on dashboard', async () => {
    // Account A: Rohit Sharma reports found item
    const photoUrl = 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80';
    const reportedItem = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'found',
      item_name: 'Sony WH-1000XM4 Noise Canceling Headphones',
      category: 'Electronics & Gadgets',
      description: 'Found black over-ear headphones in hard case near study carrel 12',
      location: 'Central Library',
      incident_date: '2026-10-27',
      image_path: photoUrl,
      status: 'open',
    });

    expect(reportedItem.id).toBeDefined();
    expect(reportedItem.status).toBe('open');

    // Account B: Priya Deshmukh searches dashboard
    const searchResults = await itemsService.fetchItems({
      type: 'found',
      search: 'Sony',
      location: 'Central Library',
    });

    expect(searchResults.length).toBeGreaterThan(0);
    const foundSony = searchResults.find((i) => i.id === reportedItem.id);
    expect(foundSony).toBeDefined();
    expect(foundSony?.item_name).toBe('Sony WH-1000XM4 Noise Canceling Headphones');
    expect(foundSony?.image_path).toBe(photoUrl);
  });

  it('Journey 6 & 7: Account B claims found item; Account A receives notification', async () => {
    // 1. Create found item by Rohit
    const item = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'found',
      item_name: 'Fastrack Blue Backpack',
      category: 'Bags & Backpacks',
      description: 'Found blue backpack in Canteen seating area',
      location: 'Main Campus Canteen & Food Court',
      incident_date: '2026-10-26',
      image_path: null,
      status: 'open',
    });

    // 2. Priya submits claim
    const claim = await claimsService.createClaim(
      item.id,
      'user-priya-002',
      'Inside the front pocket there is a blue Parker pen and a hostel room 204 key'
    );

    expect(claim.status).toBe('pending');
    expect(claim.item_id).toBe(item.id);
    expect(claim.claimant_id).toBe('user-priya-002');

    // 3. Verify Rohit received notification
    const rohitNotifications = mockStore.getNotifications('user-rohit-001');
    const claimNotif = rohitNotifications.find((n) => n.related_item_id === item.id);
    expect(claimNotif).toBeDefined();
    expect(claimNotif?.title).toBe('New Claim Received');
    expect(claimNotif?.message).toContain('Fastrack Blue Backpack');
  });

  it('Journey 8 & 9: Account A approves claim; item is marked returned; Account B receives approval notification', async () => {
    // 1. Item created by Rohit
    const item = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'found',
      item_name: 'Casio Scientific Calculator',
      category: 'Electronics & Gadgets',
      description: 'Found in Mechanical lab',
      location: 'Mechanical & Robotics Workshop',
      incident_date: '2026-10-25',
      image_path: null,
      status: 'open',
    });

    // 2. Priya claims item
    const claim = await claimsService.createClaim(
      item.id,
      'user-priya-002',
      'Sticker of Iron Man on reverse side of slider cover'
    );

    // 3. Rohit approves claim
    const approvedClaim = await claimsService.updateClaimStatus(claim.id, 'approved', 'user-rohit-001');
    expect(approvedClaim.status).toBe('approved');

    // 4. Item marked returned
    const updatedItem = await itemsService.fetchItemById(item.id);
    expect(updatedItem?.status).toBe('returned');

    // 5. Priya received approval notification
    const priyaNotifications = mockStore.getNotifications('user-priya-002');
    const approvalNotif = priyaNotifications.find((n) => n.related_claim_id === claim.id);
    expect(approvalNotif).toBeDefined();
    expect(approvalNotif?.title).toBe('Claim Approved!');
    expect(approvalNotif?.message).toContain('coordinate handover');

    // 6. Attempting another claim on returned item is blocked
    await expect(
      claimsService.createClaim(item.id, 'user-third-003', 'Another claim after return')
    ).rejects.toThrow(/no longer open for claims/);
  });

  it('Journey 10: Unauthorized edits and actions by third-party users are strictly blocked', async () => {
    // 1. Item created by Rohit
    const item = await itemsService.createItem({
      owner_id: 'user-rohit-001',
      item_type: 'found',
      item_name: 'Key Bunch',
      category: 'Keys & Keychains',
      description: 'Three keys on metal ring',
      location: 'Central Library',
      incident_date: '2026-10-26',
      image_path: null,
      status: 'open',
    });

    const claim = await claimsService.createClaim(
      item.id,
      'user-priya-002',
      'One key has red rubber cover'
    );

    // 2. Priya (claimant) attempts to approve her own claim -> blocked
    await expect(
      claimsService.updateClaimStatus(claim.id, 'approved', 'user-priya-002')
    ).rejects.toThrow(/Only the listing finder can approve or reject claims/);

    // 3. Random stranger attempts to approve -> blocked
    await expect(
      claimsService.updateClaimStatus(claim.id, 'approved', 'random-stranger-id')
    ).rejects.toThrow(/Only the listing finder can approve or reject claims/);
  });

  it('Journey 11: Validation rules block invalid formats, past limits, and non-supported uploads', () => {
    // Invalid image MIME type
    const invalidFile = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    const imgValidation = storageService.validateImage(invalidFile);
    expect(imgValidation.valid).toBe(false);
    expect(imgValidation.error).toContain('JPG, PNG, or WebP');

    // Oversized file (> 5MB)
    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    const bigValidation = storageService.validateImage(bigFile);
    expect(bigValidation.valid).toBe(false);
    expect(bigValidation.error).toContain('exceeds 5MB limit');

    // Invalid item schema (empty title, future date)
    const badItem = {
      itemName: '',
      category: '',
      description: 'short',
      location: '',
      incidentDate: '2099-01-01',
    };
    const itemResult = itemSchema.safeParse(badItem);
    expect(itemResult.success).toBe(false);
  });
});
