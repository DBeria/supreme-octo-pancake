// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

// Uses Vite env if present, otherwise your Render URL
const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  'https://pocus-world-backend.onrender.com';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      // IMPORTANT:
      // 1) Use absolute URL to your backend
      // 2) Send WITHOUT credentials to avoid the “* + credentials” CORS error
      const { data } = await axios.post(
        `${API_BASE}/api/auth/forgot-password`,
        { email },
        {
          withCredentials: false, // override any global axios defaults
          headers: { 'Content-Type': 'application/json' },
        }
      );
      setMessage(data?.message || 'If this email exists, a reset link has been sent.');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'An error occurred. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          Forgot Password
        </h2>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your email address and we’ll send you a link to reset your password.
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded text-center">{error}</div>
        )}
        {message && (
          <div className="bg-green-100 text-green-700 p-3 rounded text-center">
            {message}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm">
            <input
              type="email"
              name="email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Email address"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {submitting ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center text-sm">
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
