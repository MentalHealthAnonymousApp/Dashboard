import { baseApi } from './baseApi';
import type {
  ManageWebDocument,
  ManageWebDocumentResponse,
  ManageWebFaq,
  ManageWebFaqListResponse,
  ManageWebFaqPayload,
} from '../../types';

type LegalDocumentKind = 'privacy' | 'terms';

const documentEndpoints = {
  privacy: {
    get: 'manage/get-privacy-policy',
    add: 'manage/add-privacy-policy',
    edit: 'manage/edit-privacy-policy',
  },
  terms: {
    get: 'manage/get-terms-conditions',
    add: 'manage/add-terms-conditions',
    edit: 'manage/edit-terms-conditions',
  },
} satisfies Record<LegalDocumentKind, { get: string; add: string; edit: string }>;

export const manageWebApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPrivacyPolicy: builder.query<ManageWebDocument | null, void>({
      query: () => documentEndpoints.privacy.get,
      transformResponse: (response: ManageWebDocumentResponse) => response.data,
      providesTags: [{ type: 'Settings', id: 'PRIVACY_POLICY' }],
    }),
    addPrivacyPolicy: builder.mutation<ManageWebDocument | null, { description: string }>({
      query: (body) => ({
        url: documentEndpoints.privacy.add,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ManageWebDocumentResponse) => response.data,
      invalidatesTags: [{ type: 'Settings', id: 'PRIVACY_POLICY' }],
    }),
    updatePrivacyPolicy: builder.mutation<
      ManageWebDocument,
      { id: string; description: string }
    >({
      query: ({ id, description }) => ({
        url: `${documentEndpoints.privacy.edit}/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: { description },
      }),
      transformResponse: (response: ManageWebDocumentResponse) => {
        if (!response.data) throw new Error('The API did not return the updated privacy policy.');
        return response.data;
      },
      invalidatesTags: [{ type: 'Settings', id: 'PRIVACY_POLICY' }],
    }),
    getTermsConditions: builder.query<ManageWebDocument | null, void>({
      query: () => documentEndpoints.terms.get,
      transformResponse: (response: ManageWebDocumentResponse) => response.data,
      providesTags: [{ type: 'Settings', id: 'TERMS_CONDITIONS' }],
    }),
    addTermsConditions: builder.mutation<ManageWebDocument | null, { description: string }>({
      query: (body) => ({
        url: documentEndpoints.terms.add,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ManageWebDocumentResponse) => response.data,
      invalidatesTags: [{ type: 'Settings', id: 'TERMS_CONDITIONS' }],
    }),
    updateTermsConditions: builder.mutation<
      ManageWebDocument,
      { id: string; description: string }
    >({
      query: ({ id, description }) => ({
        url: `${documentEndpoints.terms.edit}/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: { description },
      }),
      transformResponse: (response: ManageWebDocumentResponse) => {
        if (!response.data) throw new Error('The API did not return the updated terms.');
        return response.data;
      },
      invalidatesTags: [{ type: 'Settings', id: 'TERMS_CONDITIONS' }],
    }),
    getFaqs: builder.query<ManageWebFaq[], void>({
      query: () => 'manage/get-faq',
      transformResponse: (response: ManageWebFaqListResponse) =>
        [...response.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'Faq' as const, id: _id })),
              { type: 'Faq' as const, id: 'LIST' },
            ]
          : [{ type: 'Faq' as const, id: 'LIST' }],
    }),
    addFaq: builder.mutation<ManageWebFaq, ManageWebFaqPayload>({
      query: (body) => ({
        url: 'manage/add-faq',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: ManageWebFaq }) => response.data,
      invalidatesTags: [{ type: 'Faq', id: 'LIST' }],
    }),
    updateFaq: builder.mutation<ManageWebFaq, { id: string; body: ManageWebFaqPayload }>({
      query: ({ id, body }) => ({
        url: `manage/edit-faq/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: { data: ManageWebFaq }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Faq', id },
        { type: 'Faq', id: 'LIST' },
      ],
    }),
    deleteFaq: builder.mutation<ManageWebFaq, string>({
      query: (id) => ({
        url: `manage/delete-faq/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      transformResponse: (response: { data: ManageWebFaq }) => response.data,
      invalidatesTags: (_result, _error, id) => [
        { type: 'Faq', id },
        { type: 'Faq', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetPrivacyPolicyQuery,
  useAddPrivacyPolicyMutation,
  useUpdatePrivacyPolicyMutation,
  useGetTermsConditionsQuery,
  useAddTermsConditionsMutation,
  useUpdateTermsConditionsMutation,
  useGetFaqsQuery,
  useAddFaqMutation,
  useUpdateFaqMutation,
  useDeleteFaqMutation,
} = manageWebApi;
