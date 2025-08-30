import React from 'react';
import { Navigate } from 'react-router-dom';
import jwtDecode from 'jwt-decode';

const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    let isAdmin = false;

    if (token) {
        try {
            const user = JSON.parse(localStorage.getItem('user')); 
            if (user && user.role === 'admin') {
                isAdmin = true;
            }
        } catch (error) {
            isAdmin = false;
        }
    }

    return isAdmin ? children : <Navigate to="/dashboard" replace />;
};

export default AdminRoute;
