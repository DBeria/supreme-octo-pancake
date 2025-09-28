// File: client/src/components/PrivateRoute.jsx

import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
// THIS IS THE FIX: Using the correct default import for jwt-decode v3
import jwt_decode from 'jwt-decode';

const PrivateRoute = () => {
    const { userInfo } = useSelector((state) => state.auth);

    if (userInfo && userInfo.token) {
        try {
            // Using the correctly imported function
            const decodedToken = jwt_decode(userInfo.token);
            if (decodedToken.exp * 1000 > Date.now()) {
                return <Outlet />;
            }
        } catch (error) {
            console.error("Invalid token in PrivateRoute:", error);
            return <Navigate to="/login" replace />;
        }
    }
    
    return <Navigate to="/login" replace />;
};

export default PrivateRoute;