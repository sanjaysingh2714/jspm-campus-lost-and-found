import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Search, ArrowRight, Clock, MapPin, Eye, ExternalLink } from 'lucide-react';
import { claimsService } from '../services/claimsService';
import { Claim } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { ClaimStatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/Modal';

export const MyClaimsPage: React.FC = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClaims = async () => {
    if (!user) return;
    try {
      const data = await claimsService.fetchUserClaims(user.id);
      setClaims(data);
    } catch (err) {
      console.error('Failed to load user claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
    const unsub = claimsService.subscribeToClaims(() => loadClaims());
    return () => unsub();
  }, [user?.id]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          My Verification Claims
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Track ownership claims you have submitted for items found on campus
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Fetching your submitted claims..." />
      ) : claims.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No claims submitted yet"
          description="If you see your lost belongings in the campus found catalog, click 'This is Mine' to submit a claim."
          actionLabel="Browse Found Items Catalog"
          onAction={() => (window.location.href = '/dashboard?tab=found')}
        />
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    {claim.item?.image_path ? (
                      <img
                        src={claim.item.image_path}
                        alt={claim.item.item_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] font-bold">
                        ITEM
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {claim.item?.item_name || 'Found Campus Item'}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{claim.item?.location}</span>
                      <span>&bull;</span>
                      <span>Claimed {formatRelativeTime(claim.created_at)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <ClaimStatusBadge status={claim.status} />
                  {claim.item?.id && (
                    <Link to={`/items/${claim.item.id}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <span>View Listing</span>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Message Details */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-700">
                <span className="font-semibold text-slate-900 block mb-1">
                  Your Identifying Details:
                </span>
                <p className="leading-relaxed">{claim.claim_message}</p>
              </div>

              {/* Context message based on claim status */}
              {claim.status === 'approved' && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold mb-1">Claim Approved by Finder!</h4>
                    <p className="leading-relaxed">
                      The finder verified your identifying details and approved your claim. You can
                      now visit the campus location or contact the finder to collect your item.
                    </p>
                  </div>
                </div>
              )}

              {claim.status === 'rejected' && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
                  <p>
                    The finder reviewed the details provided and was unable to confirm ownership.
                    If you believe this was in error, please consult campus security.
                  </p>
                </div>
              )}

              {claim.status === 'pending' && (
                <div className="flex items-center gap-2 text-xs text-amber-700 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>The finder has been notified and is currently verifying this claim.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
