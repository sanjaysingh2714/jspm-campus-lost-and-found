import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  PlusCircle,
  Search,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Layers,
  CheckCircle2,
  Database,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Button } from './Button';
import { formatRelativeTime } from '../../lib/utils';

export const Navbar: React.FC = () => {
  const { user, profile, signOut, isSupabaseReady, switchMockAccount } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/signin');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Compass },
    { name: 'Report Lost', path: '/report-lost', icon: Search },
    { name: 'Report Found', path: '/report-found', icon: PlusCircle },
    { name: 'My Listings', path: '/my-listings', icon: Layers },
    { name: 'My Claims', path: '/my-claims', icon: CheckCircle2 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-navy-900 to-navy-700 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5 text-teal-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-base tracking-tight leading-tight group-hover:text-navy-700 transition-colors">
                  JSPM Lost &amp; Found
                </span>
                <span className="text-[11px] font-semibold text-teal-700 tracking-wide uppercase">
                  Pune Campus Portal
                </span>
              </div>
            </Link>

            {/* Supabase Status Tag */}
            <div className="hidden lg:flex items-center gap-1.5 ml-3 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-slate-50 text-slate-600 border-slate-200">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseReady ? 'bg-emerald-500 animate-pulse' : 'bg-teal-500'
                }`}
              />
              <span>{isSupabaseReady ? 'Supabase Live' : 'Campus DB'}</span>
            </div>
          </div>

          {/* Desktop Navigation for Authenticated Users */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-navy-50 text-navy-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-navy-700' : 'text-slate-400'}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                {/* Notifications Bell Dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="relative p-2 rounded-xl text-slate-600 hover:text-navy-900 hover:bg-slate-100 transition-colors focus:outline-none"
                    title="Notifications"
                    aria-label="View notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Card */}
                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 text-sm">Notifications</h4>
                          {unreadCount > 0 && (
                            <span className="text-[10px] font-bold bg-navy-100 text-navy-800 px-2 py-0.5 rounded-full">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllAsRead()}
                            className="text-xs text-navy-700 hover:text-navy-900 font-semibold transition"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-500 text-xs">
                            No notifications yet. You'll be notified when claims or item updates occur!
                          </div>
                        ) : (
                          notifications.slice(0, 5).map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                markAsRead(n.id);
                                if (n.related_item_id) {
                                  navigate(`/items/${n.related_item_id}`);
                                  setNotifDropdownOpen(false);
                                }
                              }}
                              className={`p-3.5 text-xs transition-colors cursor-pointer hover:bg-slate-50 ${
                                !n.is_read ? 'bg-navy-50/40 font-medium' : 'text-slate-600'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="font-semibold text-slate-900 text-xs">{n.title}</span>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {formatRelativeTime(n.created_at)}
                                </span>
                              </div>
                              <p className="text-slate-600 leading-relaxed line-clamp-2">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                        <Link
                          to="/notifications"
                          onClick={() => setNotifDropdownOpen(false)}
                          className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-navy-800 hover:text-navy-950"
                        >
                          <span>View all notifications</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu Dropdown */}
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-lg bg-navy-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="hidden lg:flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                        {profile?.full_name || 'Student'}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {profile?.prn || 'Verified'}
                      </span>
                    </div>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="p-3 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{profile?.full_name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <span className="mt-1.5 inline-block text-[10px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                          PRN: {profile?.prn || 'N/A'}
                        </span>
                      </div>

                      <div className="p-1.5">
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          <span>Student Profile</span>
                        </Link>
                        <Link
                          to="/my-listings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Layers className="w-4 h-4 text-slate-400" />
                          <span>My Listings</span>
                        </Link>
                        <Link
                          to="/my-claims"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <CheckCircle2 className="w-4 h-4 text-slate-400" />
                          <span>My Claims</span>
                        </Link>

                        {/* Fast Account Switcher for 2-user test journey in local mode */}
                        {!isSupabaseReady && switchMockAccount && (
                          <div className="my-1 pt-1 border-t border-slate-100">
                            <span className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Switch Test User
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                switchMockAccount(
                                  user.email === 'rohit.sharma@jspm.edu.in'
                                    ? 'priya.deshmukh@jspm.edu.in'
                                    : 'rohit.sharma@jspm.edu.in'
                                );
                                setUserMenuOpen(false);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded-lg transition flex items-center justify-between"
                            >
                              <span>
                                Switch to {user.email === 'rohit.sharma@jspm.edu.in' ? 'Priya' : 'Rohit'}
                              </span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="p-1.5 border-t border-slate-100">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Public Header Links */
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/signin">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">
                    Register as Student
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-5 space-y-2 animate-in slide-in-from-top duration-150">
          {user ? (
            <>
              <div className="p-3 bg-slate-50 rounded-xl mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{profile?.full_name}</p>
                  <p className="text-xs text-slate-500">PRN: {profile?.prn}</p>
                </div>
                <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>

              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                      isActive ? 'bg-navy-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}

              <Link
                to="/notifications"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>

              <Link
                to="/profile"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <User className="w-4 h-4 text-slate-500" />
                <span>Student Profile</span>
              </Link>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link to="/signin" className="block w-full">
                <Button variant="outline" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup" className="block w-full">
                <Button variant="primary" className="w-full justify-center">
                  Register as Student
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
