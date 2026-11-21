import { baseApi } from './baseApi';
import type { AdminProfileRecord, ApiResponse } from '../../types';

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyProfile: builder.query<AdminProfileRecord, void>({
      query: () => 'user/get-my-profile',
      transformResponse: (response: ApiResponse<AdminProfileRecord>) => response.data,
      providesTags: [{ type: 'Settings', id: 'PROFILE' }],
    }),
    updateMyProfile: builder.mutation<AdminProfileRecord, { name: string }>({
      query: (body) => ({ url: 'user/update-profile', method: 'PATCH', body }),
      transformResponse: (response: ApiResponse<AdminProfileRecord>) => response.data,
      invalidatesTags: [{ type: 'Settings', id: 'PROFILE' }],
    }),
  }),
});

export const { useGetMyProfileQuery, useUpdateMyProfileMutation } = profileApi;
