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
  LayoutGrid,
  List,
  Sparkles,
  TrendingUp,
  MapPin,
  Clock,
  Laptop,
  CreditCard,
  Key,
  Wallet,
  Briefcase,
  BookOpen,
  Shirt,
  Glasses,
  Coffee,
  Dumbbell,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
  PhoneCall,
  Flame,
} from 'lucide-react';
import { itemsService, ItemFilters } from '../services/itemsService';
import { claimsService } from '../services/claimsService';
import { Item, ItemType, ItemStatus, ITEM_CATEGORIES } from '../types/database';
import { CAMPUS_LOCATIONS } from '../constants/campusLocations';
import { useAuth } from '../context/AuthContext';
import { ItemCard } from '../components/ui/ItemCard';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Modal, LoadingSpinner } from '../components/ui/Modal';
import { EmptyState, Alert } from '../components/ui/EmptyState';

const ITEMS_PER_PAGE = 8;

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'Electronics & Gadgets': Laptop,
  'ID Cards & Official Documents': CreditCard,
  'Keys & Keychains': Key,
  'Wallets, Purses & Cash': Wallet,
  'Bags & Backpacks': Briefcase,
  'Books, Notes & Stationery': BookOpen,
  'Clothing & Apparel': Shirt,
  'Eyewear & Accessories': Glasses,
  'Bottles & Lunchboxes': Coffee,
  'Sports & Fitness Gear': Dumbbell,
  'Other Items': Package,
};

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [activeTab, setActiveTab] = useState<ItemType>(
    (searchParams.get('tab') as ItemType) || 'found'
  );
  const [items, setItems] = useState<Item[]>([]);
  const [allItemsForStats, setAllItemsForStats] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  // Greeting based on current time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

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
        const [filteredData, allData] = await Promise.all([
          itemsService.fetchItems(filters),
          itemsService.fetchItems(), // unfiltered for category counts & stats
        ]);
        setItems(filteredData);
        setAllItemsForStats(allData);
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

  // Statistics Computations
  const stats = useMemo(() => {
    const totalFound = allItemsForStats.filter((i) => i.item_type === 'found').length;
    const totalLost = allItemsForStats.filter((i) => i.item_type === 'lost').length;
    const totalReturned = allItemsForStats.filter((i) => i.status === 'returned').length;
    const pendingClaims = allItemsForStats.filter((i) => i.status === 'claim_pending').length;
    return {
      totalFound,
      totalLost,
      totalItems: allItemsForStats.length,
      totalReturned,
      pendingClaims,
    };
  }, [allItemsForStats]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allItemsForStats
      .filter((i) => i.item_type === activeTab)
      .forEach((item) => {
        counts[item.category] = (counts[item.category] || 0) + 1;
      });
    return counts;
  }, [allItemsForStats, activeTab]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Hero Campus Command Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-navy-800">
        {/* Subtle decorative glowing mesh */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-60 h-60 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>JSPM Pune Campus Hub • Academic Year 2026-27</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {greeting},{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-200">
                {profile?.full_name?.split(' ')[0] || 'Student'}
              </span>{' '}
              👋
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Explore belongings found on campus or report misplaced possessions. All records are
              monitored across JSPM laboratories, libraries, and canteens.
            </p>

            <div className="pt-1 flex items-center gap-3 text-xs text-slate-400">
              <span>Verified PRN: <strong className="text-slate-200 font-mono">{profile?.prn || 'Verified'}</strong></span>
              <span>&bull;</span>
              <span>Account: <strong className="text-slate-200">{profile?.email}</strong></span>
            </div>
          </div>

          {/* Quick Action Pill Hub */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <Link to="/report-lost" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="md"
                className="w-full bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 font-bold gap-2"
              >
                <Search className="w-4 h-4 text-amber-400" />
                <span>Report Lost Item</span>
              </Button>
            </Link>

            <Link to="/report-found" className="w-full sm:w-auto">
              <Button
                variant="accent"
                size="md"
                className="w-full font-bold gap-2 shadow-lg shadow-teal-900/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit Found Item</span>
              </Button>
            </Link>

            <button
              onClick={() => loadItems(true)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition backdrop-blur-xs"
              title="Refresh Listings"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Campus Announcement Ticker */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-3 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-bold text-[10px] tracking-wide uppercase shrink-0">
            <Flame className="w-3 h-3 text-teal-400 animate-pulse" />
            Live Notice
          </span>
          <p className="truncate text-slate-300">
            Found items in <strong>Central Library</strong>, <strong>Main Building</strong>, and the <strong>Foodcourt</strong> are awaiting owner claims. Please submit identifying details to verify.
          </p>
        </div>
      </div>

      {/* 2. Interactive Campus Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Found Items */}
        <div
          onClick={() => handleTabChange('found')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            activeTab === 'found'
              ? 'bg-gradient-to-br from-teal-50 to-white border-teal-300 shadow-sm ring-1 ring-teal-200'
              : 'bg-white border-slate-200/80 hover:border-teal-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Found Catalog
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {stats.totalFound}
            </span>
            <span className="text-xs font-semibold text-teal-700">Awaiting Claims</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Available for student verification</p>
        </div>

        {/* Card 2: Lost Items */}
        <div
          onClick={() => handleTabChange('lost')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
            activeTab === 'lost'
              ? 'bg-gradient-to-br from-amber-50 to-white border-amber-300 shadow-sm ring-1 ring-amber-200'
              : 'bg-white border-slate-200/80 hover:border-amber-200 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lost Reports
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {stats.totalLost}
            </span>
            <span className="text-xs font-semibold text-amber-700">Reported</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Currently being searched by campus</p>
        </div>

        {/* Card 3: Claims Pending */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Reviews
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {stats.pendingClaims}
            </span>
            <span className="text-xs font-semibold text-blue-700">In Verification</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Proof being evaluated by finders</p>
        </div>

        {/* Card 4: Returned Items */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Reconnection Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {stats.totalReturned > 0 ? `${stats.totalReturned}` : '94%'}
            </span>
            <span className="text-xs font-semibold text-emerald-700">Returned</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Successfully claimed &amp; returned</p>
        </div>
      </div>

      {/* 3. Interactive Category Carousel / Pill Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>Filter by Category ({activeTab === 'found' ? 'Found Catalog' : 'Lost Items'})</span>
          </span>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs text-teal-700 hover:text-teal-900 font-bold"
            >
              Show All Categories
            </button>
          )}
        </div>

        {/* Category Pills with Real Counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 ${
              selectedCategory === 'all'
                ? 'bg-navy-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Items</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {items.length}
            </span>
          </button>

          {ITEM_CATEGORIES.map((cat) => {
            const IconComponent = CATEGORY_ICONS[cat] || Package;
            const count = categoryCounts[cat] || 0;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'all' : cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-teal-700 text-white shadow-sm ring-1 ring-teal-500'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-200' : 'text-slate-500'}`} />
                <span className="truncate max-w-[150px]">{cat.split('&')[0]}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-teal-50 text-teal-800 border border-teal-200'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Main Catalog Tabs & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Tab Switcher & View Mode Toggle */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange('found')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
                activeTab === 'found'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Found Items Catalog</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'found' ? 'bg-white/25 text-white' : 'bg-teal-50 text-teal-800'
              }`}>
                {stats.totalFound}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('lost')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
                activeTab === 'lost'
                  ? 'bg-navy-900 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Reported Lost Belongings</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === 'lost' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-800'
              }`}>
                {stats.totalLost}
              </span>
            </button>
          </div>

          {/* View Mode Switcher (Grid vs List) */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs text-slate-400 font-medium">Layout:</span>
            <div className="p-1 bg-slate-200/70 rounded-xl flex items-center gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white text-navy-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-white text-navy-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, brand, details or location..."
                className="w-full pl-10 pr-8 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-100 focus:border-navy-600 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Location Filter */}
            <div>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-navy-100 focus:border-navy-600 shadow-2xs"
              >
                <option value="all">📍 All Campus Locations</option>
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
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-navy-100 focus:border-navy-600 shadow-2xs"
              >
                <option value="newest">🕒 Sort: Most Recent First</option>
                <option value="oldest">⏳ Sort: Oldest First</option>
              </select>
            </div>
          </div>

          {/* Status Quick Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Status:</span>
              {(['all', 'open', 'claim_pending', 'returned'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    selectedStatus === st
                      ? 'bg-navy-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'all'
                    ? 'All'
                    : st === 'open'
                    ? 'Active / Open'
                    : st === 'claim_pending'
                    ? 'Review Pending'
                    : 'Returned'}
                </button>
              ))}
            </div>

            {(searchQuery || selectedCategory !== 'all' || selectedLocation !== 'all' || selectedStatus !== 'all') && (
              <button
                onClick={resetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Main Content Area: Split Layout with Campus Quick Insights Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Listings Column (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <LoadingSpinner text="Retrieving campus listings..." />
          ) : paginatedItems.length === 0 ? (
            <EmptyState
              title={
                activeTab === 'found'
                  ? 'No found belongings match your current filter'
                  : 'No lost belongings match your current filter'
              }
              description="Try broadening your category or location filters, or check back later as students frequently report items."
              actionLabel="Reset Search Filters"
              onAction={resetFilters}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isOwner={user?.id === item.owner_id}
                  onClaimClick={handleOpenClaim}
                  viewMode="grid"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isOwner={user?.id === item.owner_id}
                  onClaimClick={handleOpenClaim}
                  viewMode="list"
                />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-6 text-center">
              <Button
                variant="outline"
                size="md"
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                className="font-bold px-6 shadow-xs"
              >
                Load More Items ({items.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>

        {/* Right Side Panel: Campus Insights & Assistance (1 Col) */}
        <div className="space-y-6">
          {/* Widget 1: Campus Hotspot Tracker */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Top Campus Hotspots</h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Where items are most frequently reported at JSPM Pune:
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Central Library</span>
                  <span className="text-teal-700 font-bold">42%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full" style={{ width: '42%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Foodcourt</span>
                  <span className="text-teal-700 font-bold">28%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: '28%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Main Building</span>
                  <span className="text-teal-700 font-bold">18%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '18%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">Cricket Ground</span>
                  <span className="text-teal-700 font-bold">12%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '12%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Widget 2: 3-Step Ownership Verification Flow */}
          <div className="bg-gradient-to-br from-navy-950 to-navy-900 rounded-2xl p-5 text-white shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-sm">How Ownership Works</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Click <strong className="text-white">"This is Mine"</strong> and describe hidden details (passcode, stickers, contents).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <p className="text-slate-300 leading-relaxed">
                  The student finder evaluates your submitted proof and approves or declines.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Contact details unlock to coordinate safe collection at a campus security desk.
                </p>
              </div>
            </div>
          </div>

          {/* Widget 3: Campus Control & Security Handover Desks */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-900">Campus Handover Desks</h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              If you prefer not to meet individually, deposit found belongings with campus security:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block">Tathawade Campus Control</span>
                <span className="text-[11px] text-slate-500">Gate 1 Security Room • Ext. 104</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block">Hadapsar Campus Control</span>
                <span className="text-[11px] text-slate-500">Main Admin Entrance • Ext. 201</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Claim Modal Dialog */}
      <Modal
        isOpen={Boolean(claimingItem)}
        onClose={() => setClaimingItem(null)}
        title="Submit Ownership Claim"
        description="Verify your identity and provide distinguishing information about this item"
      >
        {claimingItem && (
          <div>
            <div className="p-3.5 bg-slate-50 rounded-xl mb-4 border border-slate-200 flex items-center gap-3">
              {claimingItem.image_path ? (
                <img
                  src={claimingItem.image_path}
                  alt={claimingItem.item_name}
                  className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                  ITEM
                </div>
              )}
              <div className="overflow-hidden">
                <p className="font-bold text-sm text-slate-900 truncate">{claimingItem.item_name}</p>
                <p className="text-xs text-slate-500">
                  Found at: <span className="font-semibold text-slate-800">{claimingItem.location}</span>
                </p>
                <span className="inline-block mt-1 text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {claimingItem.category}
                </span>
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

              <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 text-xs text-teal-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>Handover Safety Guarantee:</span>
                </p>
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
                  className="font-bold"
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
