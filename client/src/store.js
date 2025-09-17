import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/authSlice'; // Import the slice we just created

const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add other reducers here as your app grows
  },
  devTools: true, // Enables Redux DevTools for easier debugging
});

export default store;