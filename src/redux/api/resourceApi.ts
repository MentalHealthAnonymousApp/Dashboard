import { baseApi } from './baseApi';
import type {
  ApiResponse,
  ResourceApiResponse,
  ResourceListParams,
  ResourceListResponse,
  ResourceListResult,
  ResourcePayload,
  ResourceRecord,
} from '../../types';

export const resourceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getResources: builder.query<ResourceListResult, ResourceListParams>({
      query: (params) => ({
        url: 'resource/admin',
        params,
      }),
      transformResponse: (response: ResourceListResponse) => ({
        data: response.data,
        meta: response.meta,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Resource' as const, id: _id })),
              { type: 'Resource' as const, id: 'LIST' },
            ]
          : [{ type: 'Resource' as const, id: 'LIST' }],
    }),
    getResource: builder.query<ResourceRecord, string>({
      query: (id) => `resource/admin/${encodeURIComponent(id)}`,
      transformResponse: (response: ResourceApiResponse) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Resource', id }],
    }),
    createResource: builder.mutation<ResourceRecord, ResourcePayload>({
      query: (body) => ({
        url: 'resource',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ResourceApiResponse) => response.data,
      invalidatesTags: [{ type: 'Resource', id: 'LIST' }],
    }),
    updateResource: builder.mutation<
      ResourceRecord,
      { id: string; body: Partial<ResourcePayload> }
    >({
      query: ({ id, body }) => ({
        url: `resource/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ResourceApiResponse) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Resource', id },
        { type: 'Resource', id: 'LIST' },
      ],
    }),
    deleteResource: builder.mutation<ResourceRecord, string>({
      query: (id) => ({
        url: `resource/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<ResourceRecord>) => response.data,
      invalidatesTags: (_result, _error, id) => [
        { type: 'Resource', id },
        { type: 'Resource', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetResourcesQuery,
  useGetResourceQuery,
  useCreateResourceMutation,
  useUpdateResourceMutation,
  useDeleteResourceMutation,
} = resourceApi;
