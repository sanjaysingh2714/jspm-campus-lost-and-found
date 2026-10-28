import { describe, it, expect } from 'vitest';
import {
  maskPhoneNumber,
  maskEmail,
  formatDate,
  formatRelativeTime,
  getItemStatusBadge,
  getClaimStatusBadge,
} from '../lib/utils';

describe('Utility & Privacy Helpers', () => {
  describe('Privacy Masking', () => {
    it('masks Indian 10-digit phone number correctly', () => {
      const masked = maskPhoneNumber('9876543210');
      expect(masked).toBe('98******10');
      expect(masked).not.toContain('765432');
    });

    it('masks email address correctly', () => {
      const masked = maskEmail('rohit.sharma@jspm.edu.in');
      expect(masked).toBe('r***a@jspm.edu.in');
      expect(masked).not.toContain('rohit.sharma');
    });

    it('handles null/empty phone and email gracefully', () => {
      expect(maskPhoneNumber(null)).toBe('Hidden for privacy');
      expect(maskEmail('')).toBe('Hidden for privacy');
    });
  });

  describe('Date & Time Formatting', () => {
    it('formats incident date to Indian locale format', () => {
      const formatted = formatDate('2026-10-25');
      expect(formatted).toMatch(/25.*Oct.*2026/);
    });

    it('formats relative times correctly', () => {
      const nowIso = new Date().toISOString();
      expect(formatRelativeTime(nowIso)).toBe('Just now');

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(formatRelativeTime(tenMinutesAgo)).toBe('10m ago');

      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
    });
  });

  describe('Status Badges Resolver', () => {
    it('resolves correct badge for item statuses', () => {
      expect(getItemStatusBadge('open').label).toBe('Active Listing');
      expect(getItemStatusBadge('claim_pending').label).toBe('Claim Review Pending');
      expect(getItemStatusBadge('returned').label).toBe('Claim Approved & Returned');
      expect(getItemStatusBadge('closed').label).toBe('Closed');
    });

    it('resolves correct badge for claim statuses', () => {
      expect(getClaimStatusBadge('pending').label).toBe('Under Verification');
      expect(getClaimStatusBadge('approved').label).toBe('Approved by Finder');
      expect(getClaimStatusBadge('rejected').label).toBe('Claim Declined');
    });
  });
});
