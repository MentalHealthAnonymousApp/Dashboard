import type { ApiResponse } from './api';
import type { IArticleResource } from './index';

export interface ResourceTopicReference {
  _id: string;
  name: string;
}

export interface ResourceRecord {
  _id: string;
  topic: ResourceTopicReference | string | null;
  title: string;
  slug?: string;
  shortDescription: string;
  contentHtml: string;
  readingTime: number;
  featuredImage?: string;
  isFeatured?: boolean;
  status: IArticleResource['status'];
  createdAt: string;
  updatedAt: string;
}

export interface ResourceListResponse extends ApiResponse<ResourceRecord[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ResourceListResult {
  data: ResourceRecord[];
  meta: ResourceListResponse['meta'];
}

export interface ResourceListParams {
  page: number;
  limit: number;
  searchTerm?: string;
  topic?: string;
  status?: IArticleResource['status'];
}

export interface ResourcePayload {
  topic: string;
  title: string;
  shortDescription: string;
  contentHtml: string;
  readingTime: number;
  featuredImage?: string;
  isFeatured?: boolean;
  status: IArticleResource['status'];
}

export type ResourceApiResponse = ApiResponse<ResourceRecord>;
