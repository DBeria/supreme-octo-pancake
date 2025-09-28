// File: client/src/components/AdminRoute.jsx

import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
// THIS IS THE CORRECTED LINE:
import { jwtDecode } from 'jwt-decode'; // Changed from default to named import

const AdminRoute = () => {
    const { userInfo } = useSelector((state) => state.auth);

    if (userInfo && userInfo.token) {
        // Use the imported function to decode the token
        const decodedToken = jwtDecode(userInfo.token);
        // Check if the user is an admin
        if (decodedToken.isAdmin) {
            return <Outlet />;
        }
    }

    // If not an admin, or no token, redirect to the login page
    return <Navigate to="/login" replace />;
};

export default AdminRoute;