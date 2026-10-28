# JSPM Campus Lost & Found

> Dedicated, secure, and responsive campus lost-and-found web portal for **JSPM University Pune** students, faculty, and campus staff.

Developed with **React, Vite, TypeScript, Tailwind CSS, Lucide Icons, React Hook Form, Zod, and Supabase (Auth, PostgreSQL, Realtime, and Storage)**.

---

## 🏛️ Project Architecture & Highlights

- **University Theme & UI/UX**: Professional navy-blue (`#0e1e35`), crisp white, and subtle teal (`#0d9488`) palette. Fully responsive across desktop, tablet, and mobile with accessible forms, status badges, empty states, and modal dialogs.
- **Genuine Authentication**: Real Supabase Auth integration with 6-digit email OTP verification, cooldown timers, password recovery flow, and secure session persistence.
- **Privacy Shield & Handover Protection**: Student College PRN, phone numbers, and emails are never exposed on public listing cards. Contact coordinates are revealed only after a verified ownership claim is reviewed and approved by the listing owner.
- **PostgreSQL Database & Row Level Security (RLS)**: Enforces table policies on `profiles`, `items`, `claims`, and `notifications`, preventing unauthorized modifications or data leaks.
- **Automated Database Triggers**:
  - `on_auth_user_created`: Automatically creates student profiles from signup metadata.
  - `on_claim_insert`: Blocks self-claiming, generates notifications for the finder, and updates listing status.
  - `on_claim_status_update`: On approval, marks the item as returned, rejects competing claims, and notifies the claimant.
- **Private Image Storage**: Supabase Storage bucket `item-images` with JPG, PNG, and WebP format validation and 5MB file size limits.
- **Automated Quality Suite**: 33 automated Vitest unit and integration tests covering schemas, business invariants, claim workflows, and two-user access boundaries.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite 5, TypeScript |
| **Styling & Design System** | Tailwind CSS with custom navy & teal color palettes |
| **Icons & Typography** | Lucide React, Google Inter font |
| **Routing** | React Router v6 (Protected, Verified, and Public route guards) |
| **Forms & Validation** | React Hook Form, Zod runtime schema validation |
| **Backend Services** | Supabase Auth, PostgreSQL 15, Supabase Storage, Supabase Realtime |
| **Testing Suite** | Vitest 2.1, React Testing Library, JSDOM |

---

## 🚀 Windows Localhost Quickstart

### Prerequisites
- **Node.js**: v18.0.0 or later (v22 LTS recommended)
- **npm**: v9.0.0 or later

### Step 1: Install Dependencies
Open PowerShell or Command Prompt in the project folder and run:
```powershell
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Edit `.env` and provide your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Note: If you leave these placeholders as-is, the application automatically runs in local development mode with realistic preloaded JSPM student profiles, items, and verification workflows).*

### Step 3: Run the Development Server
```powershell
npm run dev
```
Open your browser and navigate to: `http://localhost:5173`

---

## 🗄️ Supabase Cloud Setup & Migration

### 1. Apply Database Schema & Policies
1. Go to the [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Navigate to **SQL Editor** in the left sidebar.
3. Open `supabase/migrations/20250101000000_initial_schema.sql` from this codebase.
4. Paste the entire SQL script into the SQL Editor and click **Run**.
5. This migration script creates:
   - `public.profiles` table with PRN uniqueness constraints.
   - `public.items` table with category, location, and status indexes.
   - `public.claims` table with duplicate claim blocking constraints.
   - `public.notifications` table for real-time user alerts.
   - Automatic triggers for timestamps, auth-profile sync, and claim events.
   - Explicit Row Level Security (RLS) policies on all tables.
   - Storage bucket `item-images` with authenticated upload and read policies.
   - Realtime publication on `items`, `claims`, and `notifications`.

### 2. Configure Supabase Authentication
1. Go to **Authentication** -> **Providers** -> **Email**.
2. Ensure **Enable Email provider** is turned **ON**.
3. Under **Confirm email**, turn **ON** email confirmation.
4. Go to **Authentication** -> **Email Templates**:
   - **Confirm signup**: Ensure the template includes the 6-digit token `{{ .Token }}` instead of only a link:
     ```html
     <h2>JSPM Campus Lost & Found Verification</h2>
     <p>Your 6-digit confirmation code is: <strong>{{ .Token }}</strong></p>
     <p>This code expires in 10 minutes.</p>
     ```
   - **Reset Password**: Ensure the template includes `{{ .Token }}`:
     ```html
     <h2>JSPM Campus Password Recovery</h2>
     <p>Your 6-digit recovery code is: <strong>{{ .Token }}</strong></p>
     ```

### 3. Verify Storage Bucket
1. In the Supabase Dashboard, go to **Storage** -> **Buckets**.
2. Verify that the bucket `item-images` exists and is marked as **Public** (applied automatically by the SQL migration).
3. If creating manually, set Bucket name: `item-images`, Public bucket: `ON`.

---

## 🧪 Testing & Verification

Run the automated test suite:
```powershell
# Run all Vitest unit and integration tests
npm run test

# Run TypeScript typecheck
npm run typecheck

# Run production build
npm run build
```

### Verified Test Journeys (All 33 Passing)
1. **Student Registration**: Validates Indian phone number format (`/^(?:\+91|0)?[6-9]\d{9}$/`), alphanumeric PRN format, password confirmation, and privacy agreement.
2. **Email OTP Verification**: Requires 6-digit OTP verification before unlocking protected dashboard access.
3. **Password Recovery**: Tests request flow, 6-digit recovery token verification, and password updates with resend cooldowns.
4. **Report Found Item**: Uploads item details with location and photo.
5. **Item Discovery & Filtering**: Real-time catalog search by title, category, and campus location.
6. **Submit Claim ("This is Mine")**: Tests ownership verification form with identifying details prompt.
7. **Self-Claim Prevention**: Blocks students from claiming items they reported.
8. **Duplicate Claim Prevention**: Prevents duplicate active claims by the same student on the same item.
9. **In-App Notifications**: Listing owner receives notifications when a claim is placed.
10. **Claim Approval & Rejection**: Finder reviews claim; approving marks item as `returned` and rejects competing claims.
11. **Access Boundaries & Privacy**: Unauthorized users are blocked from approving claims or modifying foreign listings.

---

## 👥 Multi-Account Test Credentials

When testing locally without live Supabase cloud setup, the app includes pre-authorized test accounts:

| User | Email | Password | Role / Items |
| :--- | :--- | :--- | :--- |
| **Rohit Sharma** | `rohit.sharma@jspm.edu.in` | `Password123!` | Finder of Boat Neckband & ID Card |
| **Priya Deshmukh** | `priya.deshmukh@jspm.edu.in` | `Password123!` | Claimant / Reporter of Calculator |
| **Demo OTP Code** | Any registered email | `123456` | Authorizes email verification instantly |

---

## 🔧 Troubleshooting Guide

### 1. "Invalid or expired OTP code"
- In Supabase Auth, verify that your email template contains `{{ .Token }}`.
- If using local development mode, use code `123456`.
- Check that the resend cooldown timer (45 seconds) has expired before requesting a new token.

### 2. "Database query error / Row Level Security policy violated"
- Ensure that the initial migration `supabase/migrations/20250101000000_initial_schema.sql` was executed in full in the Supabase SQL Editor.
- Verify that your user is signed in so that `auth.uid()` matches the required RLS policy.

### 3. "Image upload failed"
- Allowed formats: **JPG, JPEG, PNG, WebP**.
- Maximum file size: **5MB**.
- Ensure the `item-images` bucket exists in Supabase Storage with the policies configured in the SQL migration.

---

## 📄 License & Disclaimer
This portal is an independent student utility developed for the students and faculty of **JSPM University Pune**. PRN format validation enforces platform integrity but does not represent official university administrative enrollment verification.
