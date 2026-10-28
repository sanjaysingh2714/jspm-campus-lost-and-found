import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Filter,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  X,
  Send,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { itemsService, ItemFilters } from '../services/itemsService';
import { claimsService } from '../services/claimsService';
import { Item, ItemType, ItemStatus, ITEM_CATEGORIES, CAMPUS_LOCATIONS } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { ItemCard } from '../components/ui/ItemCard';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Modal, LoadingSpinner } from '../components/ui/Modal';
import { EmptyState, Alert } from '../components/ui/EmptyState';

const ITEMS_PER_PAGE = 8;

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [activeTab, setActiveTab] = useState<ItemType>(
    (searchParams.get('tab') as ItemType) || 'found'
  );
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'all');
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Claim Modal State
  const [claimingItem, setClaimingItem] = useState<Item | null>(null);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Load items
  const loadItems = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      try {
        const filters: ItemFilters = {
          type: activeTab,
          search: searchQuery,
          category: selectedCategory,
          location: selectedLocation,
          status: selectedStatus === 'all' ? undefined : selectedStatus,
          sort: sortBy,
        };
        const data = await itemsService.fetchItems(filters);
        setItems(data);
      } catch (err) {
        console.error('Failed to load items:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, searchQuery, selectedCategory, selectedLocation, selectedStatus, sortBy]
  );

  useEffect(() => {
    loadItems();

    // Subscribe to realtime updates
    const unsubscribe = itemsService.subscribeToItems(() => {
      loadItems();
    });

    return () => unsubscribe();
  }, [loadItems]);

  // Handle Tab Switch
  const handleTabChange = (type: ItemType) => {
    setActiveTab(type);
    setVisibleCount(ITEMS_PER_PAGE);
    setSearchParams({ tab: type });
  };

  // Reset Filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedLocation('all');
    setSelectedStatus('all');
    setSortBy('newest');
    setVisibleCount(ITEMS_PER_PAGE);
  };

  // Submit Claim
  const handleOpenClaim = (item: Item) => {
    if (user?.id === item.owner_id) {
      alert('You cannot claim an item that you reported.');
      return;
    }
    setClaimingItem(item);
    setClaimMessage('');
    setClaimError(null);
    setClaimSuccess(null);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingItem || !user) return;

    if (claimMessage.trim().length < 10) {
      setClaimError('Please provide at least 10 characters describing identifying details.');
      return;
    }

    setClaimError(null);
    setIsSubmittingClaim(true);

    try {
      await claimsService.createClaim(claimingItem.id, user.id, claimMessage.trim());
      setClaimSuccess('Claim submitted successfully! The finder has been notified.');
      setTimeout(() => {
        setClaimingItem(null);
        setClaimSuccess(null);
        loadItems();
      }, 1800);
    } catch (err: any) {
      setClaimError(err.message || 'Failed to submit claim.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const paginatedItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Campus Lost &amp; Found Portal
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              JSPM Pune
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">{profile?.full_name || 'Student'}</strong> (PRN: {profile?.prn || 'N/A'})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/report-lost">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Search className="w-4 h-4 text-amber-600" />
              <span>Report Lost</span>
            </Button>
          </Link>
          <Link to="/report-found">
            <Button variant="accent" size="sm" className="gap-1.5 font-bold">
              <PlusCircle className="w-4 h-4" />
              <span>Report Found Item</span>
            </Button>
          </Link>
          <button
            onClick={() => loadItems(true)}
            className="p-2 text-slate-500 hover:text-navy-900 rounded-lg hover:bg-slate-100 transition"
            title="Refresh Listings"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs: Found vs Lost Items */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => handleTabChange('found')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'found'
              ? 'border-teal-600 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Found Items Catalog</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
            {activeTab === 'found' ? items.length : 'Live'}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('lost')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'lost'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-amber-600" />
          <span>Reported Lost Belongings</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {activeTab === 'lost' ? items.length : 'Live'}
          </span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, brand, or details..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-100 focus:border-navy-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-navy-100 focus:border-navy-600"
            >
              <option value="all">All Categories</option>
              {ITEM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-navy-100 focus:border-navy-600"
            >
              <option value="all">All Campus Locations</option>
              {CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-navy-100 focus:border-navy-600"
            >
              <option value="newest">Sort: Most Recent</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>
        </div>

        {/* Status Filter Chips & Clear */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            {(['all', 'open', 'claim_pending', 'returned'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  selectedStatus === st
                    ? 'bg-navy-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all'
                  ? 'All Statuses'
                  : st === 'open'
                  ? 'Active / Open'
                  : st === 'claim_pending'
                  ? 'Claim Pending'
                  : 'Returned'}
              </button>
            ))}
          </div>

          {(searchQuery || selectedCategory !== 'all' || selectedLocation !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={resetFilters}
              className="text-navy-700 hover:text-navy-900 font-semibold inline-flex items-center gap-1 text-[11px]"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Listings */}
      {loading ? (
        <LoadingSpinner text="Retrieving campus listings..." />
      ) : paginatedItems.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'found'
              ? 'No found items match your criteria'
              : 'No lost items reported matching criteria'
          }
          description="Try broadening your category or location filters, or check back later as campus listings update regularly."
          actionLabel="Reset Search Filters"
          onAction={resetFilters}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isOwner={user?.id === item.owner_id}
                onClaimClick={handleOpenClaim}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-10 text-center">
              <Button
                variant="outline"
                size="md"
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
              >
                Load More Items ({items.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}

      {/* Claim Modal Dialog */}
      <Modal
        isOpen={Boolean(claimingItem)}
        onClose={() => setClaimingItem(null)}
        title="Submit Ownership Claim"
        description="Verify your identity and provide distinguishing information about this item"
      >
        {claimingItem && (
          <div>
            <div className="p-3 bg-slate-50 rounded-xl mb-4 border border-slate-200 flex items-center gap-3">
              {claimingItem.image_path ? (
                <img
                  src={claimingItem.image_path}
                  alt={claimingItem.item_name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                  ITEM
                </div>
              )}
              <div className="overflow-hidden">
                <p className="font-bold text-xs text-slate-900 truncate">{claimingItem.item_name}</p>
                <p className="text-[11px] text-slate-500">
                  Found at: <span className="font-medium text-slate-700">{claimingItem.location}</span>
                </p>
              </div>
            </div>

            {claimSuccess && (
              <Alert variant="success" className="mb-4">
                {claimSuccess}
              </Alert>
            )}

            {claimError && (
              <Alert variant="error" className="mb-4">
                {claimError}
              </Alert>
            )}

            <form onSubmit={handleSubmitClaim} className="space-y-4">
              <Textarea
                label="Identifying Details & Proof of Ownership"
                placeholder="Describe specific features (e.g., sticker colors, scratches, inner tags, passcode hints, lock screen photo, serial numbers, brand model) that only the genuine owner would know."
                rows={4}
                required
                value={claimMessage}
                onChange={(e) => setClaimMessage(e.target.value)}
                helperText="Minimum 10 characters required. The finder will review this proof before approving."
              />

              <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-200 text-xs text-teal-900 space-y-1">
                <p className="font-semibold">Handover Safety Guarantee:</p>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  Your contact details will only be disclosed once the finder verifies and approves
                  your claim. Handover can be facilitated at any department security desk.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setClaimingItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  isLoading={isSubmittingClaim}
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  <span>Submit Claim</span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};
