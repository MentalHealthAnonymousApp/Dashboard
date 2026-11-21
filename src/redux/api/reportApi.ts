import { baseApi } from './baseApi';
import type {
  ApiResponse,
  Channel,
  Paginated,
  ReportReasonCategory,
  ReportRecord,
  ReportStats,
  ReportStatus,
} from '../../types';

export interface ReportListParams {
  status: ReportStatus | 'all';
  reasonCategory: ReportReasonCategory | 'all';
  channel: Channel | 'all';
  page: number;
  limit: number;
  searchTerm?: string;
}

export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReports: builder.query<Paginated<ReportRecord>, ReportListParams>({
      query: ({ status, reasonCategory, channel, page, limit, searchTerm }) => ({
        url: 'report',
        params: {
          page,
          limit,
          ...(status !== 'all' ? { status } : {}),
          ...(reasonCategory !== 'all' ? { reasonCategory } : {}),
          ...(channel !== 'all' ? { channel } : {}),
          ...(searchTerm ? { searchTerm } : {}),
        },
      }),
      providesTags: [{ type: 'Report', id: 'LIST' }],
    }),
    getReportStats: builder.query<ReportStats, void>({
      query: () => 'report/stats',
      transformResponse: (response: ApiResponse<ReportStats>) => response.data,
      providesTags: [{ type: 'Report', id: 'STATS' }],
    }),
    resolveReport: builder.mutation<ReportRecord, { id: string; resolutionNotes?: string }>({
      query: ({ id, resolutionNotes }) => ({
        url: `report/${encodeURIComponent(id)}/resolve`,
        method: 'PATCH',
        body: resolutionNotes ? { resolutionNotes } : {},
      }),
      transformResponse: (response: ApiResponse<ReportRecord>) => response.data,
      invalidatesTags: [
        { type: 'Report', id: 'LIST' },
        { type: 'Report', id: 'STATS' },
        { type: 'User', id: 'LIST' },
      ],
    }),
    blockReportedSender: builder.mutation<{ message?: string }, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `report/${encodeURIComponent(id)}/block-sender`,
        method: 'PATCH',
        body: reason ? { reason } : {},
      }),
      transformResponse: (response: ApiResponse<unknown>) => ({ message: response.message }),
      invalidatesTags: [
        { type: 'Report', id: 'LIST' },
        { type: 'Report', id: 'STATS' },
        { type: 'User', id: 'LIST' },
        { type: 'User', id: 'STATS' },
        { type: 'Message', id: 'LIST' },
        { type: 'Message', id: 'STATS' },
      ],
    }),
  }),
});

export const {
  useGetReportsQuery,
  useGetReportStatsQuery,
  useResolveReportMutation,
  useBlockReportedSenderMutation,
} = reportApi;
