// client/src/features/apiSlice.js - FINAL CORRECTED FILE

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// FIX #1: This line connects the app to your Render backend.
const BASE_URL = import.meta.env.VITE_API_URL || '';

// FIX #2: This line defines the correct path for courses.
const COURSES_URL = '/api/courses';

export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['Course', 'User', 'Review'],
  endpoints: (builder) => ({
    // FIX #3: All course-related API calls are now defined directly in this file.
    getCourses: builder.query({
      query: () => ({
        url: COURSES_URL,
      }),
      providesTags: ['Course'],
      keepUnusedDataFor: 5,
    }),
    getCourseDetails: builder.query({
      query: (id) => ({
        url: `${COURSES_URL}/${id}`,
      }),
      providesTags: ['Course'],
      keepUnusedDataFor: 5,
    }),
  }),
});

// This exports the hooks that your app uses to get data.
export const { useGetCoursesQuery, useGetCourseDetailsQuery } = apiSlice;