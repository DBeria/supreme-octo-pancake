// File: client/src/components/PrivateRoute.jsx

import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
// THIS IS THE FIX: We now use a named import which is compatible with the build process.
import { jwtDecode } from 'jwt-decode';

const PrivateRoute = () => {
    const { userInfo } = useSelector((state) => state.auth);

    if (userInfo && userInfo.token) {
        try {
            const decodedToken = jwtDecode(userInfo.token);
            if (decodedToken.exp * 1000 > Date.now()) {
                return <Outlet />;
            }
        } catch (error) {
            console.error("Invalid token in PrivateRoute:", error);
        }
    }
    
    return <Navigate to="/login" replace />;
};

export default PrivateRoute;