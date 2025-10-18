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
      const { token, _id, name, email, role } = res.data || {};
      const user = { _id, name, email, role };
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
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">Sign in to POCUS World</h1>
        {error && <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 text-sm font-medium text-center">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input name="email" type="email" required value={formData.email} onChange={onChange}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-3 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input name="password" type="password" required value={formData.password} onChange={onChange}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-3 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="••••••••" />
          </div>
          <div className="text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">Forgot Password?</Link>
          </div>
          <button disabled={loading} type="submit" className="w-full rounded-lg py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:scale-100">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account? <Link to="/register" className="font-semibold text-blue-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;