// client/src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';
import { useSelector } from 'react-redux';

function isTokenValid(token) {
  if (!token) return false;
  try {
    const decoded = jwt_decode(token);
    return decoded?.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

const PrivateRoute = ({ children }) => {
  // Prefer Redux state, fall back to localStorage for backward compatibility
  const { userInfo } = useSelector((state) => state.auth) || {};
  const reduxToken = userInfo?.token;
  const lsToken = localStorage.getItem('token');
  const token = reduxToken || lsToken;

  if (isTokenValid(token)) {
    return children;
  }

  return <Navigate to="/login" replace />;
};

export default PrivateRoute;
