import { baseApi } from './baseApi';
import type {
  ApiResponse,
  CommunityModerationResponse,
  CommunityPostModerationPayload,
  CommunityPostRecord,
} from '../../types';

export interface CommunityModerationParams {
  status: string;
  page: number;
  limit: number;
  searchTerm?: string;
}

export const communityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommunityModerationPosts: builder.query<
      CommunityModerationResponse,
      CommunityModerationParams
    >({
      query: (params) => ({
        url: 'community/moderation',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ _id }) => ({
                type: 'CommunityPost' as const,
                id: _id,
              })),
              { type: 'CommunityPost' as const, id: 'LIST' },
            ]
          : [{ type: 'CommunityPost' as const, id: 'LIST' }],
    }),
    moderateCommunityPost: builder.mutation<
      CommunityPostRecord,
      { id: string; body: CommunityPostModerationPayload }
    >({
      query: ({ id, body }) => ({
        url: `community/${encodeURIComponent(id)}/moderation`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiResponse<CommunityPostRecord>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'CommunityPost', id },
        { type: 'CommunityPost', id: 'LIST' },
      ],
    }),
    deleteCommunityPost: builder.mutation<CommunityPostRecord, string>({
      query: (id) => ({
        url: `community/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<CommunityPostRecord>) => response.data,
      invalidatesTags: (_result, _error, id) => [
        { type: 'CommunityPost', id },
        { type: 'CommunityPost', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCommunityModerationPostsQuery,
  useLazyGetCommunityModerationPostsQuery,
  useModerateCommunityPostMutation,
  useDeleteCommunityPostMutation,
} = communityApi;
