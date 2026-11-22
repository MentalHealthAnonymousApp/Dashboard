import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  AlertCircleIcon,
  CheckCheckIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  GlobeIcon,
  InboxIcon,
  MailIcon,
  RotateCcwIcon,
  SmartphoneIcon,
  CalendarIcon,
} from 'lucide-react';
import type { SupportSource, SupportStatus, SupportTicket } from '../types';
import {
  useGetSupportStatsQuery,
  useGetSupportTicketsQuery,
  useUpdateSupportStatusMutation,
} from '../redux/api/supportApi';
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

const replyHref = (ticket: SupportTicket) =>
  ticket.email
    ? `mailto:${ticket.email}?subject=${encodeURIComponent(`Re: ${ticket.contactReason}`)}&body=${encodeURIComponent(
        `Hi ${ticket.name ?? 'there'},\n\n\n\n---\nYour message:\n${ticket.message}`,
      )}`
    : undefined;

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

function SourceBadge({ source }: { source: SupportSource }) {
  return source === 'website' ? (
    <Badge tone="primary">
      <GlobeIcon className="h-3 w-3" /> Website
    </Badge>
  ) : (
    <Badge tone="neutral">
      <SmartphoneIcon className="h-3 w-3" /> App
    </Badge>
  );
}

function StatusPill({ status }: { status: SupportStatus }) {
  return status === 'TODO' ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11.5px] font-bold text-amber-700 dark:text-amber-400">
      <ClockIcon className="h-3 w-3" /> Open
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400">
      <CheckCircle2Icon className="h-3 w-3" /> Resolved
    </span>
  );
}

export function SupportInboxPage() {
  const table = useTableState(10);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | 'all'>('TODO');
  const [sourceFilter, setSourceFilter] = useState<SupportSource | 'all'>('all');
  const searchTerm = useDebouncedValue(table.query.trim());

  const { data: listResult, isLoading, isFetching, error: listError, refetch } = useGetSupportTicketsQuery(
    {
      status: statusFilter,
      source: sourceFilter,
      page: table.page,
      limit: table.pageSize,
      searchTerm: searchTerm || undefined,
    },
    { pollingInterval: 60_000, refetchOnFocus: true },
  );
  const { data: stats } = useGetSupportStatsQuery(undefined, { pollingInterval: 60_000, refetchOnFocus: true });
  const [updateStatus, { isLoading: saving }] = useUpdateSupportStatusMutation();

  const [viewing, setViewing] = useState<SupportTicket | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const tickets = listResult?.data ?? [];
  const meta = listResult?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const safePage = Math.min(table.page, totalPages);
  const total = meta?.total ?? 0;

  const { page: currentPage, setPage } = table;
  useEffect(() => {
    if (meta && currentPage > totalPages) setPage(totalPages);
  }, [meta, currentPage, setPage, totalPages]);

  const openTicket = (ticket: SupportTicket) => {
    setViewing(ticket);
    setAdminNote(ticket.adminNote ?? '');
  };

  const changeStatus = async (ticket: SupportTicket, status: SupportStatus, note?: string) => {
    try {
      await updateStatus({ id: ticket._id, status, adminNote: note }).unwrap();
      toast.success(status === 'RESOLVED' ? 'Marked as resolved.' : 'Moved back to open.');
      setViewing(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const resetFilters = () => {
    table.setQuery('');
    setStatusFilter('all');
    setSourceFilter('all');
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Support Inbox"
        description="Messages sent through the website contact form and support requests from app users. Reply by email, then mark them resolved."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open"
          value={stats?.open}
          hint="Waiting for a reply"
          icon={<InboxIcon className="h-4 w-4" />}
          iconBg="bg-amber-500/10"
          accent="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Resolved"
          value={stats?.resolved}
          hint="Answered and closed"
          icon={<CheckCircle2Icon className="h-4 w-4" />}
          iconBg="bg-emerald-500/10"
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Last 7 days"
          value={stats?.lastSevenDays}
          hint="New messages this week"
          icon={<CalendarIcon className="h-4 w-4" />}
          iconBg="bg-primary-tint"
          accent="text-ink"
        />
        <StatCard
          label="Total"
          value={stats?.total}
          hint="All time"
          icon={<MailIcon className="h-4 w-4" />}
          iconBg="bg-primary-tint"
          accent="text-ink"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <SearchInput
            value={table.query}
            onChange={table.setQuery}
            placeholder="Search name, email, topic or message..."
            className="w-full sm:w-80"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[140px]">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as SupportStatus | 'all');
                  table.setPage(1);
                }}
                aria-label="Filter by status"
                className="h-9 text-[13px]"
              >
                <option value="all">All statuses</option>
                <option value="TODO">Open</option>
                <option value="RESOLVED">Resolved</option>
              </Select>
            </div>
            <div className="w-[140px]">
              <Select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value as SupportSource | 'all');
                  table.setPage(1);
                }}
                aria-label="Filter by source"
                className="h-9 text-[13px]"
              >
                <option value="all">All sources</option>
                <option value="website">Website</option>
                <option value="app">App</option>
              </Select>
            </div>
            <p className="ml-auto text-xs text-subtle">
              {total} message{total === 1 ? '' : 's'}
              {isFetching && !isLoading ? ' · Updating…' : ''}
            </p>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : listError ? (
          <EmptyState
            icon={<AlertCircleIcon className="h-4 w-4" />}
            title="Could not load messages"
            description={getApiErrorMessage(listError)}
            action={
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={<InboxIcon className="h-4 w-4" />}
            title={statusFilter === 'TODO' && !searchTerm && sourceFilter === 'all' ? 'Inbox zero' : 'No messages match your filters'}
            description={
              statusFilter === 'TODO' && !searchTerm && sourceFilter === 'all'
                ? 'Every message has been answered.'
                : 'Try changing the search query or resetting filters.'
            }
            action={
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Show all messages
              </Button>
            }
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>From</Th>
                  <Th>Topic & Message</Th>
                  <Th>Received</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const href = replyHref(ticket);
                  return (
                    <tr
                      key={ticket._id}
                      className={cn(
                        'transition-colors duration-150 ease-calm hover:bg-canvas/70',
                        ticket.status === 'TODO' && 'bg-amber-500/[0.03]',
                      )}
                    >
                      <Td>
                        <div className="space-y-1">
                          <p className="text-[13.5px] font-semibold text-ink">{ticket.name || 'Unknown'}</p>
                          <p className="text-[11.5px] text-subtle break-all">{ticket.email || 'No email'}</p>
                          <SourceBadge source={ticket.source} />
                        </div>
                      </Td>
                      <Td className="max-w-[380px]">
                        <button type="button" onClick={() => openTicket(ticket)} className="group block text-left">
                          <p className="text-[12.5px] font-semibold text-ink">{ticket.contactReason}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-body transition-colors group-hover:text-ink">
                            {ticket.message}
                          </p>
                        </button>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <p className="text-xs font-medium text-ink">{relativeTime(ticket.createdAt)}</p>
                        <p className="text-[11px] text-subtle">{new Date(ticket.createdAt).toLocaleString()}</p>
                      </Td>
                      <Td>
                        <StatusPill status={ticket.status} />
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          {href ? (
                            <Tooltip label="Reply by email">
                              <a
                                href={href}
                                aria-label="Reply by email"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-primary-tint hover:text-primary"
                              >
                                <MailIcon className="h-4 w-4" />
                              </a>
                            </Tooltip>
                          ) : null}
                          {ticket.status === 'TODO' ? (
                            <Tooltip label="Mark as resolved">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void changeStatus(ticket, 'RESOLVED')}
                                aria-label="Mark as resolved"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                              >
                                <CheckCheckIcon className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          ) : null}
                          <Tooltip label="Open message">
                            <button
                              type="button"
                              onClick={() => openTicket(ticket)}
                              aria-label="Open message"
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
              unit="messages"
            />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.contactReason ?? ''}
        description={viewing ? `Received ${new Date(viewing.createdAt).toLocaleString()}` : ''}
        footer={
          viewing ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              {replyHref(viewing) ? (
                <a
                  href={replyHref(viewing)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-medium text-ink transition-colors hover:bg-primary-tint hover:text-primary"
                >
                  <MailIcon className="h-3.5 w-3.5" /> Reply by email
                </a>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setViewing(null)}>
                  Close
                </Button>
                {viewing.status === 'TODO' ? (
                  <Button disabled={saving} onClick={() => void changeStatus(viewing, 'RESOLVED', adminNote.trim())}>
                    <CheckCheckIcon className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Mark as resolved'}
                  </Button>
                ) : (
                  <Button variant="secondary" disabled={saving} onClick={() => void changeStatus(viewing, 'TODO', adminNote.trim())}>
                    <RotateCcwIcon className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Reopen'}
                  </Button>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-canvas/60 p-3">
              <div>
                <p className="text-sm font-bold text-ink">{viewing.name || 'Unknown'}</p>
                <p className="break-all text-body">{viewing.email || 'No email provided'}</p>
              </div>
              <div className="flex items-center gap-2">
                <SourceBadge source={viewing.source} />
                <StatusPill status={viewing.status} />
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{viewing.message}</p>
            </div>

            {viewing.status === 'RESOLVED' && viewing.resolvedAt ? (
              <p className="flex items-center gap-1.5 text-subtle">
                <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
                Resolved {new Date(viewing.resolvedAt).toLocaleString()}
                {viewing.resolvedBy?.name ? ` by ${viewing.resolvedBy.name}` : ''}
              </p>
            ) : null}

            <div>
              <Label htmlFor="support-note" hint="(Only visible to admins)">
                Internal note
              </Label>
              <Textarea
                id="support-note"
                rows={3}
                maxLength={1000}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Replied with the refund policy on 12 Nov."
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
