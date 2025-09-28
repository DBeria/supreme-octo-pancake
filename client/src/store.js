import { configureStore } from '@reduxjs/toolkit';

// Corrected Path: Go up one level from 'app' to 'src', then into 'features/auth'
import authReducer from '../features/auth/authSlice';

// Corrected Path: Go up one level from 'app' to 'src', then into 'features/api'
import { apiSlice } from '../features/api/apiSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
  devTools: true,
});

export default store;