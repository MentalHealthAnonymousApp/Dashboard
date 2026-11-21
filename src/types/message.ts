import type { ToneKey } from './topic';

export type MessageStatus = 'pending' | 'approved' | 'rejected' | 'delivered';
export type MessageDeliveryStatus = 'queued' | 'delivered' | 'failed';
export type MessageChannel = 'sms' | 'email';

/** Dashboard filter: 'failed' = approved but delivery failed (needs retry or reject). */
export type MessageQueueFilter = 'all' | 'pending' | 'delivered' | 'failed' | 'rejected';

export interface MessageRecord {
  _id: string;
  sender?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    profile_image?: string;
  } | null;
  maskedRecipient: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientRelationship?: string;
  channel: MessageChannel;
  topic?: { _id: string; name: string; slug?: string; tone?: ToneKey } | null;
  customNote?: string;
  articles?: { _id: string; title: string; slug?: string }[];
  submittedAt: string;
  status: MessageStatus;
  deliveryStatus: MessageDeliveryStatus;
  rejectionReason?: string;
  deliveryError?: string;
  approvedAt?: string;
  autoApproveAt?: string;
  autoApproved?: boolean;
  sentAt?: string;
  createdAt: string;
}

export interface MessageStats {
  total: number;
  pending: number;
  approved: number;
  delivered: number;
  rejected: number;
  failed: number;
}

export interface MessageListResponse {
  success: boolean;
  message?: string;
  meta: { page: number; limit: number; total: number; totalPages: number };
  data: MessageRecord[];
}

export interface MessageReviewPayload {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}
