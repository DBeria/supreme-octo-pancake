// client/src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import jwt_decode from 'jwt-decode';

const PrivateRoute = () => {
  const { userInfo } = useSelector((state) => state.auth);

  if (userInfo && userInfo.token) {
    try {
      const decodedToken = jwt_decode(userInfo.token);
      if (decodedToken.exp * 1000 > Date.now()) {
        return <Outlet />; // Render child routes
      }
    } catch (error) {
      console.error('Invalid token in PrivateRoute:', error);
    }
  }

  return <Navigate to="/login" replace />;
};

export default PrivateRoute;
