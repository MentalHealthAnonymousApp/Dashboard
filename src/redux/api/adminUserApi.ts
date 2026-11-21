import { baseApi } from './baseApi';
import type { AdminUserRecord, AdminUserStats, ApiResponse, Paginated } from '../../types';

export interface AdminUserListParams {
  status: 'all' | 'active' | 'blocked';
  page: number;
  limit: number;
  searchTerm?: string;
}

// Blocking/deleting a user rejects their pending messages and changes report counters too.
const AFFECTED_BY_USER_CHANGE = [
  { type: 'User' as const, id: 'LIST' },
  { type: 'User' as const, id: 'STATS' },
  { type: 'Message' as const, id: 'LIST' },
  { type: 'Message' as const, id: 'STATS' },
  { type: 'Report' as const, id: 'LIST' },
  { type: 'Report' as const, id: 'STATS' },
];

export const adminUserApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminUsers: builder.query<Paginated<AdminUserRecord>, AdminUserListParams>({
      query: ({ status, page, limit, searchTerm }) => ({
        url: 'normal-user',
        params: { page, limit, ...(status !== 'all' ? { status } : {}), ...(searchTerm ? { searchTerm } : {}) },
      }),
      providesTags: [{ type: 'User', id: 'LIST' }],
    }),
    getAdminUserStats: builder.query<AdminUserStats, void>({
      query: () => 'normal-user/stats',
      transformResponse: (response: ApiResponse<AdminUserStats>) => response.data,
      providesTags: [{ type: 'User', id: 'STATS' }],
    }),
    setUserBlocked: builder.mutation<
      { message?: string },
      { id: string; blocked: boolean; reason?: string }
    >({
      query: ({ id, blocked, reason }) => ({
        url: `normal-user/${encodeURIComponent(id)}/block`,
        method: 'PATCH',
        body: { blocked, ...(reason ? { reason } : {}) },
      }),
      transformResponse: (response: ApiResponse<unknown>) => ({ message: response.message }),
      invalidatesTags: AFFECTED_BY_USER_CHANGE,
    }),
    deleteAdminUser: builder.mutation<void, string>({
      query: (id) => ({ url: `normal-user/${encodeURIComponent(id)}`, method: 'DELETE' }),
      invalidatesTags: AFFECTED_BY_USER_CHANGE,
    }),
  }),
});

export const {
  useGetAdminUsersQuery,
  useGetAdminUserStatsQuery,
  useSetUserBlockedMutation,
  useDeleteAdminUserMutation,
} = adminUserApi;
