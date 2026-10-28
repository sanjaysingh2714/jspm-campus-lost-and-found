import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockStore } from '../lib/mockStore';
import { Item, ItemType, ItemStatus } from '../types/database';

export interface ItemFilters {
  type?: ItemType;
  category?: string;
  location?: string;
  search?: string;
  status?: ItemStatus;
  sort?: 'newest' | 'oldest';
}

export const itemsService = {
  async fetchItems(filters: ItemFilters = {}): Promise<Item[]> {
    if (isSupabaseConfigured()) {
      let query = supabase
        .from('items')
        .select(`
          *,
          owner:profiles(id, full_name)
        `);

      if (filters.type) {
        query = query.eq('item_type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters.location && filters.location !== 'all') {
        query = query.eq('location', filters.location);
      }
      if (filters.search && filters.search.trim() !== '') {
        query = query.or(`item_name.ilike.%${filters.search.trim()}%,description.ilike.%${filters.search.trim()}%`);
      }

      if (filters.sort === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching items from Supabase:', error);
        throw error;
      }
      return data as Item[];
    }

    // Local / Mock store query
    let items = mockStore.getItems();
    const profiles = mockStore.getUsers().map((u) => u.profile);

    // Attach sanitized owner info (no phone or email leakage)
    items = items.map((item) => {
      const p = profiles.find((prof) => prof.id === item.owner_id);
      return {
        ...item,
        owner: {
          id: p?.id || item.owner_id,
          full_name: p?.full_name || 'Campus Student',
        },
      };
    });

    if (filters.type) {
      items = items.filter((item) => item.item_type === filters.type);
    }
    if (filters.status) {
      items = items.filter((item) => item.status === filters.status);
    }
    if (filters.category && filters.category !== 'all') {
      items = items.filter((item) => item.category === filters.category);
    }
    if (filters.location && filters.location !== 'all') {
      items = items.filter((item) => item.location === filters.location);
    }
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (item) => item.item_name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      );
    }

    if (filters.sort === 'oldest') {
      items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return items;
  },

  async fetchItemById(id: string): Promise<Item | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          owner:profiles(id, full_name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching item by id:', error);
        return null;
      }
      return data as Item;
    }

    const items = mockStore.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return null;

    const profile = mockStore.getProfile(item.owner_id);
    return {
      ...item,
      owner: {
        id: profile?.id || item.owner_id,
        full_name: profile?.full_name || 'Campus Student',
      },
    };
  },

  async createItem(
    itemData: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'owner' | 'status'> & { status?: ItemStatus }
  ): Promise<Item> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('items')
        .insert({
          ...itemData,
          status: itemData.status || 'open',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating item:', error);
        throw error;
      }
      return data as Item;
    }

    const items = mockStore.getItems();
    const newItem: Item = {
      ...itemData,
      id: 'item-' + Math.random().toString(36).substring(2, 9),
      status: itemData.status || 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    items.unshift(newItem);
    mockStore.saveItems(items);
    return newItem;
  },

  async updateItem(id: string, updates: Partial<Item>): Promise<Item> {
    // Strip immutable fields
    const { id: _id, owner_id: _owner, item_type: _type, created_at: _cat, ...safeUpdates } = updates;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('items')
        .update(safeUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating item:', error);
        throw error;
      }
      return data as Item;
    }

    const items = mockStore.getItems();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Item not found');

    const updated = {
      ...items[index],
      ...safeUpdates,
      updated_at: new Date().toISOString(),
    };
    items[index] = updated;
    mockStore.saveItems(items);
    return updated;
  },

  async deleteItem(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) {
        console.error('Error deleting item:', error);
        throw error;
      }
      return;
    }

    const items = mockStore.getItems();
    const filtered = items.filter((i) => i.id !== id);
    mockStore.saveItems(filtered);
  },

  async fetchUserListings(userId: string): Promise<Item[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user listings:', error);
        throw error;
      }
      return data as Item[];
    }

    return mockStore
      .getItems()
      .filter((i) => i.owner_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  subscribeToItems(callback: () => void): () => void {
    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel('public:items')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
          callback();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    const handler = () => callback();
    window.addEventListener('jspm_items_updated', handler);
    return () => window.removeEventListener('jspm_items_updated', handler);
  },
};
