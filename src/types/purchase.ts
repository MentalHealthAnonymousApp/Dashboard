import type { PackageTierKey } from './index';

export type PurchaseRecordStatus = 'completed' | 'partially_refunded' | 'refunded' | 'disputed';
export type ConsultationFilter = 'all' | 'pending' | 'sent';

export interface PurchaseRecord {
  _id: string;
  userId?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    profile_image?: string;
  } | null;
  packageTier: PackageTierKey;
  amountMinor: number;
  currency: string;
  billingProvider: 'stripe' | 'apple_app_store' | 'google_play';
  paymentMethod?: string;
  providerTransactionId?: string;
  stripeCheckoutSessionId?: string;
  status: PurchaseRecordStatus;
  fulfillmentStatus: 'pending' | 'fulfilled' | 'failed';
  messageId?: { _id: string; status: string; channel: string; topic?: { _id: string; name: string } | null } | null;
  messageUsedAt?: string;
  paidAt?: string;
  refundedAt?: string;
  refundedAmountMinor?: number;
  consultationLink?: string;
  consultationSent: boolean;
  consultationSentAt?: string;
  consultationNotes?: string;
  createdAt: string;
}

export interface PurchaseListResponse {
  success: boolean;
  message?: string;
  meta: { page: number; limit: number; total: number; totalPages: number };
  data: PurchaseRecord[];
}

export interface PurchaseStats {
  totalCount: number;
  totalRevenueMinor: number;
  currency: string;
  tiers: Record<PackageTierKey, { count: number; revenueMinor: number }>;
  pendingConsultations: number;
}

export interface ConsultationEmailPayload {
  consultationLink: string;
  subject: string;
  message: string;
}
