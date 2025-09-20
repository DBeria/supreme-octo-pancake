import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/authSlice'; // This imports the user slice

const store = configureStore({
  reducer: {
    auth: authReducer,
    // You can add other feature reducers here later
  },
  devTools: true,
});

export default store;