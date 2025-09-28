// File: client/src/components/AdminRoute.jsx

import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
// THIS IS THE FIX: Using the correct 'named' import and aliasing it.
import { jwtDecode as jwt_decode } from 'jwt-decode';

const AdminRoute = () => {
    const { userInfo } = useSelector((state) => state.auth);

    if (userInfo && userInfo.token) {
        try {
            const decodedToken = jwt_decode(userInfo.token);
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