import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  ShieldAlertIcon,
  AlertTriangleIcon,
  BanIcon,
  CheckCircle2Icon,
  EyeIcon,
  ClockIcon,
  CheckCheckIcon,
  AlertCircleIcon,
  MailIcon,
  PhoneIcon,
} from 'lucide-react';
import type { Channel, ReportReasonCategory, ReportRecord, ReportStatus } from '../types';
import {
  useBlockReportedSenderMutation,
  useGetReportStatsQuery,
  useGetReportsQuery,
  useResolveReportMutation,
} from '../redux/api/reportApi';
import { Card, SectionTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Label, Select, Textarea } from '../components/ui/Field';
import { Pagination, SearchInput, TableShell, Td, Th } from '../components/ui/Table';
import { EmptyState, TableSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Sheet';
import { Tooltip } from '../components/ui/Tooltip';
import { useTableState } from '../hooks/useTableState';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../utils/apiError';
import { relativeTime } from '../utils/format';
import { cn } from '../utils/cn';

const REASON_LABELS: Record<ReportReasonCategory, { label: string; tone: 'danger' | 'warning' | 'neutral' | 'primary' }> = {
  harassment: { label: 'Harassment / Abuse', tone: 'danger' },
  spam: { label: 'Spam', tone: 'warning' },
  unsolicited: { label: 'Unsolicited Contact', tone: 'warning' },
  distressing: { label: 'Distressing Content', tone: 'danger' },
  wrong_number: { label: 'Wrong Recipient', tone: 'neutral' },
  other: { label: 'Other Concern', tone: 'primary' },
};

const isSenderBlocked = (report: ReportRecord) => Boolean(report.reportedUserId?.isBlocked);
const canBlock = (report: ReportRecord) => Boolean(report.reportedUserId) && !isSenderBlocked(report);

function StatCard({ label, value, hint, icon, accent, iconBg }: {
  label: string;
  value: number | undefined;
  hint: string;
  icon: ReactNode;
  accent: string;
  iconBg: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-subtle">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBg, accent)}>{icon}</span>
      </div>
      <p className={cn('mt-2 font-display text-2xl font-bold', accent)}>{value ?? '—'}</p>
      <p className="mt-1 text-[11.5px] text-subtle">{hint}</p>
    </Card>
  );
}

export function ReportManagementPage() {
  const table = useTableState(10);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [reasonFilter, setReasonFilter] = useState<ReportReasonCategory | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const searchTerm = useDebouncedValue(table.query.trim());

  const { data: listResult, isLoading, isFetching, error: listError, refetch } = useGetReportsQuery(
    {
      status: statusFilter,
      reasonCategory: reasonFilter,
      channel: channelFilter,
      page: table.page,
      limit: table.pageSize,
      searchTerm: searchTerm || undefined,
    },
    { pollingInterval: 60_000, refetchOnFocus: true },
  );
  const { data: stats } = useGetReportStatsQuery(undefined, { pollingInterval: 60_000, refetchOnFocus: true });
  const [resolveReport, { isLoading: resolving }] = useResolveReportMutation();
  const [blockSender, { isLoading: blocking }] = useBlockReportedSenderMutation();

  const [viewingReport, setViewingReport] = useState<ReportRecord | null>(null);
  const [blockingReport, setBlockingReport] = useState<ReportRecord | null>(null);
  const [blockExplanation, setBlockExplanation] = useState('');
  const [resolvingReport, setResolvingReport] = useState<ReportRecord | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const reports = listResult?.data ?? [];
  const meta = listResult?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const safePage = Math.min(table.page, totalPages);
  const total = meta?.total ?? 0;

  const { page: currentPage, setPage } = table;
  useEffect(() => {
    if (meta && currentPage > totalPages) setPage(totalPages);
  }, [meta, currentPage, setPage, totalPages]);

  const openBlock = (report: ReportRecord) => {
    setBlockingReport(report);
    setBlockExplanation(`Blocked following recipient report: ${REASON_LABELS[report.reasonCategory]?.label ?? report.reasonCategory}`);
  };

  const handleBlockConfirm = async () => {
    if (!blockingReport) return;
    try {
      const result = await blockSender({ id: blockingReport._id, reason: blockExplanation.trim() || undefined }).unwrap();
      toast.warning(result.message ?? `${blockingReport.reportedPersonName} has been blocked.`);
      setBlockingReport(null);
      setBlockExplanation('');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleResolveConfirm = async () => {
    if (!resolvingReport) return;
    try {
      await resolveReport({ id: resolvingReport._id, resolutionNotes: resolutionNotes.trim() || undefined }).unwrap();
      toast.success('Report marked as resolved.');
      setResolvingReport(null);
      setResolutionNotes('');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const resetFilters = () => {
    table.setQuery('');
    setStatusFilter('all');
    setReasonFilter('all');
    setChannelFilter('all');
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Incident & Message Reports"
        description="Reports submitted by message recipients through the “Report” link in their email or SMS. Each report is linked to the sender of that message."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Reports"
          value={stats?.total}
          hint="Submitted by recipients"
          icon={<ShieldAlertIcon className="h-4 w-4" />}
          iconBg="bg-primary-tint"
          accent="text-ink"
        />
        <StatCard
          label="New Reports"
          value={stats?.new}
          hint="Awaiting administrator action"
          icon={<AlertTriangleIcon className="h-4 w-4" />}
          iconBg="bg-rose-500/10"
          accent="text-rose-600 dark:text-rose-400"
        />
        <StatCard
          label="Resolved"
          value={stats?.resolved}
          hint="Action taken & resolved"
          icon={<CheckCircle2Icon className="h-4 w-4" />}
          iconBg="bg-emerald-500/10"
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Blocked Senders"
          value={stats?.blockedSenders}
          hint="Access restricted"
          icon={<BanIcon className="h-4 w-4" />}
          iconBg="bg-rose-500/10"
          accent="text-ink"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <SearchInput
            value={table.query}
            onChange={table.setQuery}
            placeholder="Search sender, reason, or topic..."
            className="w-full sm:w-80"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[150px]">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ReportStatus | 'all');
                  table.setPage(1);
                }}
                aria-label="Filter by report status"
                className="h-9 text-[13px]"
              >
                <option value="all">All statuses</option>
                <option value="new">New Report</option>
                <option value="resolved">Resolved</option>
              </Select>
            </div>
            <div className="w-[170px]">
              <Select
                value={reasonFilter}
                onChange={(e) => {
                  setReasonFilter(e.target.value as ReportReasonCategory | 'all');
                  table.setPage(1);
                }}
                aria-label="Filter by reason"
                className="h-9 text-[13px]"
              >
                <option value="all">All reason types</option>
                {(Object.keys(REASON_LABELS) as ReportReasonCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {REASON_LABELS[key].label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-[140px]">
              <Select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value as Channel | 'all');
                  table.setPage(1);
                }}
                aria-label="Filter by channel"
                className="h-9 text-[13px]"
              >
                <option value="all">All channels</option>
                <option value="sms">From SMS</option>
                <option value="email">From email</option>
              </Select>
            </div>
            <p className="ml-auto text-xs text-subtle">
              {total} of {stats?.total ?? total} reports{isFetching && !isLoading ? ' · Updating…' : ''}
            </p>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : listError ? (
          <EmptyState
            icon={<AlertCircleIcon className="h-4 w-4" />}
            title="Could not load reports"
            description={getApiErrorMessage(listError)}
            action={
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<ShieldAlertIcon className="h-4 w-4" />}
            title="No reports match your filters"
            description="Try changing the search query or resetting filters."
            action={
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>Reported Person (Sender)</Th>
                  <Th>Reported Time</Th>
                  <Th>Reason & Details</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const reasonMeta = REASON_LABELS[report.reasonCategory] || REASON_LABELS.other;
                  const blocked = isSenderBlocked(report);
                  return (
                    <tr
                      key={report._id}
                      className={cn(
                        'transition-colors duration-150 ease-calm hover:bg-canvas/70',
                        report.status === 'new' && 'bg-rose-500/[0.03]',
                      )}
                    >
                      <Td>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-ink text-[13.5px]">{report.reportedPersonName}</span>
                            {report.reportedUserId ? (
                              blocked ? (
                                <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-rose-600">
                                  Blocked
                                </span>
                              ) : (
                                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-emerald-600">
                                  Active Sender
                                </span>
                              )
                            ) : (
                              <span className="rounded bg-line px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-subtle">
                                Account deleted
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-subtle">{report.reportedPersonContact}</p>
                          <p className="text-[10.5px] font-mono text-subtle">Topic: {report.topicTitle}</p>
                        </div>
                      </Td>

                      <Td className="whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs font-medium text-ink">
                            <ClockIcon className="h-3 w-3 text-subtle" />
                            <span>{relativeTime(report.createdAt)}</span>
                          </div>
                          <p className="text-[11px] text-subtle">{new Date(report.createdAt).toLocaleString()}</p>
                        </div>
                      </Td>

                      <Td className="max-w-[340px]">
                        <div className="space-y-1">
                          <Badge tone={reasonMeta.tone}>{reasonMeta.label}</Badge>
                          <button type="button" onClick={() => setViewingReport(report)} className="text-left group block">
                            <p className="text-xs text-body line-clamp-2 leading-relaxed group-hover:text-ink transition-colors">
                              “{report.reasonText}”
                            </p>
                          </button>
                        </div>
                      </Td>

                      <Td>
                        {report.status === 'new' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11.5px] font-bold text-rose-700 dark:text-rose-400">
                            <AlertTriangleIcon className="h-3 w-3" /> New Report
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2Icon className="h-3 w-3" /> Resolved
                          </span>
                        )}
                      </Td>

                      <Td align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canBlock(report) ? (
                            <Button variant="danger" size="sm" onClick={() => openBlock(report)} className="h-8 px-2.5 text-xs font-semibold">
                              <BanIcon className="h-3.5 w-3.5" />
                              <span>Block User</span>
                            </Button>
                          ) : blocked ? (
                            <span className="rounded border border-line bg-canvas px-2 py-1 text-[11px] font-medium text-subtle">User Blocked</span>
                          ) : null}

                          {report.status === 'new' ? (
                            <Tooltip label="Mark report as resolved">
                              <button
                                onClick={() => {
                                  setResolvingReport(report);
                                  setResolutionNotes('');
                                }}
                                aria-label="Resolve report"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                              >
                                <CheckCheckIcon className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          ) : null}

                          <Tooltip label="View full report">
                            <button
                              onClick={() => setViewingReport(report)}
                              aria-label="View report details"
                              className="rounded-md p-1.5 text-body transition-colors hover:bg-primary-tint hover:text-primary"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              from={total ? (safePage - 1) * table.pageSize + 1 : 0}
              to={Math.min(safePage * table.pageSize, total)}
              total={total}
              onPage={table.setPage}
              unit="reports"
            />
          </>
        )}
      </Card>

      {/* Block sender */}
      <Modal
        open={Boolean(blockingReport)}
        onClose={() => setBlockingReport(null)}
        title={blockingReport ? `Block ${blockingReport.reportedPersonName}?` : ''}
        description="The sender will be signed out and unable to send messages. Their pending messages are rejected, and all open reports against them are marked resolved."
        footer={
          <>
            <Button variant="ghost" onClick={() => setBlockingReport(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBlockConfirm} disabled={blocking}>
              {blocking ? 'Blocking…' : 'Confirm Block User'}
            </Button>
          </>
        }
      >
        {blockingReport ? (
          <div className="space-y-3 pt-1">
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-900 dark:text-rose-300">
              <p className="font-semibold">Recipient's report:</p>
              <p className="mt-1 leading-relaxed italic">“{blockingReport.reasonText}”</p>
            </div>
            <div>
              <Label htmlFor="block-note">Reason (saved on the user's account)</Label>
              <Textarea
                id="block-note"
                rows={2}
                maxLength={500}
                value={blockExplanation}
                onChange={(e) => setBlockExplanation(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Resolve */}
      <Modal
        open={Boolean(resolvingReport)}
        onClose={() => setResolvingReport(null)}
        title="Resolve report"
        description={resolvingReport ? `Report against ${resolvingReport.reportedPersonName}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setResolvingReport(null)}>
              Cancel
            </Button>
            <Button onClick={handleResolveConfirm} disabled={resolving}>
              {resolving ? 'Saving…' : 'Mark as Resolved'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 pt-1">
          <Label htmlFor="res-notes" hint="(Optional)">
            Resolution notes
          </Label>
          <Textarea
            id="res-notes"
            rows={3}
            maxLength={1000}
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="e.g. Reviewed message, no policy violation; warning issued to sender..."
          />
        </div>
      </Modal>

      {/* Details */}
      <Modal
        open={Boolean(viewingReport)}
        onClose={() => setViewingReport(null)}
        title="Report details"
        description={viewingReport ? `Submitted ${new Date(viewingReport.createdAt).toLocaleString()}` : ''}
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {viewingReport && canBlock(viewingReport) ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    const toBlock = viewingReport;
                    setViewingReport(null);
                    openBlock(toBlock);
                  }}
                >
                  <BanIcon className="h-3.5 w-3.5" /> Block Sender
                </Button>
              ) : null}
              {viewingReport?.status === 'new' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const toResolve = viewingReport;
                    setViewingReport(null);
                    setResolvingReport(toResolve);
                  }}
                >
                  <CheckCheckIcon className="h-3.5 w-3.5" /> Resolve
                </Button>
              ) : null}
            </div>
            <Button variant="secondary" onClick={() => setViewingReport(null)}>
              Close
            </Button>
          </div>
        }
      >
        {viewingReport ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-canvas/60 p-3">
                <p className="font-semibold text-subtle uppercase text-[10px] tracking-wider">Reported sender</p>
                <p className="mt-1 font-bold text-ink text-sm">{viewingReport.reportedPersonName}</p>
                <p className="text-body break-all">{viewingReport.reportedPersonContact}</p>
              </div>
              <div className="rounded-xl border border-line bg-canvas/60 p-3">
                <p className="font-semibold text-subtle uppercase text-[10px] tracking-wider">Reported by (recipient)</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold text-ink break-all">
                  {viewingReport.reportedByChannel === 'sms' ? <PhoneIcon className="h-3 w-3" /> : <MailIcon className="h-3 w-3" />}
                  {viewingReport.reportedByContact}
                </p>
                <p className="text-subtle">Topic: {viewingReport.topicTitle}</p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
              <span className="font-bold text-rose-700 dark:text-rose-400 uppercase text-[11px] tracking-wider">
                {REASON_LABELS[viewingReport.reasonCategory]?.label ?? viewingReport.reasonCategory}
              </span>
              <p className="text-ink leading-relaxed whitespace-pre-wrap font-medium">“{viewingReport.reasonText}”</p>
            </div>

            {viewingReport.messageId?.customNote ? (
              <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                <p className="font-semibold text-ink">The sender's note in the reported message</p>
                <p className="text-body leading-relaxed whitespace-pre-wrap">“{viewingReport.messageId.customNote}”</p>
                {viewingReport.messageId.sentAt ? (
                  <p className="text-[10.5px] text-subtle">Sent {new Date(viewingReport.messageId.sentAt).toLocaleString()}</p>
                ) : null}
              </div>
            ) : null}

            {viewingReport.status === 'resolved' ? (
              <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                <p className="font-semibold text-ink flex items-center gap-1.5">
                  <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" /> Resolved
                  {viewingReport.resolvedAt ? ` · ${new Date(viewingReport.resolvedAt).toLocaleString()}` : ''}
                </p>
                {viewingReport.resolutionNotes ? <p className="text-body leading-relaxed">{viewingReport.resolutionNotes}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
