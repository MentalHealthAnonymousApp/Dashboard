export type SupportStatus = 'TODO' | 'RESOLVED';
export type SupportSource = 'website' | 'app';

export interface SupportTicket {
  _id: string;
  source: SupportSource;
  name?: string;
  email?: string;
  contactReason: string;
  message: string;
  status: SupportStatus;
  adminNote?: string;
  resolvedAt?: string;
  resolvedBy?: { _id: string; name?: string } | null;
  createdAt: string;
}

export interface SupportStats {
  total: number;
  open: number;
  resolved: number;
  lastSevenDays: number;
}
