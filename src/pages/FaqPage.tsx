import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  HelpCircleIcon,
  PlusIcon,
  Trash2Icon,
  ChevronDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SaveIcon,
  SearchIcon,
  MessageSquareIcon,
} from 'lucide-react';
import {
  useAddFaqMutation,
  useDeleteFaqMutation,
  useGetFaqsQuery,
  useUpdateFaqMutation,
} from '../redux/api/manageWebApi';
import { SectionTitle, Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Label, Textarea } from '../components/ui/Field';
import { cn } from '../utils/cn';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export function FaqPage() {
  const { data: savedFaqs, isLoading, error, refetch } = useGetFaqsQuery();
  const [addFaqRequest] = useAddFaqMutation();
  const [updateFaqRequest] = useUpdateFaqMutation();
  const [deleteFaqRequest] = useDeleteFaqMutation();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [originalFaqs, setOriginalFaqs] = useState<FaqItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [openPreviewIds, setOpenPreviewIds] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!savedFaqs || dirty) return;
    const mapped = savedFaqs.map((faq) => ({
      id: faq._id,
      question: faq.question,
      answer: faq.answer,
    }));
    setFaqs(mapped);
    setOriginalFaqs(mapped);
    setOpenPreviewIds((current) =>
      mapped.length && Object.keys(current).length === 0
        ? { [mapped[0].id]: true }
        : current,
    );
    setDirty(false);
  }, [savedFaqs, dirty]);

  const updateFaq = (index: number, patch: Partial<FaqItem>) => {
    setFaqs((prev) => {
      const next = prev.map((item, i) => (i === index ? { ...item, ...patch } : item));
      return next;
    });
    setDirty(true);
  };

  const addFaq = () => {
    const newId = `new-${Date.now()}`;
    setFaqs((prev) => [
      ...prev,
      {
        id: newId,
        question: '',
        answer: '',
      },
    ]);
    setDirty(true);
    setOpenPreviewIds((prev) => ({ ...prev, [newId]: true }));
  };

  const removeFaq = (index: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFaqs((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
    setDirty(true);
  };

  const moveDown = (index: number) => {
    if (index === faqs.length - 1) return;
    setFaqs((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (faqs.some((faq) => !faq.question.trim() || !faq.answer.trim())) {
      toast.error('Each FAQ must have both a question and an answer.');
      return;
    }

    setIsSaving(true);
    const workingFaqs = [...faqs];
    let workingOriginal = [...originalFaqs];
    let savedCount = 0;

    try {
      const currentIds = new Set(workingFaqs.map((faq) => faq.id));
      for (const original of [...workingOriginal]) {
        if (!currentIds.has(original.id)) {
          await deleteFaqRequest(original.id).unwrap();
          workingOriginal = workingOriginal.filter((faq) => faq.id !== original.id);
          savedCount += 1;
        }
      }

      for (let index = 0; index < workingFaqs.length; index += 1) {
        const faq = workingFaqs[index];
        const body = {
          question: faq.question.trim(),
          answer: faq.answer.trim(),
          order: index,
        };
        if (faq.id.startsWith('new-')) {
          const created = await addFaqRequest(body).unwrap();
          const createdFaq = { id: created._id, question: created.question, answer: created.answer };
          workingFaqs[index] = createdFaq;
          workingOriginal.push(createdFaq);
          savedCount += 1;
          setFaqs([...workingFaqs]);
          continue;
        }

        const original = workingOriginal.find((item) => item.id === faq.id);
        const orderChanged =
          original !== undefined &&
          workingOriginal.findIndex((item) => item.id === faq.id) !== index;
        if (
          !original ||
          original.question !== body.question ||
          original.answer !== body.answer ||
          orderChanged
        ) {
          const updated = await updateFaqRequest({ id: faq.id, body }).unwrap();
          const updatedFaq = { id: updated._id, question: updated.question, answer: updated.answer };
          workingOriginal = workingOriginal.map((item) =>
            item.id === updatedFaq.id ? updatedFaq : item,
          );
          savedCount += 1;
        }
      }

      await refetch().unwrap();
      setFaqs(workingFaqs);
      setOriginalFaqs(workingFaqs);
      setDirty(false);
      toast.success('Frequently Asked Questions published successfully.');
    } catch (saveError) {
      setFaqs(workingFaqs);
      setOriginalFaqs(workingOriginal);
      setDirty(true);
      toast.error(
        savedCount
          ? `${savedCount} FAQ change(s) were saved, but another failed: ${getErrorMessage(saveError)}`
          : `Could not save FAQs: ${getErrorMessage(saveError)}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const togglePreview = (id: string) => {
    setOpenPreviewIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFaqs = faqs.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
  });

  if (isLoading) {
    return <Card className="p-6 text-sm text-subtle">Loading FAQs…</Card>;
  }

  if (error) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-sm text-danger">Could not load FAQs: {getErrorMessage(error)}</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Frequently Asked Questions (FAQ)"
        description="Add, edit, and organize questions and answers displayed in the mobile app help center and web knowledge base."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={addFaq} disabled={isSaving}>
              <PlusIcon className="h-4 w-4" />
              Add Question
            </Button>
            <Button onClick={() => void handleSave()} disabled={!dirty || isSaving}>
              <SaveIcon className="h-4 w-4" />
              {isSaving ? 'Saving…' : dirty ? 'Save & Publish' : 'Saved'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Pure Question & Answer Editor (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions or answers..."
                className="w-full rounded-xl border border-line bg-canvas pl-9 pr-3 py-2 text-xs text-ink placeholder:text-subtle focus:border-primary focus:outline-hidden"
              />
            </div>
            <span className="text-xs text-subtle font-medium">
              {faqs.length} {faqs.length === 1 ? 'Question' : 'Questions'}
            </span>
          </div>

          <div className="space-y-3.5">
            {filteredFaqs.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquareIcon className="mx-auto h-8 w-8 text-subtle" />
                <p className="mt-2 text-sm font-semibold text-ink">
                  {faqs.length ? 'No questions found' : 'No FAQs have been added'}
                </p>
                <p className="text-xs text-subtle mt-1">Try a different search term or add a new question.</p>
                <Button size="sm" variant="secondary" onClick={addFaq} className="mt-4" disabled={isSaving}>
                  <PlusIcon className="h-3.5 w-3.5" /> Add Question
                </Button>
              </Card>
            ) : (
              filteredFaqs.map((item) => {
                const originalIndex = faqs.findIndex((f) => f.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:border-primary/40"
                  >
                    <div className="flex items-center justify-between border-b border-line pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary-tint text-[11px] font-bold text-primary font-mono">
                          Q{originalIndex + 1}
                        </span>
                        <span className="text-xs font-semibold text-ink">Question Item</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveUp(originalIndex)}
                          disabled={originalIndex === 0 || isSaving}
                          className="rounded-lg p-1.5 text-subtle hover:bg-canvas hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
                          title="Move up"
                        >
                          <ArrowUpIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(originalIndex)}
                          disabled={originalIndex === faqs.length - 1 || isSaving}
                          className="rounded-lg p-1.5 text-subtle hover:bg-canvas hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
                          title="Move down"
                        >
                          <ArrowDownIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFaq(originalIndex)}
                          disabled={isSaving}
                          className="rounded-lg p-1.5 text-subtle hover:bg-danger-bg hover:text-danger ml-1"
                          title="Delete question"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`q-${item.id}`}>Question</Label>
                        <Input
                          id={`q-${item.id}`}
                          value={item.question}
                          onChange={(e) => updateFaq(originalIndex, { question: e.target.value })}
                          disabled={isSaving}
                          placeholder="e.g. Will the recipient know who sent this?"
                          className="text-xs font-medium"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`a-${item.id}`}>Answer</Label>
                        <Textarea
                          id={`a-${item.id}`}
                          rows={3}
                          value={item.answer}
                          onChange={(e) => updateFaq(originalIndex, { answer: e.target.value })}
                          disabled={isSaving}
                          placeholder="Clear, helpful, and empathetic answer..."
                          className="text-xs leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {filteredFaqs.length > 0 && (
            <Button variant="secondary" onClick={addFaq} className="w-full py-2.5" disabled={isSaving}>
              <PlusIcon className="h-4 w-4" />
              Add Another Question
            </Button>
          )}
        </div>

        {/* Right Column: Live Interactive Accordion Preview (5 Cols, Sticky) */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Accordion Preview</span>
            </h3>
            <span className="text-[11px] font-mono text-subtle">Mobile View</span>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-primary border-b border-line pb-3">
              <HelpCircleIcon className="h-4 w-4" />
              <span className="font-display text-sm font-bold text-ink">Help Center & FAQ</span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {faqs.map((faq, idx) => {
                const isOpen = Boolean(openPreviewIds[faq.id]);
                const displayQuestion = faq.question.trim() || `Untitled Question #${idx + 1}`;
                const displayAnswer = faq.answer.trim() || 'No answer entered yet.';

                return (
                  <div key={faq.id} className="overflow-hidden rounded-xl border border-line bg-canvas/70 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => togglePreview(faq.id)}
                      className="flex w-full items-center justify-between gap-3 p-3.5 text-left font-medium text-ink hover:bg-surface transition-colors"
                    >
                      <span className="text-xs font-semibold leading-snug">{displayQuestion}</span>
                      <ChevronDownIcon
                        className={cn(
                          'h-4 w-4 shrink-0 text-subtle transition-transform duration-200',
                          isOpen ? 'rotate-180 text-primary' : ''
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-line/60 bg-surface/50 p-3.5 text-xs leading-relaxed text-body">
                        {displayAnswer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  ) return error.data.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) return error.message;
  return 'Please try again.';
}
