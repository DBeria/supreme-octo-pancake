import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { user, logout } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const nav = useNavigate();

  const doLogout = () => {
    logout();
    const next = window.location.pathname + window.location.search;
    nav(`/login?next=${encodeURIComponent(next)}`, { replace: true });
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4 space-y-2">
        <div><b>Name:</b> {user?.name}</div>
        <div><b>Email:</b> {user?.email}</div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => setConfirm(true)}
          className="px-4 py-2 rounded bg-red-600 text-white"
        >
          Log out
        </button>
      </div>

      {confirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-xl shadow p-6">
            <h3 className="font-bold text-lg mb-2">Log out?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You’ll need to sign in again to access your courses.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700"
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
                onClick={doLogout}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
