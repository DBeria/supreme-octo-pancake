// File: client/src/components/AdminRoute.jsx

import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
// THIS IS THE FIX: We now use a named import which is compatible with the build process.
import { jwtDecode } from 'jwt-decode';

const AdminRoute = () => {
    const { userInfo } = useSelector((state) => state.auth);

    if (userInfo && userInfo.token) {
        try {
            const decodedToken = jwtDecode(userInfo.token);
            if (decodedToken.isAdmin && decodedToken.exp * 1000 > Date.now()) {
                return <Outlet />;
            }
        } catch (error) {
            console.error("Invalid token in AdminRoute:", error);
        }
    }

    return <Navigate to="/login" replace />;
};

export default AdminRoute;