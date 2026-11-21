export interface AdminUserRecord {
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  phone?: string;
  profile_image?: string;
  status: 'active' | 'blocked' | 'suspended';
  isBlocked: boolean;
  blockedAt?: string;
  blockedReason?: string;
  notes?: string;
  lastActiveAt?: string;
  createdAt: string;
  messagesSentCount: number;
  pendingMessagesCount: number;
  reportsReceivedCount: number;
  openReportsCount: number;
}

export interface AdminUserStats {
  total: number;
  active: number;
  blocked: number;
  newThisMonth: number;
  messagesDelivered: number;
}

export interface Paginated<T> {
  success: boolean;
  message?: string;
  meta: { page: number; limit: number; total: number; totalPages: number };
  data: T[];
}
