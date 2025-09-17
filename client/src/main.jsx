import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import './index.css';

// Import all your page components with the correct paths
import Home from './pages/Home.jsx'; // This is the fix
import CourseDetail from './pages/CourseDetail.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
// ... import other pages as needed

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route index={true} path="/" element={<Home />} />
      <Route path="/courses/:id" element={<CourseDetail />} />
      
      {/* Add your other routes here */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />

    </Route>
  )
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);