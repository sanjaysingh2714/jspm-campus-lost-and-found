import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Search,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { ITEM_CATEGORIES } from '../types/database';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-slate-900 text-white pt-16 pb-20 sm:pt-24 sm:pb-28">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#2dd4bf_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-800/80 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Dedicated Campus Utility for JSPM University Pune</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Lost Something on Campus? <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-teal-400 to-blue-200">
              We Help Reconnect Belongings.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Report lost items in labs or hostels, submit items you found, verify ownership through
            distinctive details, and securely reclaim your belongings across all JSPM departments.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            {user ? (
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button variant="accent" size="lg" className="w-full font-bold">
                  <span>Go to Campus Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button variant="accent" size="lg" className="w-full font-bold">
                    <span>Register with PRN</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link to="/signin" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full bg-white/10 text-white hover:bg-white/20 border-white/20">
                    <span>Student Sign In</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Quick Stat Highlights */}
          <div className="mt-14 pt-10 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-teal-400 font-extrabold text-2xl">
                <span>100%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Student Verified Accounts</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-teal-400 font-extrabold text-2xl">
                <span>&lt; 24h</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Average Claim Response</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-teal-400 font-extrabold text-2xl">
                <span>12+</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Monitored Campus Locations</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-teal-400 font-extrabold text-2xl">
                <span>RLS</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">PostgreSQL Protected Privacy</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 inline-block px-3 py-1 rounded-full mb-3">
              Campus Workflow
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Three Simple Steps to Recover Your Item
            </h3>
            <p className="mt-3 text-slate-600 text-sm leading-relaxed">
              Designed specifically for student convenience with built-in fraud prevention and privacy controls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:border-navy-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-navy-900 text-white flex items-center justify-center font-bold text-lg mb-4 shadow-sm">
                1
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">Report or Search</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Report a lost item with location tags and photographs, or browse items found across
                JSPM libraries, canteens, sports grounds, and computer labs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:border-teal-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg mb-4 shadow-sm">
                2
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">Submit Ownership Claim</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Found your belongings in the catalog? Click "This is Mine" and provide distinguishing
                details such as lockscreen wallpaper, sticker logos, or serial numbers.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:border-navy-200 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-navy-800 text-white flex items-center justify-center font-bold text-lg mb-4 shadow-sm">
                3
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">Verification &amp; Handover</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                The finder reviews the claim. Once approved, the listing marks as returned and contact
                info is shared to coordinate a safe campus handover.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-14 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Popular Categories</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Frequently reported categories across JSPM faculties
              </p>
            </div>
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                View All Categories
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {ITEM_CATEGORIES.slice(0, 8).map((cat) => (
              <Link
                key={cat}
                to={`/dashboard?category=${encodeURIComponent(cat)}`}
                className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-teal-400 hover:shadow-xs transition-all group flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-50 group-hover:bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 transition-colors">
                  <Compass className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 group-hover:text-teal-800 transition-colors truncate">
                  {cat}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safety Assurance Banner */}
      <section className="py-12 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-800 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-teal-400" />
                <h4 className="text-lg font-bold">Student Privacy Safeguards</h4>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Your College PRN and phone numbers are never displayed on public listing cards.
                Information is only exchanged once a claim has been verified and approved by the finder.
              </p>
            </div>
            <Link to="/signup" className="shrink-0">
              <Button variant="accent" size="md" className="font-bold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
