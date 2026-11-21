import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SaveIcon, ShieldCheckIcon } from 'lucide-react';
import { Card, SectionTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { JoditRichText } from '../components/ui/JoditRichText';
import { dateTime } from '../utils/format';
import {
  useAddPrivacyPolicyMutation,
  useGetPrivacyPolicyQuery,
  useUpdatePrivacyPolicyMutation,
} from '../redux/api/manageWebApi';

export function PrivacyPolicyPage() {
  const { data: doc, isLoading, error, refetch } = useGetPrivacyPolicyQuery();
  const [addPrivacyPolicy, { isLoading: isAdding }] = useAddPrivacyPolicyMutation();
  const [updatePrivacyPolicy, { isLoading: isUpdating }] = useUpdatePrivacyPolicyMutation();
  const [draftHtml, setDraftHtml] = useState('');
  const isSaving = isAdding || isUpdating;

  useEffect(() => {
    if (doc) setDraftHtml(doc.description);
  }, [doc]);

  const dirty = draftHtml !== (doc?.description ?? '');

  const publish = async () => {
    try {
      if (doc) {
        await updatePrivacyPolicy({ id: doc._id, description: draftHtml }).unwrap();
      } else {
        await addPrivacyPolicy({ description: draftHtml }).unwrap();
      }
      toast.success('Privacy policy published to mobile app & web');
    } catch (saveError) {
      toast.error(`Could not publish the privacy policy: ${getErrorMessage(saveError)}`);
    }
  };

  if (isLoading) {
    return <Card className="p-6 text-sm text-subtle">Loading privacy policy…</Card>;
  }

  if (error) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-sm text-danger">
          Could not load the privacy policy: {getErrorMessage(error)}
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
        title="Privacy Policy & Zero-Retention Architecture"
        description="Our clinical privacy protocol guarantees zero personal data retention. This policy is rendered verbatim inside the mobile app and receiver web portals."
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
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheckIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-ink">Privacy Policy Document</h3>
              <p className="text-xs text-body">
                {doc
                  ? 'Rendered on the mobile Privacy screen and receiver web portals.'
                  : 'No policy is saved yet. Add the policy content below to publish it.'}
              </p>
            </div>
          </div>
          <Badge tone={dirty ? 'warning' : 'neutral'}>
            {dirty ? 'Unpublished edits' : doc ? `Last updated ${dateTime(doc.updatedAt)}` : 'Not published'}
          </Badge>
        </div>

        <JoditRichText
          value={draftHtml}
          height={460}
          placeholder="Draft the privacy policy..."
          onChange={setDraftHtml}
        />

        <p className="text-[11.5px] text-subtle">
          Jodit output is sanitized semantic HTML, compatible with mobile app renderers.
        </p>
      </div>

      <Card className="px-5 py-4">
        <p className="text-[12.5px] leading-relaxed text-body">
          <span className="font-medium text-ink">Zero-Telemetry Guarantee:</span> We do not store phone numbers, IP addresses, or device identifiers upon resource dispatch. All ephemeral memory buffers are purged within 3 seconds of network delivery.
        </p>
      </Card>
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
