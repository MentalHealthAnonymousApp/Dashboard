import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  MessageSquareIcon,
  CheckIcon,
  XIcon,
  ClockIcon,
  EyeIcon,
  MailIcon,
  PhoneIcon,
  SendIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  LayersIcon,
  RotateCwIcon,
  Trash2Icon,
  ChevronRightIcon,
  TimerIcon,
} from 'lucide-react';
import type { MessageChannel, MessageQueueFilter, MessageRecord } from '../types';
import {
  useDeleteMessageMutation,
  useGetMessageStatsQuery,
  useGetMessagesQuery,
  useReviewMessageMutation,
} from '../redux/api/messageApi';
import { Card, SectionTitle } from '../components/ui/Card';
import { Badge, ToneBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Label, Select, Textarea } from '../components/ui/Field';
import { Pagination, SearchInput, TableShell, Td, Th } from '../components/ui/Table';
import { EmptyState, TableSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Sheet';
import { Tooltip } from '../components/ui/Tooltip';
import { useTableState } from '../hooks/useTableState';
import { relativeTime } from '../utils/format';
import { cn } from '../utils/cn';
import { getApiErrorMessage } from '../utils/apiError';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const REJECTION_REASONS = [
  'Violates platform communication guidelines.',
  'Commercial advertising / promotional links detected.',
  'Harassing, hostile, or coercive tone in message text.',
  'Sensitive medical diagnosis claims without authorization.',
  'Suspicious or unverified recipient contact.',
  'Other administrative safety reason.',
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const senderName = (msg: MessageRecord) =>
  [msg.sender?.firstName, msg.sender?.lastName].filter(Boolean).join(' ') || 'Deleted user';

const recipientContact = (msg: MessageRecord) =>
  (msg.channel === 'email' ? msg.recipientEmail : msg.recipientPhone) || msg.maskedRecipient;

const canApprove = (msg: MessageRecord) =>
  msg.status === 'pending' || (msg.status === 'approved' && msg.deliveryStatus === 'failed');
const isDeliveryFailed = (msg: MessageRecord) =>
  msg.status === 'approved' && msg.deliveryStatus === 'failed';
const canReject = canApprove;
const canDelete = (msg: MessageRecord) => msg.status === 'delivered' || msg.status === 'rejected';

function StatusBadge({ msg }: { msg: MessageRecord }) {
  if (msg.status === 'pending') {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-amber-700 dark:text-amber-400">
          <ClockIcon className="h-3 w-3" /> Pending Review
        </span>
        {msg.autoApproveAt ? (
          <p className="flex items-center gap-1 text-[10.5px] text-subtle">
            <TimerIcon className="h-3 w-3" /> Auto-sends {relativeTime(msg.autoApproveAt)}
          </p>
        ) : null}
      </div>
    );
  }
  if (isDeliveryFailed(msg)) return <Badge tone="warning">Delivery failed</Badge>;
  if (msg.status === 'approved') return <Badge tone="success">Sending…</Badge>;
  if (msg.status === 'delivered') {
    return (
      <div className="space-y-1">
        <Badge tone="primary">Delivered</Badge>
        {msg.autoApproved ? <p className="text-[10.5px] text-subtle">Auto-approved</p> : null}
      </div>
    );
  }
  return <Badge tone="danger">Rejected</Badge>;
}

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  iconBg,
}: {
  label: string;
  value: number | undefined;
  hint: string;
  icon: ReactNode;
  /** Text color classes, e.g. "text-amber-600 dark:text-amber-400". */
  accent: string;
  iconBg: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-subtle">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBg, accent)}>{icon}</span>
      </div>
      <p className={cn('mt-2 font-display text-2xl font-bold', accent)}>
        {value ?? '—'}
      </p>
      <p className="mt-1 text-[11.5px] text-subtle">{hint}</p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export function AllMessagesPage() {
  const table = useTableState(8);
  const [statusFilter, setStatusFilter] = useState<MessageQueueFilter>('all');
  const [channelFilter, setChannelFilter] = useState<MessageChannel | 'all'>('all');
  const searchTerm = useDebouncedValue(table.query.trim());

  const {
    data: listResult,
    error: listError,
    isLoading,
    isFetching,
    refetch,
  } = useGetMessagesQuery(
    { filter: statusFilter, channel: channelFilter, page: table.page, limit: table.pageSize, searchTerm: searchTerm || undefined },
    { pollingInterval: 60_000, refetchOnFocus: true },
  );
  const { data: stats } = useGetMessageStatsQuery(undefined, { pollingInterval: 60_000, refetchOnFocus: true });
  const [reviewMessage, { isLoading: reviewing }] = useReviewMessageMutation();
  const [deleteMessage, { isLoading: deleting }] = useDeleteMessageMutation();

  // Modals
  const [rejectingMsg, setRejectingMsg] = useState<MessageRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [customRejectionNote, setCustomRejectionNote] = useState('');
  const [viewingMsg, setViewingMsg] = useState<MessageRecord | null>(null);
  const [deletingMsg, setDeletingMsg] = useState<MessageRecord | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const messages = useMemo(() => listResult?.data ?? [], [listResult?.data]);
  const meta = listResult?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const safePage = Math.min(table.page, totalPages);
  const total = meta?.total ?? 0;

  // Jump back if the current page emptied out (e.g. after approving the last row).
  const { page: currentPage, setPage } = table;
  useEffect(() => {
    if (meta && currentPage > totalPages) setPage(totalPages);
  }, [meta, currentPage, setPage, totalPages]);

  const resetFilters = () => {
    table.setQuery('');
    setStatusFilter('all');
    setChannelFilter('all');
  };

  const handleApprove = async (msg: MessageRecord) => {
    setActingId(msg._id);
    try {
      const { record, message } = await reviewMessage({ id: msg._id, body: { status: 'approved' } }).unwrap();
      if (record?.status === 'delivered') toast.success(message ?? 'Message approved and sent.');
      else toast.warning(message ?? 'Message approved, but delivery did not complete.');
      setViewingMsg((current) => (current?._id === msg._id ? null : current));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setActingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingMsg) return;
    const finalReason = customRejectionNote.trim()
      ? `${rejectionReason} (${customRejectionNote.trim()})`
      : rejectionReason;
    try {
      await reviewMessage({
        id: rejectingMsg._id,
        body: { status: 'rejected', rejectionReason: finalReason.slice(0, 500) },
      }).unwrap();
      toast.success('Message rejected. The package credit was returned to the user.');
      setRejectingMsg(null);
      setCustomRejectionNote('');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMsg) return;
    try {
      await deleteMessage(deletingMsg._id).unwrap();
      toast.success('Message record deleted.');
      setDeletingMsg(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="All Messages & Moderation Queue"
        description="Every message a user sends is held here for review. Approving sends it immediately; rejecting returns the user's package credit. Messages not reviewed within 3 days are approved and sent automatically."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending Review"
          value={stats?.pending}
          hint="Auto-sent after 3 days"
          icon={<ClockIcon className="h-4 w-4" />}
          iconBg="bg-amber-500/10"
          accent="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Delivered"
          value={stats?.delivered}
          hint="Approved and sent"
          icon={<SendIcon className="h-4 w-4" />}
          iconBg="bg-sky-500/10"
          accent="text-sky-600 dark:text-sky-400"
        />
        <StatCard
          label="Delivery Failed"
          value={stats?.failed}
          hint="Retry or reject to refund credit"
          icon={<AlertTriangleIcon className="h-4 w-4" />}
          iconBg="bg-orange-500/10"
          accent="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          label="Rejected"
          value={stats?.rejected}
          hint="Credit returned to user"
          icon={<XCircleIcon className="h-4 w-4" />}
          iconBg="bg-rose-500/10"
          accent="text-rose-600 dark:text-rose-400"
        />
      </div>

      <Card>
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <SearchInput
            value={table.query}
            onChange={table.setQuery}
            placeholder="Search recipient or message note..."
            className="w-full sm:w-80"
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[170px]">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as MessageQueueFilter);
                  table.setPage(1);
                }}
                aria-label="Filter by status"
                className="h-9 text-[13px]"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending Review</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Delivery failed</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>

            <div className="w-[140px]">
              <Select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value as MessageChannel | 'all');
                  table.setPage(1);
                }}
                aria-label="Filter by channel"
                className="h-9 text-[13px]"
              >
                <option value="all">All channels</option>
                <option value="sms">SMS text</option>
                <option value="email">Email</option>
              </Select>
            </div>

            <p className="ml-auto text-xs text-subtle">
              {total} of {stats?.total ?? total} messages
              {isFetching && !isLoading ? ' · Updating…' : ''}
            </p>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} columns={7} />
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
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<MessageSquareIcon className="h-4 w-4" />}
            title="No messages match your filters"
            description="Try adjusting your search criteria or resetting filters."
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
                  <Th>Sender</Th>
                  <Th>Recipient & Channel</Th>
                  <Th>Topic</Th>
                  <Th>Message Note</Th>
                  <Th>Status</Th>
                  <Th>Submitted</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => {
                  const busy = actingId === msg._id;
                  return (
                    <tr
                      key={msg._id}
                      className={cn(
                        'transition-colors duration-150 ease-calm hover:bg-canvas/70',
                        msg.status === 'pending' && 'bg-amber-500/[0.03]',
                        isDeliveryFailed(msg) && 'bg-orange-500/[0.04]',
                      )}
                    >
                      <Td>
                        <div className="space-y-0.5">
                          <span className="font-medium text-ink text-[13.5px]">{senderName(msg)}</span>
                          <p className="text-[11px] text-subtle">{msg.sender?.email}</p>
                        </div>
                      </Td>

                      <Td>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-wider',
                                msg.channel === 'sms'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                              )}
                            >
                              {msg.channel === 'sms' ? (
                                <>
                                  <PhoneIcon className="h-2.5 w-2.5" /> SMS
                                </>
                              ) : (
                                <>
                                  <MailIcon className="h-2.5 w-2.5" /> Email
                                </>
                              )}
                            </span>
                            <span className="font-medium text-xs text-ink">{recipientContact(msg)}</span>
                          </div>
                          {msg.recipientName ? (
                            <p className="text-[11px] text-subtle">For: {msg.recipientName}</p>
                          ) : null}
                        </div>
                      </Td>

                      <Td>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-ink line-clamp-1">{msg.topic?.name ?? '—'}</p>
                          {msg.topic?.tone ? <ToneBadge tone={msg.topic.tone} /> : null}
                        </div>
                      </Td>

                      <Td className="max-w-[260px]">
                        <button type="button" onClick={() => setViewingMsg(msg)} className="text-left group">
                          <p className="text-xs text-body line-clamp-2 leading-relaxed group-hover:text-ink transition-colors">
                            {msg.customNote ? `“${msg.customNote}”` : <span className="italic text-subtle">No personal note</span>}
                          </p>
                          <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10.5px] text-primary font-medium group-hover:underline">
                            View details <ChevronRightIcon className="h-3 w-3" />
                          </span>
                        </button>
                      </Td>

                      <Td>
                        <StatusBadge msg={msg} />
                      </Td>

                      <Td className="whitespace-nowrap text-[12px] text-subtle">{relativeTime(msg.submittedAt)}</Td>

                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          {canApprove(msg) ? (
                            <Tooltip label={isDeliveryFailed(msg) ? 'Retry delivery' : 'Approve and send'}>
                              <button
                                onClick={() => handleApprove(msg)}
                                disabled={reviewing}
                                aria-label={isDeliveryFailed(msg) ? 'Retry delivery' : 'Approve message'}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                              >
                                {busy ? (
                                  <RotateCwIcon className="h-4 w-4 animate-spin" />
                                ) : isDeliveryFailed(msg) ? (
                                  <RotateCwIcon className="h-4 w-4" />
                                ) : (
                                  <CheckIcon className="h-4 w-4" />
                                )}
                              </button>
                            </Tooltip>
                          ) : null}

                          {canReject(msg) ? (
                            <Tooltip label="Reject and return credit">
                              <button
                                onClick={() => setRejectingMsg(msg)}
                                disabled={reviewing}
                                aria-label="Reject message"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                              >
                                <XIcon className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          ) : null}

                          <Tooltip label="View message details">
                            <button
                              onClick={() => setViewingMsg(msg)}
                              aria-label="View message details"
                              className="rounded-md p-1.5 text-body transition-colors hover:bg-primary-tint hover:text-primary"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </Tooltip>

                          {canDelete(msg) ? (
                            <Tooltip label="Delete message record">
                              <button
                                onClick={() => setDeletingMsg(msg)}
                                aria-label="Delete message"
                                className="rounded-md p-1.5 text-body transition-colors hover:bg-danger-bg hover:text-danger"
                              >
                                <Trash2Icon className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
                          ) : null}
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

      {/* Reject Modal */}
      <Modal
        open={Boolean(rejectingMsg)}
        onClose={() => setRejectingMsg(null)}
        title="Reject message"
        description={
          rejectingMsg
            ? `This message to ${recipientContact(rejectingMsg)} will not be sent, and ${senderName(rejectingMsg)}'s package credit will be returned.`
            : ''
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectingMsg(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRejectConfirm} disabled={reviewing}>
              {reviewing ? 'Rejecting…' : 'Confirm Rejection'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pt-1">
          <div>
            <Label htmlFor="rej-category">Rejection Reason</Label>
            <Select id="rej-category" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}>
              {REJECTION_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason.replace(/\.$/, '')}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="rej-notes" hint="(Optional)">
              Additional note to the user
            </Label>
            <Textarea
              id="rej-notes"
              rows={3}
              maxLength={300}
              value={customRejectionNote}
              onChange={(e) => setCustomRejectionNote(e.target.value)}
              placeholder="Add specific context..."
            />
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        open={Boolean(viewingMsg)}
        onClose={() => setViewingMsg(null)}
        title="Message review"
        description={
          viewingMsg ? `ID: ${viewingMsg._id} · Submitted ${new Date(viewingMsg.submittedAt).toLocaleString()}` : ''
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {viewingMsg && canApprove(viewingMsg) ? (
                <Button size="sm" onClick={() => handleApprove(viewingMsg)} disabled={reviewing}>
                  {isDeliveryFailed(viewingMsg) ? (
                    <>
                      <RotateCwIcon className="h-3.5 w-3.5" /> Retry delivery
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-3.5 w-3.5" /> Approve & send
                    </>
                  )}
                </Button>
              ) : null}
              {viewingMsg && canReject(viewingMsg) ? (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={reviewing}
                  onClick={() => {
                    const toReject = viewingMsg;
                    setViewingMsg(null);
                    setRejectingMsg(toReject);
                  }}
                >
                  <XIcon className="h-3.5 w-3.5" /> Reject
                </Button>
              ) : null}
            </div>
            <Button variant="secondary" onClick={() => setViewingMsg(null)}>
              Close
            </Button>
          </div>
        }
      >
        {viewingMsg ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-line bg-canvas/60 p-3">
                <p className="font-semibold text-subtle uppercase text-[10px] tracking-wider">Sender</p>
                <p className="mt-1 font-bold text-ink">{senderName(viewingMsg)}</p>
                {viewingMsg.sender?.email ? <p className="text-body">{viewingMsg.sender.email}</p> : null}
                {viewingMsg.sender?.phone ? <p className="text-subtle">{viewingMsg.sender.phone}</p> : null}
              </div>
              <div className="rounded-xl border border-line bg-canvas/60 p-3">
                <p className="font-semibold text-subtle uppercase text-[10px] tracking-wider">Recipient</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="font-bold text-ink break-all">{recipientContact(viewingMsg)}</span>
                  <span className="rounded bg-primary-tint px-1.5 text-[10px] font-bold text-primary uppercase">
                    {viewingMsg.channel}
                  </span>
                </div>
                {viewingMsg.recipientName ? <p className="text-body">{viewingMsg.recipientName}</p> : null}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-tint text-primary">
                  <LayersIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-ink">{viewingMsg.topic?.name ?? 'Topic unavailable'}</p>
                  {viewingMsg.articles?.length ? (
                    <p className="text-subtle text-[11px]">
                      {viewingMsg.articles.length} attached resource{viewingMsg.articles.length === 1 ? '' : 's'}
                    </p>
                  ) : null}
                </div>
              </div>
              {viewingMsg.topic?.tone ? <ToneBadge tone={viewingMsg.topic.tone} /> : null}
            </div>

            <div className="rounded-2xl border border-line bg-canvas/80 p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-subtle">
                Personal note ({viewingMsg.channel.toUpperCase()})
              </span>
              <div className="rounded-xl bg-surface border border-line p-3.5 text-xs space-y-2 shadow-xs">
                <p className="font-medium text-ink leading-relaxed whitespace-pre-wrap">
                  {viewingMsg.customNote || <span className="italic text-subtle">No personal note</span>}
                </p>
                {viewingMsg.articles?.length ? (
                  <ul className="pt-2 border-t border-line/60 space-y-1 text-[11px] text-primary">
                    {viewingMsg.articles.map((article) => (
                      <li key={article._id} className="underline">
                        {article.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            {viewingMsg.status === 'pending' && viewingMsg.autoApproveAt ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <TimerIcon className="h-3.5 w-3.5" /> Awaiting review
                </p>
                <p className="mt-1">
                  Will be approved and sent automatically {relativeTime(viewingMsg.autoApproveAt)} (
                  {new Date(viewingMsg.autoApproveAt).toLocaleString()}).
                </p>
              </div>
            ) : null}

            {isDeliveryFailed(viewingMsg) ? (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-800 dark:text-orange-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangleIcon className="h-3.5 w-3.5" /> Delivery failed
                </p>
                <p className="mt-1">
                  {viewingMsg.deliveryError || 'The delivery provider did not accept the message.'} Retry, or reject to
                  return the user's credit.
                </p>
              </div>
            ) : null}

            {viewingMsg.status === 'rejected' && viewingMsg.rejectionReason ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircleIcon className="h-3.5 w-3.5" /> Rejection reason
                </p>
                <p className="mt-1">{viewingMsg.rejectionReason}</p>
              </div>
            ) : null}

            {viewingMsg.status === 'delivered' ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2Icon className="h-3.5 w-3.5" />
                  {viewingMsg.autoApproved ? 'Auto-approved after 3 days and sent' : 'Approved by admin and sent'}
                </p>
                {viewingMsg.sentAt ? (
                  <p className="mt-0.5 text-[11px] opacity-80">Sent: {new Date(viewingMsg.sentAt).toLocaleString()}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={Boolean(deletingMsg)}
        onClose={() => setDeletingMsg(null)}
        title="Delete message record?"
        description={deletingMsg ? `Message from ${senderName(deletingMsg)} will be removed from this list.` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingMsg(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete Record'}
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-body">
          Only delivered or rejected messages can be deleted. This does not affect the user's package credit.
        </p>
      </Modal>
    </div>
  );
}
