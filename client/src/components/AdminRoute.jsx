// client/src/components/AdminRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import jwt_decode from 'jwt-decode';

const AdminRoute = () => {
  const { userInfo } = useSelector((state) => state.auth);

  if (userInfo && userInfo.token && userInfo.role === 'admin') {
    try {
      const decodedToken = jwt_decode(userInfo.token);
      if (decodedToken.exp * 1000 > Date.now()) {
        return <Outlet />; // Render child routes
      }
    } catch (error) {
      console.error('Invalid token in AdminRoute:', error);
    }
  }

  // Redirect non-admins or invalid/expired tokens to login
  return <Navigate to="/login" replace />;
};

export default AdminRoute;
