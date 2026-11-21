import type { Channel, ReportReasonCategory, ReportStatus } from './index';
import type { ToneKey } from './topic';

export interface ReportRecord {
  _id: string;
  messageId?: { _id: string; customNote?: string; channel: Channel; sentAt?: string; status: string } | null;
  reportedUserId?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    isBlocked?: boolean;
    status?: string;
  } | null;
  reportedPersonName: string;
  reportedPersonContact: string;
  reportedByContact: string;
  reportedByChannel: Channel;
  topicTitle: string;
  tone?: ToneKey;
  reasonCategory: ReportReasonCategory;
  reasonText: string;
  status: ReportStatus;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ReportStats {
  total: number;
  new: number;
  resolved: number;
  blockedSenders: number;
}

export interface AdminProfileRecord {
  _id: string;
  name: string;
  email: string;
  profile_image?: string;
  user?: { _id: string; email: string; role: string };
}
