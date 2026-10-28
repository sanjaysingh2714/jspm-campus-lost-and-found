import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  CAMPUS_LOCATIONS,
  CAMPUS_LOCATION_PLACEHOLDER,
  isValidCampusLocation,
} from '../constants/campusLocations';
import { itemSchema } from '../lib/validators';
import { itemsService } from '../services/itemsService';
import { claimsService } from '../services/claimsService';
import { AuthProvider } from '../context/AuthContext';
import { ReportLostPage } from '../pages/ReportLostPage';
import { ReportFoundPage } from '../pages/ReportFoundPage';
import { DashboardPage } from '../pages/DashboardPage';

describe('Official Campus Locations Suite (15 Approved Locations)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const EXPECTED_OFFICIAL_LOCATIONS = [
    'Main Building',
    'Central Library',
    'Godawari Building',
    'Kaveri Building',
    'Ganga Building',
    'Narmada Building',
    'BSP Block-A',
    'BSP Block-B',
    'Foodcourt',
    'Cafeteria',
    'Open Theatre',
    'Boys Parking',
    'Girls Parking',
    'Cricket Ground',
    'Workshop',
  ] as const;

  const LEGACY_REMOVED_LOCATIONS = [
    'Main Academic Block - Floor 1',
    'Main Academic Block - Floor 2',
    'Main Academic Block - Floor 3',
    'Computer Science Labs (CS-1/2/3)',
    'Mechanical & Robotics Workshop',
    'Electronics & IoT Lab',
    'Main Campus Canteen & Food Court',
    'Boys Hostel Block A & B',
    'Girls Hostel Block C & D',
    'Sports Complex & Ground',
    'Central Auditorium',
    'Student Parking Area',
    'Administrative & Admissions Office',
    'Bus Bay & Main Entrance Gate',
    'Other / Off-Campus Point',
  ];

  it('contains exactly the 15 official project campus locations with correct casing and spelling', () => {
    expect(CAMPUS_LOCATIONS.length).toBe(15);
    expect([...CAMPUS_LOCATIONS]).toEqual([...EXPECTED_OFFICIAL_LOCATIONS]);
  });

  it('contains no duplicate options', () => {
    const unique = new Set(CAMPUS_LOCATIONS);
    expect(unique.size).toBe(15);
  });

  it('strictly excludes all obsolete/legacy campus location options', () => {
    LEGACY_REMOVED_LOCATIONS.forEach((oldLoc) => {
      expect(CAMPUS_LOCATIONS).not.toContain(oldLoc);
      expect(isValidCampusLocation(oldLoc)).toBe(false);
    });
  });

  it('defines the standard user placeholder text', () => {
    expect(CAMPUS_LOCATION_PLACEHOLDER).toBe('Select campus location');
  });

  it('validates every official location through isValidCampusLocation utility', () => {
    EXPECTED_OFFICIAL_LOCATIONS.forEach((loc) => {
      expect(isValidCampusLocation(loc)).toBe(true);
    });
    expect(isValidCampusLocation('')).toBe(false);
    expect(isValidCampusLocation(null)).toBe(false);
    expect(isValidCampusLocation(undefined)).toBe(false);
    expect(isValidCampusLocation('Random Building')).toBe(false);
  });

  describe('Form Validation Integration (itemSchema)', () => {
    const basePayload = {
      itemName: 'Dell XPS Laptop Charger',
      category: 'Electronics & Gadgets',
      description: 'Found black 65W Type-C adapter with coiled cable',
      incidentDate: '2026-10-27',
    };

    it('accepts form submissions for all 15 official locations', () => {
      EXPECTED_OFFICIAL_LOCATIONS.forEach((loc) => {
        const result = itemSchema.safeParse({ ...basePayload, location: loc });
        expect(result.success).toBe(true);
      });
    });

    it('rejects empty or unselected location', () => {
      const result = itemSchema.safeParse({ ...basePayload, location: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/Please select a campus location/);
      }
    });

    it('rejects legacy and arbitrary unapproved location strings', () => {
      LEGACY_REMOVED_LOCATIONS.forEach((legacyLoc) => {
        const result = itemSchema.safeParse({ ...basePayload, location: legacyLoc });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toMatch(/valid campus location from the official list/);
        }
      });
    });
  });

  describe('Catalog & Dashboard Location Filtering', () => {
    it('creates listings with official locations and filters them accurately', async () => {
      // Create 3 items at different official locations
      const item1 = await itemsService.createItem({
        owner_id: 'user-rohit-001',
        item_type: 'found',
        item_name: 'Drawing Sheet Cylinder',
        category: 'Books, Notes & Stationery',
        description: 'Black plastic drafting tube with shoulder strap found in workshop',
        location: 'Workshop',
        incident_date: '2026-10-27',
        image_path: null,
      });

      const item2 = await itemsService.createItem({
        owner_id: 'user-rohit-001',
        item_type: 'found',
        item_name: 'Leather Keychain',
        category: 'Keys & Keychains',
        description: 'Brown leather keychain found near cafeteria counter',
        location: 'Cafeteria',
        incident_date: '2026-10-27',
        image_path: null,
      });

      const item3 = await itemsService.createItem({
        owner_id: 'user-priya-002',
        item_type: 'lost',
        item_name: 'Engineering Graphics Drafter',
        category: 'Other Items',
        description: 'Mini drafter in green canvas bag lost in Ganga building',
        location: 'Ganga Building',
        incident_date: '2026-10-27',
        image_path: null,
      });

      // Query specifically by Workshop
      const workshopResults = await itemsService.fetchItems({ location: 'Workshop' });
      expect(workshopResults.some((i) => i.id === item1.id)).toBe(true);
      expect(workshopResults.some((i) => i.id === item2.id)).toBe(false);
      expect(workshopResults.some((i) => i.id === item3.id)).toBe(false);

      // Query specifically by Cafeteria
      const cafeteriaResults = await itemsService.fetchItems({ location: 'Cafeteria' });
      expect(cafeteriaResults.some((i) => i.id === item2.id)).toBe(true);
      expect(cafeteriaResults.some((i) => i.id === item1.id)).toBe(false);

      // Query specifically by Ganga Building
      const gangaResults = await itemsService.fetchItems({ location: 'Ganga Building' });
      expect(gangaResults.some((i) => i.id === item3.id)).toBe(true);
      expect(gangaResults.some((i) => i.id === item1.id)).toBe(false);

      // Query with location: 'all' returns all items
      const allResults = await itemsService.fetchItems({ location: 'all' });
      expect(allResults.some((i) => i.id === item1.id)).toBe(true);
      expect(allResults.some((i) => i.id === item2.id)).toBe(true);
      expect(allResults.some((i) => i.id === item3.id)).toBe(true);
    });

    it('handles legacy records with older location strings gracefully without crashing or mutating', async () => {
      // Simulate an existing record that was created prior to the update
      const legacyItem = await itemsService.createItem({
        owner_id: 'user-rohit-001',
        item_type: 'found',
        item_name: 'Legacy Scientific Calculator',
        category: 'Electronics & Gadgets',
        description: 'Item stored previously with legacy location',
        location: 'Computer Science Labs (CS-1/2/3)',
        incident_date: '2026-10-20',
        image_path: null,
      });

      // Direct ID fetch returns the exact saved location faithfully
      const retrieved = await itemsService.fetchItemById(legacyItem.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.location).toBe('Computer Science Labs (CS-1/2/3)');

      // The record is included in global catalog fetch
      const catalog = await itemsService.fetchItems({ type: 'found' });
      expect(catalog.some((i) => i.id === legacyItem.id)).toBe(true);
    });
  });

  describe('UI Component Dropdown Integrity', () => {
    it('renders all 15 options plus placeholder in Report Lost form', () => {
      const { container } = render(
        <MemoryRouter>
          <AuthProvider>
            <ReportLostPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const locationSelect = container.querySelector('select[name="location"]') as HTMLSelectElement;
      expect(locationSelect).not.toBeNull();

      const options = Array.from(locationSelect.options);
      expect(options.length).toBe(16); // 1 placeholder + 15 locations
      expect(options[0].value).toBe('');
      expect(options[0].textContent).toBe('Select campus location');

      const renderedLocationValues = options.slice(1).map((opt) => opt.value);
      expect(renderedLocationValues).toEqual([...EXPECTED_OFFICIAL_LOCATIONS]);

      LEGACY_REMOVED_LOCATIONS.forEach((oldLoc) => {
        expect(renderedLocationValues).not.toContain(oldLoc);
      });
    });

    it('renders all 15 options plus placeholder in Report Found form', () => {
      const { container } = render(
        <MemoryRouter>
          <AuthProvider>
            <ReportFoundPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const locationSelect = container.querySelector('select[name="location"]') as HTMLSelectElement;
      expect(locationSelect).not.toBeNull();

      const options = Array.from(locationSelect.options);
      expect(options.length).toBe(16); // 1 placeholder + 15 locations
      expect(options[0].value).toBe('');
      expect(options[0].textContent).toBe('Select campus location');

      const renderedLocationValues = options.slice(1).map((opt) => opt.value);
      expect(renderedLocationValues).toEqual([...EXPECTED_OFFICIAL_LOCATIONS]);

      LEGACY_REMOVED_LOCATIONS.forEach((oldLoc) => {
        expect(renderedLocationValues).not.toContain(oldLoc);
      });
    });

    it('renders "📍 All Campus Locations" plus all 15 options in Dashboard filter', async () => {
      const { container } = render(
        <MemoryRouter>
          <AuthProvider>
            <DashboardPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        const selects = container.querySelectorAll('select');
        expect(selects.length).toBeGreaterThan(0);
      });

      // Find the location filter select (contains "All Campus Locations")
      const selects = Array.from(container.querySelectorAll('select'));
      const locationFilterSelect = selects.find((s) =>
        s.textContent?.includes('All Campus Locations')
      ) as HTMLSelectElement;

      expect(locationFilterSelect).toBeDefined();
      const options = Array.from(locationFilterSelect.options);
      expect(options.length).toBe(16); // 1 'all' option + 15 locations
      expect(options[0].value).toBe('all');

      const filterValues = options.slice(1).map((opt) => opt.value);
      expect(filterValues).toEqual([...EXPECTED_OFFICIAL_LOCATIONS]);
    });
  });

  describe('Security & Authorization Boundary Regression Verification', () => {
    it('preserves immutable item fields protection when updating', async () => {
      const item = await itemsService.createItem({
        owner_id: 'user-rohit-001',
        item_type: 'found',
        item_name: 'Water Flask',
        category: 'Bottles & Lunchboxes',
        description: 'Stainless steel flask found in library',
        location: 'Central Library',
        incident_date: '2026-10-27',
        image_path: null,
      });

      // Attempt to modify immutable owner_id, id, and item_type
      const updated = await itemsService.updateItem(item.id, {
        ...item,
        owner_id: 'malicious-attacker-id',
        item_type: 'lost',
        location: 'Main Building',
      });

      expect(updated.location).toBe('Main Building');
      expect(updated.owner_id).toBe('user-rohit-001'); // Untouched
      expect(updated.item_type).toBe('found');          // Untouched
    });

    it('preserves self-claim prevention and found-only requirement', async () => {
      const foundItem = await itemsService.createItem({
        owner_id: 'user-rohit-001',
        item_type: 'found',
        item_name: 'Drawing Folder',
        category: 'Books, Notes & Stationery',
        description: 'Large black folio found in workshop',
        location: 'Workshop',
        incident_date: '2026-10-27',
        image_path: null,
      });

      // Self-claim must be rejected
      await expect(
        claimsService.createClaim(foundItem.id, 'user-rohit-001', 'Trying to claim my own reported item')
      ).rejects.toThrow(/You cannot claim an item that you reported/);

      const lostItem = await itemsService.createItem({
        owner_id: 'user-rohit-001',
        item_type: 'lost',
        item_name: 'Lost Ring',
        category: 'Eyewear & Accessories',
        description: 'Lost silver ring near sports ground',
        location: 'Cricket Ground',
        incident_date: '2026-10-27',
        image_path: null,
      });

      // Claiming a lost report must be rejected
      await expect(
        claimsService.createClaim(lostItem.id, 'user-priya-002', 'Trying to claim a lost item report')
      ).rejects.toThrow(/Ownership claims can only be submitted for found items/);
    });

    it('preserves privacy of claimant contact details until approval', async () => {
      const item = await itemsService.createItem({
        owner_id: 'user-rohit-001',
        item_type: 'found',
        item_name: 'Reading Glasses',
        category: 'Eyewear & Accessories',
        description: 'Rimless spectacles in black case found in library',
        location: 'Central Library',
        incident_date: '2026-10-27',
        image_path: null,
      });

      const claim = await claimsService.createClaim(
        item.id,
        'user-priya-002',
        'Lenses are -1.5 with anti-glare blue coating'
      );

      const pendingClaims = await claimsService.fetchClaimsByItem(item.id);
      const target = pendingClaims.find((c) => c.id === claim.id);

      expect(target).toBeDefined();
      expect(target?.claimant?.full_name).toBeDefined();
      // Phone and email must remain protected and hidden
      expect(target?.claimant?.phone).toBeUndefined();
      expect(target?.claimant?.email).toBeUndefined();
    });
  });
});
