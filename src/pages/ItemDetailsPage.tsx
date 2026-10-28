import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  ShieldCheck,
  HelpCircle,
  Lock,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Trash2,
  Share2,
} from 'lucide-react';
import { itemsService } from '../services/itemsService';
import { claimsService } from '../services/claimsService';
import { Item, Claim, ClaimStatus } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatDateTime, formatRelativeTime, maskPhoneNumber, maskEmail } from '../lib/utils';
import { ItemStatusBadge, ClaimStatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal, LoadingSpinner } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Input';
import { Alert } from '../components/ui/EmptyState';

export const ItemDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Claim modal state
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Status updating state
  const [actionLoading, setActionLoading] = useState(false);

  const isOwner = Boolean(user && item && user.id === item.owner_id);
  const isFound = item?.item_type === 'found';

  // Load item and related claims
  const loadData = async () => {
    if (!id) return;
    try {
      const data = await itemsService.fetchItemById(id);
      if (!data) {
        setError('Item listing not found.');
        return;
      }
      setItem(data);

      // If user is owner, load all claims on this item
      if (user && user.id === data.owner_id) {
        const itemClaims = await claimsService.fetchClaimsByItem(id);
        setClaims(itemClaims);
      } else if (user) {
        // Claimant: check if they have a claim on this item
        const userClaims = await claimsService.fetchUserClaims(user.id);
        const myClaim = userClaims.filter((c) => c.item_id === id);
        setClaims(myClaim);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load item details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to item & claim updates
    const unsub1 = itemsService.subscribeToItems(() => loadData());
    const unsub2 = claimsService.subscribeToClaims(() => loadData());

    return () => {
      unsub1();
      unsub2();
    };
  }, [id, user?.id]);

  // Handle Submit Claim
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !user) return;

    if (claimMessage.trim().length < 10) {
      setClaimError('Please provide at least 10 characters describing identifying details.');
      return;
    }

    setClaimError(null);
    setSubmittingClaim(true);

    try {
      await claimsService.createClaim(item.id, user.id, claimMessage.trim());
      setClaimSuccess('Claim submitted successfully! The finder will review your details.');
      setTimeout(() => {
        setClaimModalOpen(false);
        setClaimSuccess(null);
        loadData();
      }, 1800);
    } catch (err: any) {
      setClaimError(err.message || 'Failed to submit claim.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  // Handle Claim Status Update (Approve or Reject by Owner)
  const handleUpdateClaimStatus = async (claimId: string, newStatus: ClaimStatus) => {
    if (!user) return;
    setActionLoading(true);
    try {
      await claimsService.updateClaimStatus(claimId, newStatus, user.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update claim status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Close or Delete Listing by Owner
  const handleCloseListing = async () => {
    if (!item || !window.confirm('Are you sure you want to close this listing?')) return;
    try {
      await itemsService.updateItem(item.id, { status: 'closed' });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to close listing.');
    }
  };

  const handleDeleteListing = async () => {
    if (!item || !window.confirm('Are you sure you want to delete this listing permanently?')) return;
    try {
      await itemsService.deleteItem(item.id);
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to delete listing.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <LoadingSpinner text="Loading item details..." />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Alert variant="error" className="mb-4">
          {error || 'Listing not found.'}
        </Alert>
        <Link to="/dashboard">
          <Button variant="outline">Back to Campus Dashboard</Button>
        </Link>
      </div>
    );
  }

  const userActiveClaim = claims.find(
    (c) => c.claimant_id === user?.id && (c.status === 'pending' || c.status === 'approved')
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to catalog</span>
        </button>

        {isOwner && (
          <div className="flex items-center gap-2">
            {item.status !== 'closed' && (
              <Button variant="outline" size="sm" onClick={handleCloseListing}>
                Close Listing
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteListing}
              className="gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Image & Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            {/* Image Banner */}
            <div className="relative h-72 sm:h-96 w-full bg-slate-900/5">
              {item.image_path ? (
                <img
                  src={item.image_path}
                  alt={item.item_name}
                  className="w-full h-full object-contain sm:object-cover bg-slate-950/5"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                  {isFound ? (
                    <ShieldCheck className="w-16 h-16 text-teal-600/40 mb-2" />
                  ) : (
                    <HelpCircle className="w-16 h-16 text-amber-600/40 mb-2" />
                  )}
                  <span className="text-sm font-medium text-slate-500">
                    No photograph provided by reporter
                  </span>
                </div>
              )}

              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-sm ${
                    isFound ? 'bg-teal-600 text-white' : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {isFound ? 'Found Belonging' : 'Lost Report'}
                </span>
              </div>

              <div className="absolute top-4 right-4">
                <ItemStatusBadge status={item.status} />
              </div>
            </div>

            {/* Information Card Body */}
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                  {item.category}
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Reported {formatRelativeTime(item.created_at)}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
                {item.item_name}
              </h1>

              {/* Location & Date Details Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 mb-6 text-xs sm:text-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 text-xs block font-medium">Campus Location</span>
                    <strong className="text-slate-900">{item.location}</strong>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 text-xs block font-medium">
                      {isFound ? 'Date Found' : 'Date Lost'}
                    </span>
                    <strong className="text-slate-900">{formatDate(item.incident_date)}</strong>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Item Description
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {item.description}
                </p>
              </div>

              {/* Claim Action for Non-Owners */}
              {!isOwner && isFound && (
                <div className="pt-6 border-t border-slate-100">
                  {userActiveClaim ? (
                    <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-teal-600" />
                        <div>
                          <p className="text-xs font-bold text-teal-900">
                            Claim Status: {userActiveClaim.status.toUpperCase()}
                          </p>
                          <p className="text-[11px] text-teal-700">
                            You have submitted a claim. The finder will review your description.
                          </p>
                        </div>
                      </div>
                      <Link to="/my-claims">
                        <Button variant="outline" size="sm">
                          View My Claim
                        </Button>
                      </Link>
                    </div>
                  ) : item.status === 'open' ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-teal-900 to-navy-900 text-white">
                      <div>
                        <h4 className="font-bold text-base">Is this item yours?</h4>
                        <p className="text-xs text-teal-200">
                          Submit distinguishing details to verify ownership and arrange collection.
                        </p>
                      </div>
                      <Button
                        variant="accent"
                        size="md"
                        onClick={() => setClaimModalOpen(true)}
                        className="font-bold shrink-0"
                      >
                        <span>This is Mine / Claim</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-100 text-slate-600 text-xs">
                      This item is marked as <strong>{item.status.replace('_', ' ')}</strong> and is no longer accepting new claims.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Owner Claim Review Panel */}
          {isOwner && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Verification Claims Received ({claims.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review distinguishing proof submitted by claimants to verify ownership
                  </p>
                </div>
                {item.status === 'claim_pending' && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    Action Required
                  </span>
                )}
              </div>

              {claims.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs rounded-xl border border-dashed border-slate-200">
                  No claims submitted for this item yet. When a student claims it, their details will appear here.
                </div>
              ) : (
                <div className="space-y-4">
                  {claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-bold text-slate-900">
                            {claim.claimant?.full_name || 'Student Claimant'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeTime(claim.created_at)}
                          </span>
                        </div>
                        <ClaimStatusBadge status={claim.status} />
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-slate-200/70 text-xs text-slate-700">
                        <span className="font-semibold text-slate-900 block mb-1">
                          Identifying Details Provided:
                        </span>
                        <p className="leading-relaxed">{claim.claim_message}</p>
                      </div>

                      {/* Contact reveal if approved */}
                      {claim.status === 'approved' && (
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                          <span className="font-bold block mb-1">Handover Contact Details:</span>
                          <p>
                            Claimant Name: <strong>{claim.claimant?.full_name}</strong>
                          </p>
                          <p>
                            Phone / WhatsApp:{' '}
                            <strong>{claim.claimant?.phone || 'Provided via Portal'}</strong>
                          </p>
                          <p>
                            College Email: <strong>{claim.claimant?.email}</strong>
                          </p>
                        </div>
                      )}

                      {/* Approval Actions */}
                      {claim.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleUpdateClaimStatus(claim.id, 'rejected')}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            <span>Decline Claim</span>
                          </Button>
                          <Button
                            variant="accent"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleUpdateClaimStatus(claim.id, 'approved')}
                            className="font-bold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>Approve &amp; Return Item</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Security & Privacy Safeguards */}
        <div className="space-y-6">
          {/* Privacy Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-900">Reporter Privacy Shield</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              To protect student security and prevent spam, direct personal contact details are
              withheld until a valid ownership claim is authorized.
            </p>

            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Reported By</span>
                <span className="font-semibold text-slate-800">
                  {isOwner ? 'You (Listing Owner)' : item.owner?.full_name || 'Enrolled Student'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">College PRN</span>
                <span className="font-semibold text-slate-800">
                  {isOwner ? profile?.prn : 'Hidden for privacy'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Phone Contact</span>
                <span className="font-semibold text-slate-800">
                  {isOwner ? profile?.phone : maskPhoneNumber(item.owner?.phone)}
                </span>
              </div>
            </div>
          </div>

          {/* Safety Advice */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-navy-800" />
              <h3 className="font-bold text-sm text-slate-900">Safe Campus Handover</h3>
            </div>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                <span>Meet in well-lit public campus locations (Library entrance, Canteen, or Security Booth).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                <span>Ask the claimant to unlock devices or show matching ID before handing over.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                <span>Notify the portal by marking the claim as approved to update catalog status.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Claim Modal */}
      <Modal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        title="Claim Ownership of Item"
        description="Provide details that establish you as the legitimate owner"
      >
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

        <form onSubmit={handleClaimSubmit} className="space-y-4">
          <Textarea
            label="Distinguishing Details / Proof"
            placeholder="e.g. Serial numbers, wallpapers, scratch patterns, stickers on back, brand name, specific documents inside..."
            rows={4}
            required
            value={claimMessage}
            onChange={(e) => setClaimMessage(e.target.value)}
            helperText="Minimum 10 characters. The listing owner will evaluate this information."
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setClaimModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              isLoading={submittingClaim}
              className="font-bold"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>Submit Claim</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
