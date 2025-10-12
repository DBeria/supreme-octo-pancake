import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from "../features/authSlice";

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', formData);
      const { token, _id, name, email, role } = res.data || {}; const user = { _id, name, email, role };
      if (!token) throw new Error('Missing token from server');
      // Persist for axios interceptor + legacy
      localStorage.setItem('token', token);
      if (user) localStorage.setItem('user', JSON.stringify(user));
      // Also keep redux in sync for PrivateRoute/AdminRoute
      dispatch(setCredentials({ token, ...user }));
      // Route by role
      if (user?.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow rounded-xl p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-center">Sign in</h1>
        {error && <div className="p-3 rounded bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200 text-sm">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input name="email" type="email" required value={formData.email} onChange={onChange}
              className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-slate-800" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input name="password" type="password" required value={formData.password} onChange={onChange}
              className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-slate-800" placeholder="••••••••" />
          </div>
          <button disabled={loading} type="submit" className="w-full rounded-lg py-2 border font-medium disabled:opacity-60">
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>
        <p className="text-center text-sm">
          Don&apos;t have an account? <Link to="/register" className="text-blue-600">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
