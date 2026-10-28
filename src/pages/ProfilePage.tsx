import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  FileText,
  Calendar,
  Lock,
  Edit2,
  Check,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { profileUpdateSchema, ProfileUpdateFormData } from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import { itemsService } from '../services/itemsService';
import { claimsService } from '../services/claimsService';
import { formatDate } from '../lib/utils';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/EmptyState';

export const ProfilePage: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [listingsCount, setListingsCount] = useState(0);
  const [claimsCount, setClaimsCount] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      fullName: profile?.full_name || '',
      phone: profile?.phone || '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.full_name,
        phone: profile.phone,
      });
    }

    // Load stats
    if (user?.id) {
      itemsService.fetchUserListings(user.id).then((l) => setListingsCount(l.length));
      claimsService.fetchUserClaims(user.id).then((c) => setClaimsCount(c.length));
    }
  }, [profile, user?.id, reset]);

  const onSubmit = async (data: ProfileUpdateFormData) => {
    setServerError(null);
    setServerSuccess(null);
    setIsSaving(true);

    try {
      const res = await updateProfile(data.fullName, data.phone);
      if (!res.success) {
        setServerError(res.error || 'Failed to update profile.');
      } else {
        setServerSuccess('Profile information updated successfully.');
        setIsEditing(false);
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Profile</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your verified campus account details and privacy settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-navy-900 to-navy-700 text-white flex items-center justify-center font-bold text-2xl shadow-sm mb-4">
            {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
          </div>

          <h2 className="text-lg font-bold text-slate-900">{profile?.full_name || 'Student'}</h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 mt-1">
            PRN: {profile?.prn || 'N/A'}
          </span>

          <div className="mt-6 w-full pt-6 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="font-extrabold text-lg text-slate-900">{listingsCount}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">My Listings</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="font-extrabold text-lg text-slate-900">{claimsCount}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Claims Placed</p>
            </div>
          </div>

          <div className="mt-6 w-full p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-left text-xs text-teal-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Email Verified</span>
            </div>
            <p className="text-[11px] text-teal-800 leading-relaxed">
              Your account was verified via 6-digit email OTP.
            </p>
          </div>
        </div>

        {/* Details & Edit Form Card */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900">Student Details</h3>
              <p className="text-xs text-slate-500">Contact and registration credentials</p>
            </div>

            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  reset();
                }}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            )}
          </div>

          {serverSuccess && (
            <Alert variant="success" className="mb-4">
              {serverSuccess}
            </Alert>
          )}

          {serverError && (
            <Alert variant="error" className="mb-4">
              {serverError}
            </Alert>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                required
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <Input
                label="Indian Mobile Number"
                required
                error={errors.phone?.message}
                helperText="Must be a valid 10-digit number (e.g. 9876543210)"
                {...register('phone')}
              />

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSaving}
                  className="gap-1 font-bold"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[11px] text-slate-500 block font-medium">Full Name</span>
                    <strong className="text-slate-900">{profile?.full_name}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[11px] text-slate-500 block font-medium">College Email</span>
                    <strong className="text-slate-900">{profile?.email}</strong>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Verified
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[11px] text-slate-500 block font-medium">Contact Number</span>
                    <strong className="text-slate-900">+91 {profile?.phone}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[11px] text-slate-500 block font-medium">Permanent Registration Number (PRN)</span>
                    <strong className="text-slate-900">{profile?.prn}</strong>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Fixed ID</span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[11px] text-slate-500 block font-medium">Member Since</span>
                    <strong className="text-slate-900">{formatDate(profile?.created_at || '')}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
            <Lock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Your PRN, phone number, and email address are never displayed publicly on item cards.
              Contact details are only shared securely with the other student when an ownership claim
              is approved by the finder.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
