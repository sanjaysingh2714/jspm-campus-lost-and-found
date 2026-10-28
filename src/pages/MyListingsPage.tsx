import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, PlusCircle, Search, Trash2, ArrowRight, Clock, MapPin, Eye } from 'lucide-react';
import { itemsService } from '../services/itemsService';
import { claimsService } from '../services/claimsService';
import { Item, ItemStatus } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { ItemStatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/Modal';

export const MyListingsPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');

  const loadListings = async () => {
    if (!user) return;
    try {
      const data = await itemsService.fetchUserListings(user.id);
      setItems(data);
    } catch (err) {
      console.error('Failed to load listings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
    const unsub = itemsService.subscribeToItems(() => loadListings());
    return () => unsub();
  }, [user?.id]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await itemsService.deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete listing.');
    }
  };

  const handleClose = async (id: string) => {
    try {
      await itemsService.updateItem(id, { status: 'closed' });
      await loadListings();
    } catch (err: any) {
      alert(err.message || 'Failed to close listing.');
    }
  };

  const filteredItems = items.filter((i) =>
    statusFilter === 'all' ? true : i.status === statusFilter
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Campus Listings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your reported lost belongings and found item listings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/report-lost">
            <Button variant="outline" size="sm">
              Report Lost
            </Button>
          </Link>
          <Link to="/report-found">
            <Button variant="accent" size="sm" className="font-bold">
              Report Found
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 text-xs">
        {(['all', 'open', 'claim_pending', 'returned', 'closed'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
              statusFilter === st
                ? 'bg-navy-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st === 'all'
              ? `All Listings (${items.length})`
              : st === 'open'
              ? 'Active / Open'
              : st === 'claim_pending'
              ? 'Claim Pending'
              : st === 'returned'
              ? 'Returned'
              : 'Closed'}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Fetching your listings..." />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No listings found"
          description={
            statusFilter === 'all'
              ? "You haven't reported any lost or found items on campus yet."
              : `No listings with status "${statusFilter}".`
          }
          actionLabel="Report a Found Item"
          onAction={() => (window.location.href = '/report-found')}
        />
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isFound = item.item_type === 'found';
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    {item.image_path ? (
                      <img
                        src={item.image_path}
                        alt={item.item_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-bold">
                        NO PIC
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isFound
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isFound ? 'Found' : 'Lost'}
                      </span>
                      <ItemStatusBadge status={item.status} />
                      <span className="text-xs text-slate-400 font-normal">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base">{item.item_name}</h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.location}</span>
                      </span>
                      <span>&bull;</span>
                      <span>{item.category}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end shrink-0">
                  <Link to={`/items/${item.id}`}>
                    <Button variant="outline" size="sm" className="gap-1 text-xs">
                      <Eye className="w-3.5 h-3.5" />
                      <span>View &amp; Manage</span>
                    </Button>
                  </Link>

                  {item.status !== 'closed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClose(item.id)}
                      className="text-xs text-slate-600 hover:text-slate-900"
                    >
                      Close
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs p-2"
                    title="Delete listing"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
