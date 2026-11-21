export type CommunityPostApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs_update';

export interface CommunityPostAuthor {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  profile_image?: string;
}

export interface CommunityPostRecord {
  _id: string;
  title: string;
  content: string;
  category: string;
  image?: string;
  likesCount: number;
  repliesCount: number;
  status: CommunityPostApprovalStatus;
  feedback?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  author?: CommunityPostAuthor | string;
}

export interface CommunityModerationResponse {
  success: boolean;
  message?: string;
  data: CommunityPostRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type CommunityPostModerationPayload =
  | { status: 'approved' }
  | { status: 'needs_update'; feedback: string }
  | { status: 'rejected'; rejectionReason: string };
