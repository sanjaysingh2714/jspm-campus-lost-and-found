import { z } from 'zod';

// Indian Mobile Number regex: allows optional +91 or 0 prefix followed by 10 digits starting with 6, 7, 8, or 9
export const indianPhoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;

// PRN regex: alphanumeric with optional hyphens, 5-20 characters
export const prnRegex = /^[A-Za-z0-9-]{5,20}$/;

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(80, 'Full name cannot exceed 80 characters'),
    phone: z
      .string()
      .trim()
      .regex(indianPhoneRegex, 'Please enter a valid 10-digit Indian phone number (e.g. 9876543210)'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    prn: z
      .string()
      .trim()
      .toUpperCase()
      .regex(prnRegex, 'PRN must be 5-20 alphanumeric characters (e.g. 2101001, JSPM12345)'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the privacy notice & campus conduct guidelines',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignInFormData = z.infer<typeof signInSchema>;

export const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
});

export type OtpFormData = z.infer<typeof otpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter your registered email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    otp: z
      .string()
      .trim()
      .length(6, 'Verification code must be exactly 6 digits')
      .regex(/^\d{6}$/, 'Code must contain only digits'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const itemSchema = z.object({
  itemName: z
    .string()
    .trim()
    .min(3, 'Item title must be at least 3 characters')
    .max(100, 'Item title cannot exceed 100 characters'),
  category: z.string().min(1, 'Please select a category'),
  description: z
    .string()
    .trim()
    .min(10, 'Please provide more details (at least 10 characters) to help identify the item')
    .max(1000, 'Description cannot exceed 1000 characters'),
  location: z.string().min(1, 'Please specify the campus location'),
  incidentDate: z
    .string()
    .min(1, 'Please select the date')
    .refine((dateStr) => {
      const selected = new Date(dateStr);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return selected <= today;
    }, 'Date cannot be in the future'),
});

export type ItemFormData = z.infer<typeof itemSchema>;

export const claimSchema = z.object({
  claimMessage: z
    .string()
    .trim()
    .min(10, 'Please provide detailed identifying features (e.g. serial number, scratch marks, contents, lock screen description) to prove ownership')
    .max(800, 'Message cannot exceed 800 characters'),
});

export type ClaimFormData = z.infer<typeof claimSchema>;

export const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(80, 'Full name cannot exceed 80 characters'),
  phone: z
    .string()
    .trim()
    .regex(indianPhoneRegex, 'Please enter a valid 10-digit Indian phone number'),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
