import { baseApi } from './baseApi';
import type {
  ApiResponse,
  MessageListResponse,
  MessageQueueFilter,
  MessageRecord,
  MessageReviewPayload,
  MessageStats,
  MessageChannel,
} from '../../types';

export interface MessageListParams {
  filter: MessageQueueFilter;
  channel: MessageChannel | 'all';
  page: number;
  limit: number;
  searchTerm?: string;
}

const toQueryParams = ({ filter, channel, page, limit, searchTerm }: MessageListParams) => ({
  page,
  limit,
  ...(filter === 'failed'
    ? { status: 'approved', deliveryStatus: 'failed' }
    : filter !== 'all'
      ? { status: filter }
      : {}),
  ...(channel !== 'all' ? { channel } : {}),
  ...(searchTerm ? { searchTerm } : {}),
});

export const messageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMessages: builder.query<MessageListResponse, MessageListParams>({
      query: (params) => ({ url: 'message', params: toQueryParams(params) }),
      providesTags: [{ type: 'Message', id: 'LIST' }],
    }),
    getMessageStats: builder.query<MessageStats, void>({
      query: () => 'message/stats',
      transformResponse: (response: ApiResponse<MessageStats>) => response.data,
      providesTags: [{ type: 'Message', id: 'STATS' }],
    }),
    reviewMessage: builder.mutation<
      { record: MessageRecord; message?: string },
      { id: string; body: MessageReviewPayload }
    >({
      query: ({ id, body }) => ({
        url: `message/${encodeURIComponent(id)}/status`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiResponse<MessageRecord>) => ({
        record: response.data,
        message: response.message,
      }),
      invalidatesTags: [
        { type: 'Message', id: 'LIST' },
        { type: 'Message', id: 'STATS' },
      ],
    }),
    deleteMessage: builder.mutation<MessageRecord, string>({
      query: (id) => ({ url: `message/${encodeURIComponent(id)}`, method: 'DELETE' }),
      transformResponse: (response: ApiResponse<MessageRecord>) => response.data,
      invalidatesTags: [
        { type: 'Message', id: 'LIST' },
        { type: 'Message', id: 'STATS' },
      ],
    }),
  }),
});

export const {
  useGetMessagesQuery,
  useGetMessageStatsQuery,
  useReviewMessageMutation,
  useDeleteMessageMutation,
} = messageApi;
