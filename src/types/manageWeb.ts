import type { ApiResponse } from './api';

export interface ManageWebDocument {
  _id: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManageWebFaq {
  _id: string;
  question: string;
  answer: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export type ManageWebDocumentResponse = ApiResponse<ManageWebDocument | null>;
export type ManageWebFaqListResponse = ApiResponse<ManageWebFaq[]>;
export type ManageWebDocumentResult = ManageWebDocument | null;
export interface ManageWebFaqPayload {
  question: string;
  answer: string;
  order: number;
}
