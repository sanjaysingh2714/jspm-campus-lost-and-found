export type ItemType = 'lost' | 'found';
export type ItemStatus = 'open' | 'claim_pending' | 'returned' | 'closed';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  prn: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  owner_id: string;
  item_type: ItemType;
  item_name: string;
  category: string;
  description: string;
  location: string;
  incident_date: string;
  image_path: string | null;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  // Joined fields
  owner?: Partial<Profile>;
}

export interface Claim {
  id: string;
  item_id: string;
  claimant_id: string;
  claimant_name?: string;
  claim_message: string;
  status: ClaimStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  item?: Item;
  claimant?: Partial<Profile>;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  related_item_id: string | null;
  related_claim_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const ITEM_CATEGORIES = [
  'Electronics & Gadgets',
  'ID Cards & Official Documents',
  'Keys & Keychains',
  'Wallets, Purses & Cash',
  'Bags & Backpacks',
  'Books, Notes & Stationery',
  'Clothing & Apparel',
  'Eyewear & Accessories',
  'Bottles & Lunchboxes',
  'Sports & Fitness Gear',
  'Other Items',
] as const;

export {
  CAMPUS_LOCATIONS,
  type CampusLocation,
  CAMPUS_LOCATION_PLACEHOLDER,
  isValidCampusLocation,
} from '../constants/campusLocations';
