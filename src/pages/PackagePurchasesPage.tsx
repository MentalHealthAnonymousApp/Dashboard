import React, { useEffect, useState } from 'react';
import {
  ShoppingBagIcon,
  SearchIcon,
  XIcon,
  MailIcon,
  CheckCircle2Icon,
  ClockIcon,
  SendIcon,
  ExternalLinkIcon,
  CrownIcon,
  AlertCircleIcon,
  DollarSignIcon,
  EyeIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { SectionTitle } from '../components/ui/Card';
import { Pagination } from '../components/ui/Table';
import { TableSkeleton } from '../components/ui/Skeleton';
import { cn } from '../utils/cn';
import { getApiErrorMessage } from '../utils/apiError';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  useGetPurchaseStatsQuery,
  useGetPurchasesQuery,
  useSendConsultationEmailMutation,
} from '../redux/api/purchaseApi';
import type { ConsultationFilter, PackageTierKey, PurchaseRecord } from '../types';

const PAGE_SIZE = 10;

const TIER_LABELS: Record<PackageTierKey, string> = {
  basic: 'Basic ($49)',
  standard: 'Standard ($79)',
  premium: 'Premium ($149)',
};

const PROVIDER_LABELS: Record<PurchaseRecord['billingProvider'], string> = {
  stripe: 'Stripe',
  apple_app_store: 'Apple App Store',
  google_play: 'Google Play',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatMoney = (minor: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: minor % 100 ? 2 : 0 }).format(
    minor / 100,
  );

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

const customerName = (p: PurchaseRecord) =>
  [p.userId?.firstName, p.userId?.lastName].filter(Boolean).join(' ') || 'Deleted user';

const transactionRef = (p: PurchaseRecord) => p.providerTransactionId || p.stripeCheckoutSessionId || p._id;

const canSendConsultation = (p: PurchaseRecord) =>
  p.packageTier === 'premium' && p.status === 'completed' && Boolean(p.userId?.email);

function PaymentStatusBadge({ status }: { status: PurchaseRecord['status'] }) {
  if (status === 'completed') return null;
  const styles: Record<Exclude<PurchaseRecord['status'], 'completed'>, string> = {
    refunded: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
    partially_refunded: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
    disputed: 'bg-red-500/15 text-red-700 dark:text-red-400',
  };
  return (
    <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', styles[status])}>
      {status.replace('_', ' ')}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export function PackagePurchasesPage() {
  const [selectedTier, setSelectedTier] = useState<PackageTierKey | 'all'>('all');
  const [consultationFilter, setConsultationFilter] = useState<ConsultationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const searchTerm = useDebouncedValue(searchQuery.trim());

  // Any filter change returns to page 1.
  useEffect(() => setPage(1), [selectedTier, consultationFilter, searchTerm]);

  const {
    data: listResult,
    isLoading,
    isFetching,
    error: listError,
    refetch,
  } = useGetPurchasesQuery(
    { packageTier: selectedTier, consultation: consultationFilter, page, limit: PAGE_SIZE, searchTerm: searchTerm || undefined },
    { refetchOnFocus: true },
  );
  const { data: stats } = useGetPurchaseStatsQuery(undefined, { refetchOnFocus: true });
  const [sendConsultationEmail, { isLoading: isSending }] = useSendConsultationEmailMutation();

  const purchases = listResult?.data ?? [];
  const meta = listResult?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const total = meta?.total ?? 0;
  const pendingConsultationsCount = stats?.pendingConsultations ?? 0;

  // Send Consultation Email Modal
  const [activeConsultationModal, setActiveConsultationModal] = useState<PurchaseRecord | null>(null);
  const [consultationLinkInput, setConsultationLinkInput] = useState('');
  const [consultationSubject, setConsultationSubject] = useState('');
  const [consultationMessage, setConsultationMessage] = useState('');

  // View Details Modal
  const [activeDetailsModal, setActiveDetailsModal] = useState<PurchaseRecord | null>(null);

  const handleOpenConsultationModal = (purchase: PurchaseRecord) => {
    setActiveConsultationModal(purchase);
    setConsultationLinkInput(purchase.consultationLink || '');
    setConsultationSubject('Your 1-on-1 Consultation Session with Dr. Skelton (Mention Support)');
    setConsultationMessage(
      purchase.consultationSent && purchase.consultationNotes
        ? purchase.consultationNotes
        : `Dear ${purchase.userId?.firstName || 'Customer'},\n\nThank you for choosing the Premium Package. As part of your package, your private 1-on-1 consultation session with Dr. Skelton is now ready.\n\nPlease use the secure link below to join your session or select your preferred time slot.\n\nIf you have any questions or specific areas of concern beforehand, feel free to reply directly to this email.\n\nWarm regards,\nDr. Skelton, PsyD\nClinical Lead`,
    );
  };

  const handleSendConsultationEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultationModal) return;

    const link = consultationLinkInput.trim();
    if (!/^https:\/\/\S+$/i.test(link)) {
      toast.error('Please enter a valid https:// consultation link.');
      return;
    }

    try {
      await sendConsultationEmail({
        id: activeConsultationModal._id,
        body: { consultationLink: link, subject: consultationSubject.trim(), message: consultationMessage.trim() },
      }).unwrap();
      toast.success(`Consultation email sent to ${activeConsultationModal.userId?.email}.`);
      setActiveConsultationModal(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const tierCount = (tier: PackageTierKey) => stats?.tiers[tier].count ?? 0;
  const tierRevenue = (tier: PackageTierKey) => formatMoney(stats?.tiers[tier].revenueMinor ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle
          title="Package Purchases & Revenue"
          description="Track customer orders for Basic ($49), Standard ($79), and Premium ($149) one-time packages and dispatch Dr. Skelton consultation links."
        />
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-card border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-body">Net Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-tint text-primary">
              <DollarSignIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-serif text-ink">
            {stats ? formatMoney(stats.totalRevenueMinor, stats.currency) : '—'}
          </p>
          <p className="mt-1 text-[11px] text-body">After refunds · {stats?.totalCount ?? 0} paid orders</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-body">Basic ($49)</span>
            <span className="rounded-full bg-line px-2 py-0.5 text-[10px] font-bold text-body">Single Send</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-serif text-ink">{tierCount('basic')}</p>
          <p className="mt-1 text-[11px] text-body">{tierRevenue('basic')} total</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-body">Standard ($79)</span>
            <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[10px] font-bold text-primary">
              With Resources
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold font-serif text-ink">{tierCount('standard')}</p>
          <p className="mt-1 text-[11px] text-body">{tierRevenue('standard')} total</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-body">Premium ($149)</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
              <CrownIcon className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-serif text-ink">{tierCount('premium')}</p>
          <p className="mt-1 text-[11px] text-body">{tierRevenue('premium')} total</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedTier('premium');
            setConsultationFilter('pending');
          }}
          className={cn(
            'rounded-card border p-4 text-left shadow-xs transition-colors',
            pendingConsultationsCount > 0
              ? 'border-amber-400/50 bg-amber-500/10 dark:bg-amber-950/20'
              : 'border-line bg-surface',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pending Links
            </span>
            <AlertCircleIcon className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold font-serif text-ink">{pendingConsultationsCount}</p>
          <p className="mt-1 text-[11px] text-body">
            {pendingConsultationsCount === 1
              ? '1 session requires link email'
              : `${pendingConsultationsCount} sessions require link email`}
          </p>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-surface p-1.5">
            {(
              [
                { id: 'all', label: 'All Packages', count: stats?.totalCount ?? 0 },
                { id: 'basic', label: TIER_LABELS.basic, count: tierCount('basic') },
                { id: 'standard', label: TIER_LABELS.standard, count: tierCount('standard') },
                { id: 'premium', label: TIER_LABELS.premium, count: tierCount('premium') },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedTier(tab.id);
                  if (tab.id !== 'premium' && tab.id !== 'all') setConsultationFilter('all');
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                  selectedTier === tab.id ? 'bg-primary text-white shadow-xs' : 'text-body hover:bg-canvas hover:text-ink',
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px]',
                    selectedTier === tab.id ? 'bg-white/20 text-white' : 'bg-line text-body',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {(selectedTier === 'premium' || selectedTier === 'all') && (
            <select
              value={consultationFilter}
              onChange={(e) => setConsultationFilter(e.target.value as ConsultationFilter)}
              aria-label="Filter by consultation status"
              className="rounded-2xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            >
              <option value="all">All consultations</option>
              <option value="pending">Link pending</option>
              <option value="sent">Link sent</option>
            </select>
          )}
        </div>

        <div className="relative min-w-[280px]">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, email, or transaction ID…"
            className="w-full rounded-2xl border border-line bg-surface py-2 pl-9 pr-8 text-xs text-ink placeholder:text-subtle focus:border-primary focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle hover:text-ink"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Purchases Table */}
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-xs">
        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : (
          <>
            <div className={cn('overflow-x-auto transition-opacity', isFetching && 'opacity-60')}>
              <table className="w-full text-left text-xs text-body">
                <thead className="border-b border-line bg-canvas/60 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  <tr>
                    <th className="px-5 py-3.5">Customer & Contact</th>
                    <th className="px-4 py-3.5">Package Tier</th>
                    <th className="px-4 py-3.5">Amount & Date</th>
                    <th className="px-4 py-3.5">Dr. Skelton Consultation</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {listError ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-subtle">
                        <AlertCircleIcon className="mx-auto h-8 w-8 opacity-40 mb-2" />
                        <p className="font-semibold text-ink">Could not load purchases</p>
                        <p className="text-xs mt-1">{getApiErrorMessage(listError)}</p>
                        <button
                          type="button"
                          onClick={() => refetch()}
                          className="mt-3 rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : purchases.length > 0 ? (
                    purchases.map((purchase) => {
                      const isPremium = purchase.packageTier === 'premium';
                      const isStandard = purchase.packageTier === 'standard';
                      const name = customerName(purchase);

                      return (
                        <tr key={purchase._id} className="transition-colors hover:bg-canvas/40">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs shadow-xs',
                                  isPremium
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                    : isStandard
                                      ? 'bg-primary-tint text-primary'
                                      : 'bg-line text-body',
                                )}
                              >
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-ink">{name}</p>
                                <p className="text-[11px] text-body">{purchase.userId?.email}</p>
                                {purchase.userId?.phone && (
                                  <p className="text-[10px] text-subtle">{purchase.userId.phone}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                                isPremium
                                  ? 'border border-amber-400/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                                  : isStandard
                                    ? 'border border-primary/30 bg-primary-tint text-primary'
                                    : 'border border-line bg-canvas text-body',
                              )}
                            >
                              {isPremium && <CrownIcon className="h-3 w-3 text-amber-600" />}
                              {TIER_LABELS[purchase.packageTier]}
                            </span>
                            <p className="mt-1 text-[11px] text-subtle truncate max-w-[170px]">
                              {purchase.messageId?.topic?.name
                                ? `Topic: ${purchase.messageId.topic.name}`
                                : purchase.fulfillmentStatus === 'pending'
                                  ? 'Message credit unused'
                                  : null}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-bold text-ink text-sm">
                              {formatMoney(purchase.amountMinor, purchase.currency)} {purchase.currency}
                            </p>
                            <p className="text-[11px] text-subtle">{formatDate(purchase.paidAt || purchase.createdAt)}</p>
                            <PaymentStatusBadge status={purchase.status} />
                          </td>

                          <td className="px-4 py-4">
                            {isPremium ? (
                              purchase.consultationSent ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2Icon className="h-3 w-3" />
                                    Link Emailed
                                  </span>
                                  {purchase.consultationLink && (
                                    <a
                                      href={purchase.consultationLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 flex items-center gap-1 text-[11px] text-primary hover:underline"
                                    >
                                      <span>View Meet Link</span>
                                      <ExternalLinkIcon className="h-2.5 w-2.5" />
                                    </a>
                                  )}
                                </div>
                              ) : purchase.status === 'completed' ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                    <ClockIcon className="h-3 w-3" />
                                    Link Pending Dispatch
                                  </span>
                                  <p className="mt-1 text-[10px] text-subtle">Needs Dr. Skelton session link</p>
                                </div>
                              ) : (
                                <span className="text-[11px] text-subtle italic">Not applicable (payment {purchase.status.replace('_', ' ')})</span>
                              )
                            ) : (
                              <span className="text-[11px] text-subtle italic">Not included in tier</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canSendConsultation(purchase) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenConsultationModal(purchase)}
                                  className={cn(
                                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs transition-transform hover:scale-[1.02] active:scale-[0.98]',
                                    purchase.consultationSent
                                      ? 'border border-line bg-canvas text-body hover:border-primary hover:text-primary'
                                      : 'bg-primary text-white hover:bg-primary/90',
                                  )}
                                >
                                  <MailIcon className="h-3.5 w-3.5" />
                                  <span>{purchase.consultationSent ? 'Resend Link' : 'Send Email Link'}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setActiveDetailsModal(purchase)}
                                title="View Full Purchase Record"
                                aria-label="View purchase details"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-line text-body hover:border-primary hover:text-ink"
                              >
                                <EyeIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-subtle">
                        <ShoppingBagIcon className="mx-auto h-8 w-8 opacity-40 mb-2" />
                        <p className="font-semibold text-ink">No package purchases found</p>
                        <p className="text-xs mt-1">Try resetting the filters or clearing the search query.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {total > 0 && (
              <div className="border-t border-line">
                <Pagination
                  page={Math.min(page, totalPages)}
                  totalPages={totalPages}
                  from={(Math.min(page, totalPages) - 1) * PAGE_SIZE + 1}
                  to={Math.min(page * PAGE_SIZE, total)}
                  total={total}
                  onPage={setPage}
                  unit="purchases"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Send Consultation Email Modal (Premium) */}
      {activeConsultationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                  <CrownIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink">Email Dr. Skelton Consultation Link</h3>
                  <p className="text-xs text-body">
                    Send private meeting link to{' '}
                    <strong className="text-ink">{customerName(activeConsultationModal)}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveConsultationModal(null)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-body hover:text-ink"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendConsultationEmail} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-ink text-[11px]">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={activeConsultationModal.userId?.email ?? ''}
                  className="mt-1 w-full rounded-xl border border-line bg-canvas px-3.5 py-2 text-xs text-body opacity-80"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-ink text-[11px]">
                  Dr. Skelton Meeting / Telehealth Link *
                </label>
                <div className="relative mt-1">
                  <input
                    type="url"
                    required
                    value={consultationLinkInput}
                    onChange={(e) => setConsultationLinkInput(e.target.value)}
                    placeholder="https://meet.google.com/... or https://calendly.com/..."
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 pl-9 text-xs text-ink font-medium focus:border-primary focus:outline-none"
                  />
                  <ExternalLinkIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
                </div>
                <p className="mt-1 text-[11px] text-subtle">Google Meet, Zoom, Calendly, or telehealth portal URL (https).</p>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-ink text-[11px]">
                  Email Subject Line *
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={consultationSubject}
                  onChange={(e) => setConsultationSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-ink text-[11px]">
                  Personal Message & Instructions *
                </label>
                <textarea
                  rows={8}
                  required
                  maxLength={5000}
                  value={consultationMessage}
                  onChange={(e) => setConsultationMessage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-ink focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-subtle">A “Join your consultation” button with the link is added below this message.</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setActiveConsultationModal(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-body hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-60"
                >
                  <SendIcon className="h-3.5 w-3.5" />
                  <span>{isSending ? 'Sending Email…' : 'Send Consultation Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Details Modal */}
      {activeDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-card border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="min-w-0">
                <h3 className="font-serif text-lg font-bold text-ink">Purchase Record Details</h3>
                <p className="text-xs text-body font-mono mt-0.5 truncate">{transactionRef(activeDetailsModal)}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailsModal(null)}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-body hover:text-ink"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              {(
                [
                  ['Customer', customerName(activeDetailsModal)],
                  ['Email', activeDetailsModal.userId?.email ?? '—'],
                  ['Package Tier', TIER_LABELS[activeDetailsModal.packageTier]],
                  [
                    'Amount Paid',
                    `${formatMoney(activeDetailsModal.amountMinor, activeDetailsModal.currency)} ${activeDetailsModal.currency}`,
                  ],
                  ...(activeDetailsModal.refundedAmountMinor
                    ? [['Refunded', `${formatMoney(activeDetailsModal.refundedAmountMinor, activeDetailsModal.currency)} on ${formatDate(activeDetailsModal.refundedAt)}`]]
                    : []),
                  ['Payment Status', activeDetailsModal.status.replace('_', ' ')],
                  ['Billing Provider', PROVIDER_LABELS[activeDetailsModal.billingProvider]],
                  ['Purchased At', formatDate(activeDetailsModal.paidAt || activeDetailsModal.createdAt)],
                  [
                    'Message Credit',
                    activeDetailsModal.messageId
                      ? `Used${activeDetailsModal.messageId.topic?.name ? ` · ${activeDetailsModal.messageId.topic.name}` : ''} (${activeDetailsModal.messageId.status})`
                      : activeDetailsModal.fulfillmentStatus === 'pending'
                        ? 'Unused'
                        : activeDetailsModal.fulfillmentStatus,
                  ],
                  ...(activeDetailsModal.packageTier === 'premium'
                    ? [
                        [
                          'Consultation Link',
                          activeDetailsModal.consultationSent
                            ? `Sent on ${formatDate(activeDetailsModal.consultationSentAt)}`
                            : 'Pending Dispatch',
                        ],
                      ]
                    : []),
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-line/60 pb-2">
                  <span className="text-subtle shrink-0">{label}</span>
                  <span className="font-semibold text-ink text-right break-all">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setActiveDetailsModal(null)}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
