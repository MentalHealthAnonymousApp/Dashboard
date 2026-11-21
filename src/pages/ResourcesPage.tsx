import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileTextIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  EyeIcon,
  LayersIcon,
  ClockIcon,
  SparklesIcon,
} from 'lucide-react';
import type { IArticleResource, ResourceRecord } from '../types';
import { useGetTopicsQuery } from '../redux/api/topicApi';
import { useDeleteResourceMutation, useGetResourcesQuery } from '../redux/api/resourceApi';
import { Card, SectionTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Field';
import { Pagination, SearchInput, TableShell, Td, Th } from '../components/ui/Table';
import { EmptyState, TableSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Sheet';
import { Tooltip } from '../components/ui/Tooltip';
import { useTableState } from '../hooks/useTableState';
import { relativeTime } from '../utils/format';

function mapResource(resource: ResourceRecord): IArticleResource {
  const topicId = typeof resource.topic === 'string' ? resource.topic : resource.topic?._id;
  const topicName = typeof resource.topic === 'string' ? undefined : resource.topic?.name;
  return {
    id: resource._id,
    topicId: topicId || '',
    topicName,
    title: resource.title,
    shortDescription: resource.shortDescription,
    contentHtml: resource.contentHtml,
    readingTime: resource.readingTime,
    featuredImage: resource.featuredImage,
    status: resource.status,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    return error.data.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'error' in error.data &&
    typeof error.data.error === 'string'
  ) {
    return error.data.error;
  }
  return 'The request failed. Please try again.';
}

export function ResourcesPage() {
  const navigate = useNavigate();
  const table = useTableState(8);

  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'published' | 'draft' | 'all'>('all');

  const [previewResource, setPreviewResource] = useState<IArticleResource | null>(null);
  const [deletingResource, setDeletingResource] = useState<IArticleResource | null>(null);

  const resourceParams = {
    page: table.page,
    limit: table.pageSize,
    searchTerm: table.query.trim() || undefined,
    topic: topicFilter === 'all' ? undefined : topicFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  };
  const {
    data: resourcesResult,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetResourcesQuery(resourceParams);
  const { data: topicResult, isError: topicsError } = useGetTopicsQuery({
    page: 1,
    limit: 100,
  });
  const { data: publishedResult } = useGetResourcesQuery({
    page: 1,
    limit: 1,
    status: 'published',
  });
  const { data: allResult } = useGetResourcesQuery({ page: 1, limit: 1 });
  const [deleteResource, { isLoading: isDeleting }] = useDeleteResourceMutation();
  const adminTopics = useMemo(
    () =>
      (topicResult?.data ?? []).map((topic) => ({
        id: topic._id,
        name: topic.name,
      })),
    [topicResult?.data],
  );
  const articleResources = useMemo(
    () => (resourcesResult?.data ?? []).map(mapResource),
    [resourcesResult?.data],
  );
  const publishedCount = publishedResult?.meta.total;
  const totalCount = resourcesResult?.meta.total ?? 0;
  const pageMeta = resourcesResult?.meta;
  const totalPages = Math.max(1, pageMeta?.totalPages ?? 1);
  const safePage = Math.min(table.page, totalPages);
  const page = {
    safePage,
    totalPages,
    from: pageMeta?.total ? (safePage - 1) * table.pageSize + 1 : 0,
    to: Math.min(safePage * table.pageSize, pageMeta?.total ?? 0),
    total: pageMeta?.total ?? 0,
  };

  const currentPage = table.page;
  const setTablePage = table.setPage;
  const dataTotalPages = pageMeta?.totalPages;
  useEffect(() => {
    if (dataTotalPages !== undefined && currentPage > dataTotalPages) {
      setTablePage(Math.max(1, dataTotalPages));
    }
  }, [dataTotalPages, currentPage, setTablePage]);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Resource & Article Management"
        description={`${publishedCount ?? '—'} published articles, ${
          allResult && publishedCount !== undefined
            ? allResult.meta.total - publishedCount
            : '—'
        } in draft. Create, edit, and curate full-text articles and guides using the Jodit editor.`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/topics')}>
              <LayersIcon className="h-4 w-4" />
              Manage Topics
            </Button>
            <Button onClick={() => navigate('/resources/new')}>
              <PlusIcon className="h-4 w-4" />
              Create New Resource
            </Button>
          </div>
        }
      />

      <Card>
        {/* Filters Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <SearchInput
            value={table.query}
            onChange={table.setQuery}
            placeholder="Search article title or keywords…"
            className="w-full sm:w-80"
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[180px]">
              <Select
                value={topicFilter}
                onChange={(e) => {
                  setTopicFilter(e.target.value);
                  table.setPage(1);
                }}
                aria-label="Filter by topic"
                className="h-9 text-[13px]"
              >
                <option value="all">All Topics</option>
                {adminTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-[140px]">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'published' | 'draft' | 'all');
                  table.setPage(1);
                }}
                aria-label="Filter by status"
                className="h-9 text-[13px]"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </Select>
            </div>

            <p className="text-xs text-subtle ml-auto">
              {resourcesResult?.data.length ?? 0} of {totalCount} articles
              {isFetching && !isLoading ? ' · Updating…' : ''}
            </p>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : error || topicsError ? (
          <EmptyState
            icon={<FileTextIcon className="h-4 w-4" />}
            title="Unable to load resources"
            description={error ? getErrorMessage(error) : 'Unable to load topics for resource filters.'}
            action={
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            }
          />
        ) : articleResources.length === 0 ? (
          <EmptyState
            icon={<FileTextIcon className="h-4 w-4" />}
            title="No resources match your filters"
            description="Create your first article guide using the Jodit editor or adjust your search filter."
            action={
              <Button onClick={() => navigate('/resources/new')}>
                <PlusIcon className="h-4 w-4" />
                Create New Resource
              </Button>
            }
          />
        ) : (
          <>
            <TableShell>
              <thead>
                <tr>
                  <Th>Article / Resource Title</Th>
                  <Th>Assigned Topic</Th>
                  <Th>Read Time</Th>
                  <Th>Status</Th>
                  <Th>Updated</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {articleResources.map((res) => {
                  const topic = adminTopics.find((t) => t.id === res.topicId);
                  const isPublished = res.status === 'published';

                  return (
                    <tr
                      key={res.id}
                      className="transition-colors duration-150 ease-calm hover:bg-canvas/70"
                    >
                      <Td className="max-w-[360px]">
                        <div className="space-y-1">
                          <p className="line-clamp-1 text-[13.5px] font-semibold text-ink">
                            {res.title}
                          </p>
                          {res.shortDescription ? (
                            <p className="line-clamp-2 text-[12px] leading-relaxed text-body">
                              {res.shortDescription}
                            </p>
                          ) : null}
                        </div>
                      </Td>

                      <Td>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-tint px-3 py-1 text-xs font-semibold text-primary">
                          <SparklesIcon className="h-3 w-3" />
                          {res.topicName || topic?.name || 'Unassigned'}
                        </span>
                      </Td>

                      <Td>
                        <span className="inline-flex items-center gap-1 text-xs text-body">
                          <ClockIcon className="h-3 w-3 text-subtle" />
                          {res.readingTime || 5} min
                        </span>
                      </Td>

                      <Td>
                        <Badge tone={isPublished ? 'success' : 'warning'}>
                          {isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </Td>

                      <Td className="whitespace-nowrap text-[12.5px] text-subtle">
                        {relativeTime(res.updatedAt)}
                      </Td>

                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip label="Preview HTML Article">
                            <button
                              onClick={() => setPreviewResource(res)}
                              aria-label={`Preview ${res.title}`}
                              className="rounded-md p-1.5 text-body transition-colors hover:bg-primary-tint hover:text-primary"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </Tooltip>

                          <Tooltip label="Edit in Jodit Editor">
                            <button
                              onClick={() => navigate(`/resources/edit/${res.id}`)}
                              aria-label={`Edit ${res.title}`}
                              className="rounded-md p-1.5 text-body transition-colors hover:bg-primary-tint hover:text-primary"
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>

                          <Tooltip label="Delete Resource">
                            <button
                              onClick={() => setDeletingResource(res)}
                              aria-label={`Delete ${res.title}`}
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
              page={page.safePage}
              totalPages={page.totalPages}
              from={page.from}
              to={page.to}
              total={page.total}
              onPage={table.setPage}
              unit="resources"
            />
          </>
        )}
      </Card>

      {/* Resource HTML Preview Modal */}
      {previewResource && (
        <Modal
          open={Boolean(previewResource)}
          onClose={() => setPreviewResource(null)}
          title={previewResource.title}
          description={`Topic: ${previewResource.topicName || 'General'} · ${previewResource.readingTime || 5} min read`}
        >
          <div className="space-y-4 pt-2">
            {previewResource.shortDescription && (
              <p className="rounded-xl border border-line bg-canvas p-3 text-xs leading-relaxed text-body italic">
                {previewResource.shortDescription}
              </p>
            )}

            <div
              className="max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-surface p-6 text-sm text-ink space-y-3"
              dangerouslySetInnerHTML={{ __html: previewResource.contentHtml || '<p>No content written yet.</p>' }}
            />

            <div className="flex justify-end pt-2">
              <Button onClick={() => setPreviewResource(null)}>Close Preview</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deletingResource)}
        onClose={() => setDeletingResource(null)}
        title="Delete this resource article?"
        description={
          deletingResource ? `Are you sure you want to delete “${deletingResource.title}”?` : ''
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingResource(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!deletingResource) return;
                try {
                  await deleteResource(deletingResource.id).unwrap();
                  toast.success(`“${deletingResource.title}” deleted`);
                  setDeletingResource(null);
                } catch (deleteError) {
                  toast.error(`Could not delete the resource: ${getErrorMessage(deleteError)}`);
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete Resource'}
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-body">
          This article will be removed immediately from the public library.
        </p>
      </Modal>
    </div>
  );
}
