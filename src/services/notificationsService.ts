import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockStore } from '../lib/mockStore';
import { NotificationItem } from '../types/database';

export const notificationsService = {
  async fetchNotifications(userId: string): Promise<NotificationItem[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }
      return data as NotificationItem[];
    }

    return mockStore.getNotifications(userId);
  },

  async markAsRead(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
      return;
    }

    mockStore.markNotificationAsRead(id);
  },

  async markAllAsRead(userId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }
      return;
    }

    mockStore.markAllNotificationsAsRead(userId);
  },

  subscribeToNotifications(userId: string, callback: () => void): () => void {
    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel(`public:notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            callback();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    const handler = (event: any) => {
      if (!event.detail || event.detail.userId === userId) {
        callback();
      }
    };
    window.addEventListener('jspm_notifications_updated', handler);
    return () => window.removeEventListener('jspm_notifications_updated', handler);
  },
};
