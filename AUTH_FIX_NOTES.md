# Auth Fix Notes

This patch makes login, protected routes, and logout consistent.

## What changed
1. **PrivateRoute.jsx** & **AdminRoute.jsx**
   - Now accept `children` (no `<Outlet/>` needed).
   - Validate JWT expiry safely.
   - Fall back to `localStorage` if Redux is empty.

2. **Login.jsx**
   - On success, saves `{ token, user }` to `localStorage` and also dispatches Redux `setCredentials({ token, ...user })`.
   - Redirects admins to `/admin`, others to `/dashboard`.

3. **Header.jsx**
   - Logout clears all possible auth keys and forces navigation to `/login`.
   - (If Redux store is mounted) dispatches `logout()` as well.

## After merging
- Make sure your axios interceptor reads from `localStorage.getItem('token')` (already in `src/utils/axiosInstance.js`).
- If your server runs on a different origin, set `VITE_API_URL` in `.env` (client) and enable CORS on the server.
- Restart dev servers.
