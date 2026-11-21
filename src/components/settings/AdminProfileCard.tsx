import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheckIcon } from 'lucide-react';
import { useGetMyProfileQuery, useUpdateMyProfileMutation } from '../../redux/api/profileApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input, Label } from '../ui/Field';

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function AdminProfileCard() {
  const { data: profile, isLoading, error: loadError, refetch } = useGetMyProfileQuery();
  const [updateProfile, { isLoading: saving }] = useUpdateMyProfileMutation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setName(profile.name ?? '');
  }, [profile]);

  const dirty = Boolean(profile) && name.trim() !== (profile?.name ?? '');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    setError(null);
    try {
      await updateProfile({ name: name.trim() }).unwrap();
      toast.success('Admin profile updated');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader
        title="Admin information"
        description="Your name as shown across the admin console."
        action={
          <Badge tone="primary">
            <ShieldCheckIcon className="h-3 w-3" />
            Super Admin
          </Badge>
        }
      />

      {isLoading ? (
        <div className="space-y-3 p-5" aria-busy="true">
          <div className="h-12 w-48 animate-pulse rounded-lg bg-canvas" />
          <div className="h-10 animate-pulse rounded-lg bg-canvas" />
        </div>
      ) : loadError ? (
        <div className="space-y-3 p-5 text-[13px] text-body">
          <p className="text-danger">{getApiErrorMessage(loadError, 'Could not load your profile.')}</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            {profile?.profile_image ? (
              <img src={profile.profile_image} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-tint text-[15px] font-semibold text-primary">
                {initialsOf(profile?.name || profile?.email || 'A')}
              </span>
            )}
            <div>
              <p className="text-[14px] font-medium text-ink">{profile?.name}</p>
              <p className="text-[12.5px] text-body">{profile?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="profile-name">Full name</Label>
              <Input id="profile-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="profile-email">Sign-in email</Label>
              <Input id="profile-email" type="email" value={profile?.email ?? ''} disabled readOnly />
            </div>
          </div>

          {error ? <p className="text-[12px] text-danger">{error}</p> : null}

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[11.5px] text-subtle">The sign-in email can't be changed here.</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setName(profile?.name ?? '');
                  setError(null);
                }}
                disabled={!dirty || saving}
              >
                Reset
              </Button>
              <Button type="submit" disabled={!dirty || saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Card>
  );
}
