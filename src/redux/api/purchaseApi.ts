import { baseApi } from './baseApi';
import type {
  ApiResponse,
  ConsultationEmailPayload,
  ConsultationFilter,
  PackageTierKey,
  PurchaseListResponse,
  PurchaseRecord,
  PurchaseStats,
} from '../../types';

export interface PurchaseListParams {
  packageTier: PackageTierKey | 'all';
  consultation: ConsultationFilter;
  page: number;
  limit: number;
  searchTerm?: string;
}

export const purchaseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPurchases: builder.query<PurchaseListResponse, PurchaseListParams>({
      query: ({ packageTier, consultation, page, limit, searchTerm }) => ({
        url: 'package-purchase/admin',
        params: {
          page,
          limit,
          ...(packageTier !== 'all' ? { packageTier } : {}),
          ...(consultation !== 'all' ? { consultation } : {}),
          ...(searchTerm ? { searchTerm } : {}),
        },
      }),
      providesTags: [{ type: 'Purchase', id: 'LIST' }],
    }),
    getPurchaseStats: builder.query<PurchaseStats, void>({
      query: () => 'package-purchase/admin/stats',
      transformResponse: (response: ApiResponse<PurchaseStats>) => response.data,
      providesTags: [{ type: 'Purchase', id: 'STATS' }],
    }),
    sendConsultationEmail: builder.mutation<PurchaseRecord, { id: string; body: ConsultationEmailPayload }>({
      query: ({ id, body }) => ({
        url: `package-purchase/admin/${encodeURIComponent(id)}/consultation`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiResponse<PurchaseRecord>) => response.data,
      invalidatesTags: [
        { type: 'Purchase', id: 'LIST' },
        { type: 'Purchase', id: 'STATS' },
      ],
    }),
  }),
});

export const { useGetPurchasesQuery, useGetPurchaseStatsQuery, useSendConsultationEmailMutation } = purchaseApi;
