import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  SaveIcon,
  EyeIcon,
  SparklesIcon,
  LayersIcon,
} from 'lucide-react';
import type { ResourcePayload, ResourceRecord } from '../types';
import { useGetTopicsQuery } from '../redux/api/topicApi';
import {
  useCreateResourceMutation,
  useGetResourceQuery,
  useUpdateResourceMutation,
} from '../redux/api/resourceApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Field';
import { JoditRichText } from '../components/ui/JoditRichText';
import { Modal } from '../components/ui/Sheet';

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

function getResourceTopicId(resource: ResourceRecord): string {
  return typeof resource.topic === 'string' ? resource.topic : resource.topic?._id ?? '';
}

export function ResourceEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const preselectedTopicId = searchParams.get('topicId');

  const isEditing = Boolean(id);
  const {
    data: existingResource,
    isLoading: isLoadingResource,
    error: resourceError,
  } = useGetResourceQuery(id ?? '', { skip: !id });
  const {
    data: topicResult,
    isLoading: isLoadingTopics,
    error: topicsError,
  } = useGetTopicsQuery({ page: 1, limit: 100 });
  const adminTopics = useMemo(() => topicResult?.data ?? [], [topicResult?.data]);
  const [createResource, { isLoading: isCreating }] = useCreateResourceMutation();
  const [updateResource, { isLoading: isUpdating }] = useUpdateResourceMutation();
  const isSaving = isCreating || isUpdating;

  // Form State
  const [topicId, setTopicId] = useState<string>(
    preselectedTopicId || ''
  );
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [contentHtml, setContentHtml] = useState(
    `
<h2>Overview</h2>
<p>Write an empathetic, evidence-based introduction describing this condition and how it affects everyday life.</p>

<h2>What is Happening in the Body</h2>
<p>Explain the physiological and nervous system mechanisms behind the symptoms.</p>

<h2>Evidence-Based Coping Strategies</h2>
<ol>
  <li><strong>First Coping Tool:</strong> Practical steps to regain calm.</li>
  <li><strong>Second Coping Tool:</strong> Daily grounding practice.</li>
</ol>
      `.trim()
  );
  const [readingTime, setReadingTime] = useState<number>(7);
  const [status, setStatus] = useState<'published' | 'draft'>('published');

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    if (existingResource) {
      setTopicId(getResourceTopicId(existingResource));
      setTitle(existingResource.title);
      setShortDescription(existingResource.shortDescription || '');
      setContentHtml(existingResource.contentHtml || '');
      setReadingTime(existingResource.readingTime || 7);
      setStatus(existingResource.status);
    }
  }, [existingResource]);

  useEffect(() => {
    if (!isEditing && !topicId && adminTopics.length > 0) {
      setTopicId(preselectedTopicId || adminTopics[0]._id);
    }
  }, [adminTopics, isEditing, preselectedTopicId, topicId]);

  const selectedTopic = adminTopics.find((topic) => topic._id === topicId);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!topicId) {
      toast.error('Please select a topic for this resource.');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a title for the resource article.');
      return;
    }
    if (!contentHtml.trim()) {
      toast.error('Please write some content in the Jodit editor.');
      return;
    }

    const payload: ResourcePayload = {
      topic: topicId,
      title: title.trim(),
      shortDescription: shortDescription.trim(),
      contentHtml,
      readingTime: Math.max(0, Math.round(Number(readingTime) || 5)),
      status,
    };

    try {
      if (isEditing && id) {
        await updateResource({ id, body: payload }).unwrap();
      } else {
        await createResource(payload).unwrap();
      }
      toast.success(
        isEditing ? 'Resource article updated successfully!' : 'New resource article created!',
      );
      navigate('/resources');
    } catch (error) {
      toast.error(`Could not save the resource: ${getErrorMessage(error)}`);
    }
  };

  if (isLoadingResource || isLoadingTopics) {
    return (
      <div className="space-y-6 pb-16">
        <Card className="p-6 text-sm text-subtle">Loading resource details and topics…</Card>
      </div>
    );
  }

  if (resourceError || topicsError) {
    const error = resourceError || topicsError;
    return (
      <div className="space-y-6 pb-16">
        <Card className="space-y-4 p-6">
          <p className="text-sm text-danger">
            {resourceError
              ? `Unable to load this resource: ${getErrorMessage(error)}`
              : `Unable to load topics: ${getErrorMessage(error)}`}
          </p>
          <Button variant="secondary" onClick={() => navigate('/resources')}>
            Back to Resources
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/resources"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-body transition-colors hover:bg-canvas hover:text-ink"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold font-display text-ink">
              {isEditing ? 'Edit Resource Article' : 'Create New Resource Article'}
            </h1>
            <p className="text-xs text-subtle">
              Curate full-text mental health guides with rich HTML typography via the Jodit editor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowPreviewModal(true)}
          >
            <EyeIcon className="h-4 w-4" />
            Live Preview
          </Button>
          <Button type="submit" form="resource-editor-form" disabled={isSaving}>
            <SaveIcon className="h-4 w-4" />
            {isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Publish Resource'}
          </Button>
        </div>
      </div>

      <form
        id="resource-editor-form"
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-6"
      >
        {/* Basic Configuration Details */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
            <LayersIcon className="h-4 w-4 text-primary" />
            <span>1. Topic & Article Information</span>
          </h2>

          <div className="grid gap-5 sm:grid-cols-12">
            {/* Topic Selector */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink">
                Assigned Topic *
              </label>
              <Select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                required
                className="mt-1.5"
                disabled={isLoadingTopics || adminTopics.length === 0}
              >
                <option value="" disabled>
                  {isLoadingTopics ? 'Loading topics…' : 'Select a topic'}
                </option>
                {adminTopics.map((topic) => (
                  <option key={topic._id} value={topic._id}>
                    {topic.name}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[11.5px] text-subtle">
                Choose the topic where this article will be catalogued.
              </p>
            </div>

            {/* Read Time & Status */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink">
                Estimated Read Time
              </label>
              <div className="relative mt-1.5">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={readingTime}
                  onChange={(e) => setReadingTime(Number(e.target.value))}
                  className="pr-12"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-subtle">
                  min
                </span>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink">
                Publish Status
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}
                className="mt-1.5"
              >
                <option value="published">Published (Live)</option>
                <option value="draft">Draft (Hidden)</option>
              </Select>
            </div>

            {/* Title */}
            <div className="sm:col-span-12">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink">
                Article / Resource Title *
              </label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Anxiety & Panic: When Your Body Sounds a False Alarm"
                className="mt-1.5 text-base font-semibold"
              />
            </div>

            {/* Short Description */}
            <div className="sm:col-span-12">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink">
                Short Description & Excerpt *
              </label>
              <Textarea
                rows={2}
                required
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief summary or takeaway describing what this guide helps the reader understand…"
                className="mt-1.5"
              />
            </div>
          </div>
        </Card>

        {/* Jodit Editor Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-primary" />
              <span>2. Main Article Content (Jodit WYSIWYG Editor)</span>
            </h2>
            <span className="text-xs text-subtle">
              Outputs clean, semantic HTML saved to database
            </span>
          </div>

          <div className="rounded-2xl border border-line bg-canvas p-1">
            <JoditRichText
              value={contentHtml}
              onChange={setContentHtml}
              height={700}
              placeholder="Write the full article content here. Format headings, lists, quotes, and links using the toolbar above…"
            />
          </div>

          <p className="mt-3 text-xs text-subtle">
            Tip: You can use the <strong>Source</strong> button on the toolbar to inspect or paste raw HTML code directly.
          </p>
        </Card>

        {/* Bottom Save Action Bar */}
        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
          <Link
            to="/resources"
            className="text-xs font-medium text-subtle hover:text-ink transition-colors"
          >
            ← Discard & return to resources
          </Link>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPreviewModal(true)}
            >
              <EyeIcon className="h-4 w-4" />
              Preview Article
            </Button>
            <Button type="submit" disabled={isSaving}>
              <SaveIcon className="h-4 w-4" />
              {isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Publish Resource'}
            </Button>
          </div>
        </div>
      </form>

      {/* Live HTML Preview Modal */}
      <Modal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={title || 'Untitled Resource'}
        description={`Topic: ${selectedTopic?.name || 'Unassigned'} · ${readingTime} min read`}
      >
        <div className="space-y-4 pt-2">
          {shortDescription && (
            <p className="rounded-xl border border-line bg-canvas p-3.5 text-xs italic leading-relaxed text-body">
              {shortDescription}
            </p>
          )}

          <div
            className="max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-surface p-6 text-sm text-ink space-y-4"
            dangerouslySetInnerHTML={{ __html: contentHtml || '<p>No content written yet.</p>' }}
          />

          <div className="flex justify-end pt-2">
            <Button onClick={() => setShowPreviewModal(false)}>Close Preview</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
