import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SaveIcon, FileTextIcon, ScaleIcon } from 'lucide-react';
import { Card, SectionTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { JoditRichText } from '../components/ui/JoditRichText';
import { dateTime } from '../utils/format';
import {
  useAddTermsConditionsMutation,
  useGetTermsConditionsQuery,
  useUpdateTermsConditionsMutation,
} from '../redux/api/manageWebApi';

export function TermsPage() {
  const { data: doc, isLoading, error, refetch } = useGetTermsConditionsQuery();
  const [addTermsConditions, { isLoading: isAdding }] = useAddTermsConditionsMutation();
  const [updateTermsConditions, { isLoading: isUpdating }] =
    useUpdateTermsConditionsMutation();
  const [draftHtml, setDraftHtml] = useState('');
  const isSaving = isAdding || isUpdating;

  useEffect(() => {
    if (doc) setDraftHtml(doc.description);
  }, [doc]);

  const dirty = draftHtml !== (doc?.description ?? '');

  const publish = async () => {
    try {
      if (doc) {
        await updateTermsConditions({ id: doc._id, description: draftHtml }).unwrap();
      } else {
        await addTermsConditions({ description: draftHtml }).unwrap();
      }
      toast.success('Terms of Service published to mobile app & web');
    } catch (saveError) {
      toast.error(`Could not publish the terms: ${getErrorMessage(saveError)}`);
    }
  };

  if (isLoading) {
    return <Card className="p-6 text-sm text-subtle">Loading terms and conditions…</Card>;
  }

  if (error) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-sm text-danger">
          Could not load the terms and conditions: {getErrorMessage(error)}
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Terms of Service & Clinical Boundary Agreement"
        description="Defines educational boundaries, emergency limitations, and non-medical liability agreements governing all distributed resources."
        action={
          <div className="flex items-center gap-2">
            <Button onClick={() => void publish()} disabled={!dirty || isSaving || !draftHtml.trim()}>
              <SaveIcon className="h-4 w-4" />
              {isSaving ? 'Publishing…' : dirty ? 'Publish Changes' : 'Up to Date'}
            </Button>
          </div>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-tint text-primary">
              <ScaleIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ink">Terms of Service Document</h3>
              <p className="text-xs text-body">
                {doc
                  ? 'Terms displayed to users in the app and on the website.'
                  : 'No terms are saved yet. Add the document content below to publish it.'}
              </p>
            </div>
          </div>
          <Badge tone={dirty ? 'warning' : 'neutral'}>
            {dirty ? 'Unpublished edits' : doc ? `Last updated ${dateTime(doc.updatedAt)}` : 'Not published'}
          </Badge>
        </div>

        <JoditRichText
          value={draftHtml}
          height={480}
          placeholder="Draft the terms of service..."
          onChange={setDraftHtml}
        />

        <p className="text-[11.5px] text-subtle">
          Jodit output is sanitized semantic HTML, compatible with mobile app renderers.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
            <FileTextIcon className="h-4 w-4 text-primary" />
            Educational Non-Medical Notice
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-body">
            All packets and content sent via this platform are educational materials designed to support communication and do not constitute doctor-patient relationships or formal psychiatric diagnoses.
          </p>
        </Card>

        <Card className="p-5">
          <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
            <ScaleIcon className="h-4 w-4 text-primary" />
            Legal Review Cadence
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-body">
            Terms of Service are reviewed quarterly by healthcare compliance counsel to align with evolving digital health regulations and state telehealth boundaries.
          </p>
        </Card>
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
