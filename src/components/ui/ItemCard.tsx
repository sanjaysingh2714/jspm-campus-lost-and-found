import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { Item } from '../../types/database';
import { formatDate } from '../../lib/utils';
import { ItemStatusBadge } from './Badge';

interface ItemCardProps {
  item: Item;
  onClaimClick?: (item: Item) => void;
  isOwner?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClaimClick, isOwner }) => {
  const isFound = item.item_type === 'found';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Thumbnail Header */}
      <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
        {item.image_path ? (
          <img
            src={item.image_path}
            alt={item.item_name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
            {isFound ? (
              <ShieldCheck className="w-12 h-12 text-teal-600/40 mb-1" />
            ) : (
              <HelpCircle className="w-12 h-12 text-amber-600/40 mb-1" />
            )}
            <span className="text-xs font-medium text-slate-500">No Photo Provided</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs ${
              isFound
                ? 'bg-teal-600 text-white'
                : 'bg-amber-500 text-slate-950'
            }`}
          >
            {isFound ? 'Found Item' : 'Lost Item'}
          </span>
        </div>

        <div className="absolute top-3 right-3">
          <ItemStatusBadge status={item.status} />
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-2">
          <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
            {item.category}
          </span>
        </div>

        <h3 className="font-semibold text-slate-900 text-base line-clamp-1 mb-1.5 group-hover:text-navy-700 transition-colors">
          {item.item_name}
        </h3>

        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4 flex-1">
          {item.description}
        </p>

        {/* Meta: Location and Date */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {isFound ? 'Found on' : 'Lost on'} {formatDate(item.incident_date)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 flex items-center gap-2">
          <Link
            to={`/items/${item.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {isFound && item.status === 'open' && !isOwner && onClaimClick && (
            <button
              onClick={() => onClaimClick(item)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors shrink-0"
            >
              This is Mine
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
