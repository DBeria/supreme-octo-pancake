// client/src/components/AdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';
import { useSelector } from 'react-redux';

function decode(token) {
  try { return jwt_decode(token) } catch { return null }
}

const AdminRoute = ({ children }) => {
  const { userInfo } = useSelector((state) => state.auth) || {};
  const role = userInfo?.role || JSON.parse(localStorage.getItem('user') || '{}')?.role;
  const token = userInfo?.token || localStorage.getItem('token');

  const ok = token && decode(token)?.exp * 1000 > Date.now() && role === 'admin';
  return ok ? children : <Navigate to="/login" replace />;
};

export default AdminRoute;
