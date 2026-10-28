import { describe, it, expect } from 'vitest';
import {
  signUpSchema,
  signInSchema,
  otpSchema,
  itemSchema,
  claimSchema,
  indianPhoneRegex,
  prnRegex,
} from '../lib/validators';
import { CAMPUS_LOCATIONS } from '../constants/campusLocations';

describe('Validators & Input Constraints', () => {
  describe('Indian Phone Regex', () => {
    it('accepts valid 10-digit Indian numbers starting with 6, 7, 8, or 9', () => {
      expect(indianPhoneRegex.test('9876543210')).toBe(true);
      expect(indianPhoneRegex.test('8123456789')).toBe(true);
      expect(indianPhoneRegex.test('7001234567')).toBe(true);
      expect(indianPhoneRegex.test('6998877665')).toBe(true);
      expect(indianPhoneRegex.test('+919876543210')).toBe(true);
      expect(indianPhoneRegex.test('09876543210')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(indianPhoneRegex.test('1234567890')).toBe(false); // starts with 1
      expect(indianPhoneRegex.test('98765')).toBe(false); // too short
      expect(indianPhoneRegex.test('9876543210123')).toBe(false); // too long
      expect(indianPhoneRegex.test('abcdefghij')).toBe(false); // non-numeric
    });
  });

  describe('College PRN Regex', () => {
    it('accepts valid alphanumeric PRNs of length 5-20', () => {
      expect(prnRegex.test('JSPM2023001')).toBe(true);
      expect(prnRegex.test('21010045')).toBe(true);
      expect(prnRegex.test('PRN-12345')).toBe(true);
    });

    it('rejects invalid PRNs', () => {
      expect(prnRegex.test('123')).toBe(false); // too short (< 5)
      expect(prnRegex.test('JSPM@2023!#')).toBe(false); // invalid special characters
    });
  });

  describe('Sign-Up Form Schema', () => {
    const validData = {
      fullName: 'Aarav Patel',
      phone: '9876543210',
      email: 'aarav.patel@jspm.edu.in',
      prn: 'JSPM2023042',
      password: 'StrongPassword1',
      confirmPassword: 'StrongPassword1',
      agreeTerms: true,
    };

    it('passes for valid sign-up data', () => {
      const result = signUpSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects mismatched passwords', () => {
      const result = signUpSchema.safeParse({
        ...validData,
        confirmPassword: 'DifferentPassword2',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match');
      }
    });

    it('rejects password without numbers', () => {
      const result = signUpSchema.safeParse({
        ...validData,
        password: 'PasswordOnly',
        confirmPassword: 'PasswordOnly',
      });
      expect(result.success).toBe(false);
    });

    it('rejects if terms are not agreed', () => {
      const result = signUpSchema.safeParse({
        ...validData,
        agreeTerms: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('OTP Schema', () => {
    it('accepts exactly 6 digits', () => {
      expect(otpSchema.safeParse({ otp: '123456' }).success).toBe(true);
    });

    it('rejects alphanumeric or wrong length codes', () => {
      expect(otpSchema.safeParse({ otp: '12345' }).success).toBe(false);
      expect(otpSchema.safeParse({ otp: '1234567' }).success).toBe(false);
      expect(otpSchema.safeParse({ otp: '12345a' }).success).toBe(false);
    });
  });

  describe('Item Reporting Schema', () => {
    const validItem = {
      itemName: 'Dell Wireless Mouse',
      category: 'Electronics & Gadgets',
      description: 'Black optical mouse found near terminal 4 in computer lab',
      location: 'Main Building',
      incidentDate: '2026-10-25',
    };

    it('accepts valid item data', () => {
      expect(itemSchema.safeParse(validItem).success).toBe(true);
    });

    it('accepts each of the 15 official project campus locations', () => {
      expect(CAMPUS_LOCATIONS.length).toBe(15);
      CAMPUS_LOCATIONS.forEach((loc) => {
        const res = itemSchema.safeParse({ ...validItem, location: loc });
        expect(res.success).toBe(true);
      });
    });

    it('rejects invalid, empty, or legacy unapproved campus locations', () => {
      const invalidLocations = [
        'Unknown Building',
        'Off-Campus Point',
        'Computer Science Labs (CS-1/2/3)', // Old removed option
        'Sports Complex & Ground',          // Old removed option
        'Central Auditorium',               // Old removed option
        '',
      ];
      invalidLocations.forEach((badLoc) => {
        const res = itemSchema.safeParse({ ...validItem, location: badLoc });
        expect(res.success).toBe(false);
      });
    });

    it('rejects future incident dates', () => {
      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
      const result = itemSchema.safeParse({
        ...validItem,
        incidentDate: futureDate,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Date cannot be in the future');
      }
    });

    it('rejects overly short descriptions (< 10 chars)', () => {
      const result = itemSchema.safeParse({
        ...validItem,
        description: 'Lost it',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Claim Form Schema', () => {
    it('accepts detailed identifying message (>= 10 chars)', () => {
      const result = claimSchema.safeParse({
        claimMessage: 'This is my calculator, it has my initials PD engraved on back cover',
      });
      expect(result.success).toBe(true);
    });

    it('rejects insufficient claim descriptions', () => {
      const result = claimSchema.safeParse({
        claimMessage: 'Mine',
      });
      expect(result.success).toBe(false);
    });
  });
});
