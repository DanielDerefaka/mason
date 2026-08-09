import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { StyleGuide } from '@/types/style-guide'

export type GenerateStyleGuideRequest = { projectId: string }

export type GenerateStyleGuideResponse = {
  success: boolean
  message?: string
  styleGuide?: StyleGuide
}

export const styleGuideApi = createApi({
  reducerPath: 'styleGuideApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/generate' }),
  tagTypes: ['StyleGuide'],
  endpoints: (builder) => ({
    generateStyleGuide: builder.mutation<GenerateStyleGuideResponse, GenerateStyleGuideRequest>({
      query: (body) => ({ url: '/style', method: 'POST', body }),
      invalidatesTags: ['StyleGuide'],
      /**
       * A 4xx normally lands in `error` and never reaches the caller's success
       * path. The route puts the reason in the body, so surface that instead of
       * a bare status and let the hook show it.
       */
      transformErrorResponse: (response) => response.data as GenerateStyleGuideResponse,
    }),
  }),
})

export const { useGenerateStyleGuideMutation } = styleGuideApi
