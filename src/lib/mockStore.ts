import { Profile, Item, Claim, NotificationItem } from '../types/database';

const LOCAL_STORAGE_USERS = 'jspm_lost_found_users';
const LOCAL_STORAGE_SESSION = 'jspm_lost_found_session';
const LOCAL_STORAGE_ITEMS = 'jspm_lost_found_items';
const LOCAL_STORAGE_CLAIMS = 'jspm_lost_found_claims';
const LOCAL_STORAGE_NOTIFS = 'jspm_lost_found_notifications';
const LOCAL_STORAGE_OTPS = 'jspm_lost_found_otps';

export interface LocalUser {
  id: string;
  email: string;
  password: string;
  isVerified: boolean;
  profile: Profile;
}

// Initial seed data for demo / testing
const INITIAL_PROFILES: Profile[] = [
  {
    id: 'user-rohit-001',
    full_name: 'Rohit Sharma',
    email: 'rohit.sharma@jspm.edu.in',
    phone: '9876543210',
    prn: 'JSPM2023001',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'user-priya-002',
    full_name: 'Priya Deshmukh',
    email: 'priya.deshmukh@jspm.edu.in',
    phone: '9822334455',
    prn: 'JSPM2023045',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

const INITIAL_ITEMS: Item[] = [
  {
    id: 'item-found-01',
    owner_id: 'user-rohit-001',
    item_type: 'found',
    item_name: 'Boat Rockerz 255 Pro Wireless Neckband',
    category: 'Electronics & Gadgets',
    description: 'Found navy blue wireless neckband earphones on the 3rd row desk of Central Library silent study hall.',
    location: 'Central Library',
    incident_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    image_path: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'item-found-02',
    owner_id: 'user-rohit-001',
    item_type: 'found',
    item_name: 'JSPM Student ID Card & Bus Pass',
    category: 'ID Cards & Official Documents',
    description: 'Student ID card belonging to Mechanical Dept (TE) found on table near the foodcourt juice counter.',
    location: 'Foodcourt',
    incident_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    image_path: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'item-lost-03',
    owner_id: 'user-priya-002',
    item_type: 'lost',
    item_name: 'Casio fx-991EX Scientific Calculator',
    category: 'Electronics & Gadgets',
    description: 'Black scientific calculator with silver keypad border and "P.D." written on the back cover with white marker.',
    location: 'Main Building',
    incident_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    image_path: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'item-found-04',
    owner_id: 'user-priya-002',
    item_type: 'found',
    item_name: 'Set of 3 Keys with Batman Metal Keychain',
    category: 'Keys & Keychains',
    description: 'Two bike keys and one small locker key with a black metallic Batman logo keychain found on stairs.',
    location: 'Godawari Building',
    incident_date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    image_path: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

export const mockStore = {
  getUsers(): LocalUser[] {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS);
    if (!raw) {
      const initialUsers: LocalUser[] = [
        {
          id: 'user-rohit-001',
          email: 'rohit.sharma@jspm.edu.in',
          password: 'Password123!',
          isVerified: true,
          profile: INITIAL_PROFILES[0],
        },
        {
          id: 'user-priya-002',
          email: 'priya.deshmukh@jspm.edu.in',
          password: 'Password123!',
          isVerified: true,
          profile: INITIAL_PROFILES[1],
        },
      ];
      localStorage.setItem(LOCAL_STORAGE_USERS, JSON.stringify(initialUsers));
      return initialUsers;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveUsers(users: LocalUser[]): void {
    localStorage.setItem(LOCAL_STORAGE_USERS, JSON.stringify(users));
  },

  getCurrentSession(): { user: LocalUser } | null {
    const raw = localStorage.getItem(LOCAL_STORAGE_SESSION);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw);
      // Ensure user is fresh from users list
      const users = this.getUsers();
      const freshUser = users.find((u) => u.id === session.user?.id);
      return freshUser ? { user: freshUser } : null;
    } catch {
      return null;
    }
  },

  setCurrentSession(user: LocalUser | null): void {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_SESSION, JSON.stringify({ user }));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_SESSION);
    }
  },

  getItems(): Item[] {
    const raw = localStorage.getItem(LOCAL_STORAGE_ITEMS);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_ITEMS, JSON.stringify(INITIAL_ITEMS));
      return INITIAL_ITEMS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveItems(items: Item[]): void {
    localStorage.setItem(LOCAL_STORAGE_ITEMS, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('jspm_items_updated'));
  },

  getClaims(): Claim[] {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLAIMS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveClaims(claims: Claim[]): void {
    localStorage.setItem(LOCAL_STORAGE_CLAIMS, JSON.stringify(claims));
    window.dispatchEvent(new CustomEvent('jspm_claims_updated'));
  },

  getNotifications(userId: string): NotificationItem[] {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS);
    let all: NotificationItem[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }
    return all
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addNotification(notif: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>): NotificationItem {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS);
    let all: NotificationItem[] = raw ? JSON.parse(raw) : [];
    const newNotif: NotificationItem = {
      ...notif,
      id: 'notif-' + Math.random().toString(36).substring(2, 9),
      is_read: false,
      created_at: new Date().toISOString(),
    };
    all.unshift(newNotif);
    localStorage.setItem(LOCAL_STORAGE_NOTIFS, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('jspm_notifications_updated', { detail: { userId: notif.user_id } }));
    return newNotif;
  },

  markNotificationAsRead(id: string): void {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS);
    if (!raw) return;
    const all: NotificationItem[] = JSON.parse(raw);
    const updated = all.map((n) => (n.id === id ? { ...n, is_read: true } : n));
    localStorage.setItem(LOCAL_STORAGE_NOTIFS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('jspm_notifications_updated'));
  },

  markAllNotificationsAsRead(userId: string): void {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS);
    if (!raw) return;
    const all: NotificationItem[] = JSON.parse(raw);
    const updated = all.map((n) => (n.user_id === userId ? { ...n, is_read: true } : n));
    localStorage.setItem(LOCAL_STORAGE_NOTIFS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('jspm_notifications_updated'));
  },

  saveOtp(email: string, code: string, type: 'signup' | 'recovery'): void {
    const raw = localStorage.getItem(LOCAL_STORAGE_OTPS);
    const map = raw ? JSON.parse(raw) : {};
    map[email.toLowerCase()] = {
      code,
      type,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    localStorage.setItem(LOCAL_STORAGE_OTPS, JSON.stringify(map));
  },

  verifyOtp(email: string, code: string, type: 'signup' | 'recovery'): boolean {
    const raw = localStorage.getItem(LOCAL_STORAGE_OTPS);
    if (!raw) return code === '123456'; // Allow default fallback code for testing
    const map = raw ? JSON.parse(raw) : {};
    const record = map[email.toLowerCase()];
    if (!record) return code === '123456';
    if (record.type === type && record.code === code && record.expiresAt > Date.now()) {
      delete map[email.toLowerCase()];
      localStorage.setItem(LOCAL_STORAGE_OTPS, JSON.stringify(map));
      return true;
    }
    return code === '123456';
  },

  getProfile(userId: string): Profile | null {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    return user ? user.profile : null;
  },
};
