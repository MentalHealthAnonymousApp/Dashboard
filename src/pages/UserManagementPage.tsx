import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  UsersIcon,
  ShieldCheckIcon,
  BanIcon,
  EyeIcon,
  MailIcon,
  PhoneIcon,
  SendIcon,
  AlertTriangleIcon,
  UnlockIcon,
  Trash2Icon,
  AlertCircleIcon,
} from 'lucide-react';
import type { AdminUserRecord } from '../types';
import {
  useDeleteAdminUserMutation,
  useGetAdminUserStatsQuery,
  useGetAdminUsersQuery,
  useSetUserBlockedMutation,
} from '../redux/api/adminUserApi';
import { Card, SectionTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Label, Select } from '../components/ui/Field';
import { Pagination, SearchInput, TableShell, Td, Th } from '../components/ui/Table';
import { EmptyState, TableSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Sheet';
import { Tooltip } from '../components/ui/Tooltip';
import { useTableState } from '../hooks/useTableState';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../utils/apiError';
import { relativeTime } from '../utils/format';
import { cn } from '../utils/cn';

type StatusFilter = 'all' | 'active' | 'blocked';

const displayName = (user: AdminUserRecord) =>
  user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

const initialsOf = (user: AdminUserRecord) =>
  displayName(user)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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

export function UserManagementPage() {
  const table = useTableState(10);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const searchTerm = useDebouncedValue(table.query.trim());

  const { data: listResult, isLoading, isFetching, error: listError, refetch } = useGetAdminUsersQuery(
    { status: statusFilter, page: table.page, limit: table.pageSize, searchTerm: searchTerm || undefined },
    { refetchOnFocus: true },
  );
  const { data: stats } = useGetAdminUserStatsQuery(undefined, { refetchOnFocus: true });
  const [setUserBlocked, { isLoading: blocking }] = useSetUserBlockedMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteAdminUserMutation();

  const [blockingUser, setBlockingUser] = useState<AdminUserRecord | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [viewingUser, setViewingUser] = useState<AdminUserRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUserRecord | null>(null);

  const users = listResult?.data ?? [];
  const meta = listResult?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const safePage = Math.min(table.page, totalPages);
  const total = meta?.total ?? 0;

  const { page: currentPage, setPage } = table;
  useEffect(() => {
    if (meta && currentPage > totalPages) setPage(totalPages);
  }, [meta, currentPage, setPage, totalPages]);

  const handleToggleBlockConfirm = async () => {
    if (!blockingUser) return;
    const block = !blockingUser.isBlocked;
    try {
      const result = await setUserBlocked({
        id: blockingUser._id,
        blocked: block,
        reason: block ? blockReason.trim() || undefined : undefined,
      }).unwrap();
      if (block) toast.warning(result.message ?? `${displayName(blockingUser)} has been blocked.`);
      else toast.success(result.message ?? `${displayName(blockingUser)} has been unblocked.`);
      setBlockingUser(null);
      setBlockReason('');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    try {
      await deleteUser(deletingUser._id).unwrap();
      toast.success(`${displayName(deletingUser)} was deleted.`);
      setDeletingUser(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="User Management"
        description="Registered sender accounts, their message activity and reports. Blocking signs the user out of the apps and rejects any messages still waiting for review."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats?.total}
          hint={stats ? `${stats.newThisMonth} joined in the last 30 days` : 'Registered accounts'}
          icon={<UsersIcon className="h-4 w-4" />}
          iconBg="bg-primary-tint"
          accent="text-ink"
        />
        <StatCard
          label="Active Users"
          value={stats?.active}
          hint="In good standing"
          icon={<ShieldCheckIcon className="h-4 w-4" />}
          iconBg="bg-emerald-500/10"
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Blocked Senders"
          value={stats?.blocked}
          hint="Access restricted"
          icon={<BanIcon className="h-4 w-4" />}
          iconBg="bg-rose-500/10"
          accent="text-rose-600 dark:text-rose-400"
        />
        <StatCard
          label="Messages Delivered"
          value={stats?.messagesDelivered}
          hint="Across SMS & Email"
          icon={<SendIcon className="h-4 w-4" />}
          iconBg="bg-sky-500/10"
          accent="text-ink"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <SearchInput
            value={table.query}
            onChange={table.setQuery}
            placeholder="Search by name, email, or phone..."
            className="w-full sm:w-80"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[140px]">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter);
                  table.setPage(1);
                }}
                aria-label="Filter by status"
                className="h-9 text-[13px]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="blocked">Blocked only</option>
              </Select>
            </div>
            <p className="ml-auto text-xs text-subtle">
              {total} of {stats?.total ?? total} users{isFetching && !isLoading ? ' · Updating…' : ''}
            </p>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} columns={7} />
        ) : listError ? (
          <EmptyState
            icon={<AlertCircleIcon className="h-4 w-4" />}
            title="Could not load users"
            description={getApiErrorMessage(listError)}
            action={
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-4 w-4" />}
            title="No users match your criteria"
            description="Try changing the search query or status filter."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  table.setQuery('');
                  setStatusFilter('all');
                }}
              >
                Reset filters
              </Button>
            }
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>User</Th>
                  <Th>Contact</Th>
                  <Th align="center">Messages Sent</Th>
                  <Th align="center">Reports</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                  <Th align="right">Actions / Access</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isBlocked = user.isBlocked;
                  return (
                    <tr
                      key={user._id}
                      className={cn('transition-colors duration-150 ease-calm hover:bg-canvas/70', isBlocked && 'bg-rose-500/[0.02]')}
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold shadow-xs',
                              isBlocked
                                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                : 'bg-primary-tint text-primary border border-primary/20',
                            )}
                          >
                            {initialsOf(user)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-medium text-ink">{displayName(user)}</p>
                            {user.pendingMessagesCount > 0 ? (
                              <p className="text-[10.5px] text-amber-600">{user.pendingMessagesCount} message(s) awaiting review</p>
                            ) : null}
                          </div>
                        </div>
                      </Td>

                      <Td>
                        <div className="space-y-0.5 text-xs">
                          <div className="flex items-center gap-1.5 text-ink">
                            <MailIcon className="h-3 w-3 text-subtle" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone ? (
                            <div className="flex items-center gap-1.5 text-subtle">
                              <PhoneIcon className="h-3 w-3" />
                              <span>{user.phone}</span>
                            </div>
                          ) : null}
                        </div>
                      </Td>

                      <Td align="center">
                        <span className="inline-flex items-center gap-1 font-mono text-[13px] font-semibold text-ink">
                          <SendIcon className="h-3 w-3 text-subtle" />
                          {user.messagesSentCount}
                        </span>
                      </Td>

                      <Td align="center">
                        {user.reportsReceivedCount > 0 ? (
                          <Tooltip label={`${user.openReportsCount} open · ${user.reportsReceivedCount - user.openReportsCount} resolved`}>
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[11.5px] font-bold text-rose-600 dark:text-rose-400">
                              <AlertTriangleIcon className="h-3 w-3" />
                              {user.reportsReceivedCount}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-subtle">0</span>
                        )}
                      </Td>

                      <Td>
                        <Badge tone={isBlocked ? 'danger' : 'success'}>{isBlocked ? 'Blocked' : 'Active'}</Badge>
                      </Td>

                      <Td className="whitespace-nowrap text-[12.5px] text-subtle">{relativeTime(user.createdAt)}</Td>

                      <Td align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant={isBlocked ? 'secondary' : 'danger'}
                            size="sm"
                            onClick={() => {
                              setBlockingUser(user);
                              setBlockReason('');
                            }}
                            className="h-8 px-2.5 text-xs font-semibold"
                          >
                            {isBlocked ? (
                              <>
                                <UnlockIcon className="h-3.5 w-3.5" />
                                <span>Unblock</span>
                              </>
                            ) : (
                              <>
                                <BanIcon className="h-3.5 w-3.5" />
                                <span>Block</span>
                              </>
                            )}
                          </Button>
                          <Tooltip label="View user profile">
                            <button
                              onClick={() => setViewingUser(user)}
                              aria-label={`View details for ${displayName(user)}`}
                              className="rounded-md p-1.5 text-body transition-colors hover:bg-primary-tint hover:text-primary"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Delete user account">
                            <button
                              onClick={() => setDeletingUser(user)}
                              aria-label={`Delete ${displayName(user)}`}
                              className="rounded-md p-1.5 text-body transition-colors hover:bg-danger-bg hover:text-danger"
                            >
                              <Trash2Icon className="h-3.5 w-3.5" />
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
              unit="users"
            />
          </>
        )}
      </Card>

      {/* Block / Unblock */}
      <Modal
        open={Boolean(blockingUser)}
        onClose={() => setBlockingUser(null)}
        title={blockingUser ? `${blockingUser.isBlocked ? 'Unblock' : 'Block'} ${displayName(blockingUser)}?` : ''}
        description={
          blockingUser?.isBlocked
            ? 'This user will be able to sign in and send messages again.'
            : 'The user will be signed out and unable to sign in or send messages. Any of their messages still waiting for review will be rejected.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setBlockingUser(null)}>
              Cancel
            </Button>
            <Button variant={blockingUser?.isBlocked ? 'primary' : 'danger'} onClick={handleToggleBlockConfirm} disabled={blocking}>
              {blocking ? 'Saving…' : blockingUser?.isBlocked ? 'Confirm Unblock' : 'Confirm Block User'}
            </Button>
          </>
        }
      >
        {blockingUser && !blockingUser.isBlocked ? (
          <div className="space-y-2 pt-2">
            <Label htmlFor="block-reason" hint="(Optional)">
              Reason for blocking
            </Label>
            <Input
              id="block-reason"
              maxLength={500}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g. Abusive language, multiple recipient complaints..."
            />
            {blockingUser.pendingMessagesCount > 0 ? (
              <p className="text-[12px] text-amber-700 dark:text-amber-400">
                {blockingUser.pendingMessagesCount} pending message(s) will be rejected.
              </p>
            ) : null}
          </div>
        ) : blockingUser ? (
          <div className="rounded-lg border border-line bg-canvas/60 p-3 text-xs text-body">
            <p className="font-semibold text-ink">Block note:</p>
            <p className="mt-1 italic">{blockingUser.blockedReason || 'No reason specified.'}</p>
          </div>
        ) : null}
      </Modal>

      {/* Details */}
      <Modal
        open={Boolean(viewingUser)}
        onClose={() => setViewingUser(null)}
        title={viewingUser ? displayName(viewingUser) : 'User details'}
        description={viewingUser ? `ID: ${viewingUser._id} · Joined ${new Date(viewingUser.createdAt).toLocaleDateString()}` : ''}
        footer={
          <div className="flex items-center justify-between w-full">
            {viewingUser ? (
              <Button
                variant={viewingUser.isBlocked ? 'secondary' : 'danger'}
                size="sm"
                onClick={() => {
                  setBlockingUser(viewingUser);
                  setViewingUser(null);
                }}
              >
                {viewingUser.isBlocked ? 'Unblock User' : 'Block User'}
              </Button>
            ) : (
              <span />
            )}
            <Button variant="secondary" onClick={() => setViewingUser(null)}>
              Close
            </Button>
          </div>
        }
      >
        {viewingUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas/60 p-3.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-tint font-mono text-base font-bold text-primary">
                {initialsOf(viewingUser)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display text-base font-bold text-ink">{displayName(viewingUser)}</p>
                  <Badge tone={viewingUser.isBlocked ? 'danger' : 'success'}>{viewingUser.isBlocked ? 'blocked' : 'active'}</Badge>
                </div>
                <p className="text-xs text-body">
                  {viewingUser.email}
                  {viewingUser.phone ? ` · ${viewingUser.phone}` : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-line bg-surface p-3">
                <p className="text-subtle">Messages delivered</p>
                <p className="mt-1 font-semibold text-ink">{viewingUser.messagesSentCount}</p>
              </div>
              <div className="rounded-lg border border-line bg-surface p-3">
                <p className="text-subtle">Awaiting review</p>
                <p className="mt-1 font-semibold text-ink">{viewingUser.pendingMessagesCount}</p>
              </div>
              <div className="rounded-lg border border-line bg-surface p-3">
                <p className="text-subtle">Reports received</p>
                <p className={cn('mt-1 font-semibold', viewingUser.reportsReceivedCount > 0 ? 'text-rose-600' : 'text-ink')}>
                  {viewingUser.reportsReceivedCount} ({viewingUser.openReportsCount} open)
                </p>
              </div>
              <div className="rounded-lg border border-line bg-surface p-3">
                <p className="text-subtle">Last active</p>
                <p className="mt-1 font-semibold text-ink">
                  {viewingUser.lastActiveAt ? relativeTime(viewingUser.lastActiveAt) : '—'}
                </p>
              </div>
            </div>

            {viewingUser.isBlocked ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-300">
                <p className="font-semibold">Blocked {viewingUser.blockedAt ? relativeTime(viewingUser.blockedAt) : ''}</p>
                <p className="mt-1">{viewingUser.blockedReason || 'No reason specified.'}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Delete */}
      <Modal
        open={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        title="Delete user account?"
        description={deletingUser ? `${displayName(deletingUser)} (${deletingUser.email}) will no longer be able to sign in.` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete User'}
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-body">
          The account is deactivated and removed from this list. Their purchase and report history is kept for records, and any
          messages awaiting review are rejected.
        </p>
      </Modal>
    </div>
  );
}
