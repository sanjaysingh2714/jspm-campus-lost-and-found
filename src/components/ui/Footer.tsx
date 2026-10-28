import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ShieldCheck, Heart, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-950 text-slate-400 text-xs border-t border-navy-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-white text-base tracking-tight">
                JSPM Campus Lost &amp; Found
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              A secure, student-first platform designed to help JSPM University Pune students report,
              discover, and reclaim lost belongings across campus faculties, labs, hostels, and canteens.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-teal-400 font-medium">
              <MapPin className="w-3.5 h-3.5" />
              <span>JSPM University Campus, Tathawade &amp; Hadapsar, Pune, Maharashtra</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Portal Services
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="hover:text-teal-300 transition-colors">
                  Search Found Items
                </Link>
              </li>
              <li>
                <Link to="/report-lost" className="hover:text-teal-300 transition-colors">
                  Report a Lost Item
                </Link>
              </li>
              <li>
                <Link to="/report-found" className="hover:text-teal-300 transition-colors">
                  Submit a Found Belonging
                </Link>
              </li>
              <li>
                <Link to="/my-claims" className="hover:text-teal-300 transition-colors">
                  Check Verification Claims
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Verification Guidelines */}
          <div>
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Trust &amp; Privacy
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Protected by Supabase Row Level Security</span>
              </li>
              <li>
                <span>PRN &amp; phone numbers hidden on public cards</span>
              </li>
              <li>
                <span>Six-digit OTP verified student accounts</span>
              </li>
              <li>
                <span>Campus security desk handover support</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-6 border-t border-navy-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <p>
            &copy; {new Date().getFullYear()} JSPM Campus Lost &amp; Found. Developed for JSPM Pune students.
          </p>
          <p className="text-center sm:text-right max-w-md">
            Notice: PRN format validation enforces account integrity but does not represent official university enrollment verification.
          </p>
        </div>
      </div>
    </footer>
  );
};
