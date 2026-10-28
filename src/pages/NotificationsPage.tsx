import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { formatDateTime, formatRelativeTime } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/Modal';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Campus Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="text-xs font-bold bg-navy-100 text-navy-800 px-2.5 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time alerts for claims on your found items, status updates, and campus reports
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead()}
            className="gap-1.5 text-xs font-semibold"
          >
            <CheckCheck className="w-4 h-4 text-teal-600" />
            <span>Mark All as Read</span>
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications right now"
          description="When someone claims an item you found, or updates your claim status, you'll receive updates here in real time."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {notifications.map((notif) => {
            const isApproved = notif.title.toLowerCase().includes('approved');
            const isRejected = notif.title.toLowerCase().includes('declined') || notif.title.toLowerCase().includes('rejected');
            const isNewClaim = notif.title.toLowerCase().includes('claim received');

            return (
              <div
                key={notif.id}
                className={`p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  !notif.is_read ? 'bg-navy-50/40' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                      isApproved
                        ? 'bg-emerald-100 text-emerald-700'
                        : isRejected
                        ? 'bg-rose-100 text-rose-700'
                        : isNewClaim
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-teal-100 text-teal-700'
                    }`}
                  >
                    {isApproved ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isRejected ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{notif.title}</h3>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-navy-600" title="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                      {notif.message}
                    </p>
                    <span className="text-[11px] text-slate-400 block pt-0.5">
                      {formatDateTime(notif.created_at)} ({formatRelativeTime(notif.created_at)})
                    </span>
                  </div>
                </div>

                {/* Notification Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {notif.related_item_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        markAsRead(notif.id);
                        navigate(`/items/${notif.related_item_id}`);
                      }}
                      className="gap-1 text-xs"
                    >
                      <span>View Item</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}

                  {!notif.is_read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="text-xs font-semibold text-slate-500 hover:text-navy-900 px-2 py-1 transition"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
