import { baseApi } from './baseApi';
import type { ApiResponse, Paginated, SupportSource, SupportStats, SupportStatus, SupportTicket } from '../../types';

export interface SupportListParams {
  status: SupportStatus | 'all';
  source: SupportSource | 'all';
  page: number;
  limit: number;
  searchTerm?: string;
}

export const supportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSupportTickets: builder.query<Paginated<SupportTicket>, SupportListParams>({
      query: ({ status, source, page, limit, searchTerm }) => ({
        url: 'support/get-all',
        params: {
          page,
          limit,
          ...(status !== 'all' ? { status } : {}),
          ...(source !== 'all' ? { source } : {}),
          ...(searchTerm ? { searchTerm } : {}),
        },
      }),
      providesTags: [{ type: 'Support', id: 'LIST' }],
    }),
    getSupportStats: builder.query<SupportStats, void>({
      query: () => 'support/stats',
      transformResponse: (response: ApiResponse<SupportStats>) => response.data,
      providesTags: [{ type: 'Support', id: 'STATS' }],
    }),
    updateSupportStatus: builder.mutation<SupportTicket, { id: string; status: SupportStatus; adminNote?: string }>({
      query: ({ id, status, adminNote }) => ({
        url: `support/update-status/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: adminNote !== undefined ? { status, adminNote } : { status },
      }),
      transformResponse: (response: ApiResponse<SupportTicket>) => response.data,
      invalidatesTags: [
        { type: 'Support', id: 'LIST' },
        { type: 'Support', id: 'STATS' },
      ],
    }),
  }),
});

export const { useGetSupportTicketsQuery, useGetSupportStatsQuery, useUpdateSupportStatusMutation } = supportApi;
