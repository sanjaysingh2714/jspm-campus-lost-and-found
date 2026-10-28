import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowRight, ShieldCheck, HelpCircle, Clock, UserCheck } from 'lucide-react';
import { Item } from '../../types/database';
import { formatDate, formatRelativeTime } from '../../lib/utils';
import { ItemStatusBadge } from './Badge';

interface ItemCardProps {
  item: Item;
  onClaimClick?: (item: Item) => void;
  isOwner?: boolean;
  viewMode?: 'grid' | 'list';
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClaimClick, isOwner, viewMode = 'grid' }) => {
  const isFound = item.item_type === 'found';

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Thumbnail */}
          <div className="relative w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
            {item.image_path ? (
              <img
                src={item.image_path}
                alt={item.item_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                {isFound ? (
                  <ShieldCheck className="w-7 h-7 text-teal-600/50" />
                ) : (
                  <HelpCircle className="w-7 h-7 text-amber-600/50" />
                )}
                <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">No Photo</span>
              </div>
            )}
            <span
              className={`absolute top-1 left-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                isFound ? 'bg-teal-600 text-white' : 'bg-amber-500 text-slate-950'
              }`}
            >
              {isFound ? 'Found' : 'Lost'}
            </span>
          </div>

          {/* Info */}
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                {item.category}
              </span>
              <ItemStatusBadge status={item.status} />
              {isOwner && (
                <span className="text-[10px] font-bold text-navy-700 bg-navy-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  <span>Your Listing</span>
                </span>
              )}
            </div>

            <h3 className="font-bold text-slate-900 text-base truncate group-hover:text-navy-700 transition-colors">
              {item.item_name}
            </h3>

            <p className="text-xs text-slate-600 line-clamp-1 leading-relaxed">
              {item.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[180px]">{item.location}</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{formatRelativeTime(item.created_at)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 self-stretch sm:self-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <Link
            to={`/items/${item.id}`}
            className="inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {isFound && item.status === 'open' && !isOwner && onClaimClick && (
            <button
              onClick={() => onClaimClick(item)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
            >
              This is Mine
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid View (Default)
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1">
      {/* Thumbnail Header */}
      <div className="relative h-52 w-full bg-slate-100 overflow-hidden">
        {item.image_path ? (
          <img
            src={item.image_path}
            alt={item.item_name}
            className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-400">
            {isFound ? (
              <ShieldCheck className="w-14 h-14 text-teal-600/35 mb-1.5" />
            ) : (
              <HelpCircle className="w-14 h-14 text-amber-600/35 mb-1.5" />
            )}
            <span className="text-xs font-semibold text-slate-500">No Photo Uploaded</span>
          </div>
        )}

        {/* Gradient Overlay on image for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-md backdrop-blur-xs ${
              isFound
                ? 'bg-teal-600 text-white ring-1 ring-white/30'
                : 'bg-amber-500 text-slate-950 ring-1 ring-white/30'
            }`}
          >
            {isFound ? 'Found Belonging' : 'Lost Item'}
          </span>
          {isOwner && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy-900/90 text-white border border-white/20 shadow-xs">
              Mine
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 shadow-sm">
          <ItemStatusBadge status={item.status} />
        </div>

        {/* Bottom overlay in image */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 drop-shadow-sm font-medium">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-teal-300" />
            <span>{formatRelativeTime(item.created_at)}</span>
          </span>
          <span className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-200 border border-white/10">
            {item.category}
          </span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base line-clamp-1 mb-2 group-hover:text-navy-700 transition-colors">
            {item.item_name}
          </h3>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
            {item.description}
          </p>
        </div>

        <div>
          {/* Meta: Location and Date */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="truncate font-medium text-slate-700">{item.location}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {isFound ? 'Found on' : 'Lost on'} {formatDate(item.incident_date)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-3 flex items-center gap-2">
            <Link
              to={`/items/${item.id}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {isFound && item.status === 'open' && !isOwner && onClaimClick && (
              <button
                onClick={() => onClaimClick(item)}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-xs hover:shadow-md transition-all shrink-0 active:scale-95"
              >
                This is Mine
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
