import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ItemStatus, ClaimStatus } from '../types/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}

export function getItemStatusBadge(status: ItemStatus): { label: string; bg: string; text: string; dot: string } {
  switch (status) {
    case 'open':
      return {
        label: 'Active Listing',
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
      };
    case 'claim_pending':
      return {
        label: 'Claim Review Pending',
        bg: 'bg-amber-50 border-amber-200 text-amber-800',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
      };
    case 'returned':
      return {
        label: 'Claim Approved & Returned',
        bg: 'bg-teal-50 border-teal-200 text-teal-800',
        text: 'text-teal-700',
        dot: 'bg-teal-500',
      };
    case 'closed':
      return {
        label: 'Closed',
        bg: 'bg-slate-100 border-slate-200 text-slate-700',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
      };
    default:
      return {
        label: status,
        bg: 'bg-slate-100 border-slate-200 text-slate-700',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
      };
  }
}

export function getClaimStatusBadge(status: ClaimStatus): { label: string; bg: string; text: string } {
  switch (status) {
    case 'pending':
      return {
        label: 'Under Verification',
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        text: 'text-amber-800',
      };
    case 'approved':
      return {
        label: 'Approved by Finder',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        text: 'text-emerald-800',
      };
    case 'rejected':
      return {
        label: 'Claim Declined',
        bg: 'bg-rose-100 text-rose-800 border-rose-200',
        text: 'text-rose-800',
      };
    default:
      return {
        label: status,
        bg: 'bg-slate-100 text-slate-800 border-slate-200',
        text: 'text-slate-800',
      };
  }
}

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return 'Hidden for privacy';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 2)}******${clean.slice(8)}`;
  }
  return `${clean.slice(0, 3)}****${clean.slice(-2)}`;
}

export function maskEmail(email?: string | null): string {
  if (!email) return 'Hidden for privacy';
  const parts = email.split('@');
  if (parts.length !== 2) return 'Hidden for privacy';
  const [user, domain] = parts;
  const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
  return `${maskedUser}@${domain}`;
}
