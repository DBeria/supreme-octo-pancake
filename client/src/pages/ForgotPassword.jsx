import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_BASE } from '@/config';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // The URL your email should point to (your Netlify domain).
  // Backend will append /:token or ?token=... depending on its implementation.
  const FRONTEND_RESET_BASE = `${window.location.origin}/reset-password`;

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSending(true);

    try {
      // Try the most helpful payload first, then gracefully fallback if backend rejects extras
      const tryPayloads = [
        { email, clientUrl: FRONTEND_RESET_BASE },
        { email, callbackUrl: FRONTEND_RESET_BASE },
        { email, redirectUrl: FRONTEND_RESET_BASE },
        { email }, // plain legacy
      ];

      let lastErr = null;
      for (const payload of tryPayloads) {
        try {
          const { data } = await axios.post(`${API_BASE}/api/auth/forgot-password`, payload);
          setMessage(data?.message || 'If this email exists, a reset link has been sent.');
          setSending(false);
          return;
        } catch (err) {
          lastErr = err;
          // loop to next payload
        }
      }

      // If we reach here, all payload shapes failed
      throw lastErr || new Error('Request failed');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'An error occurred';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          Forgot Password
        </h2>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded text-center">{error}</div>
        )}
        {message && (
          <div className="bg-green-100 text-green-700 p-3 rounded text-center">{message}</div>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Email address"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white
                       bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send Reset Link'}
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
