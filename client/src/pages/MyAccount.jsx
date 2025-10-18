import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Edit2, Check, X, LogOut, Key, User, FileText,
  Image as ImageIcon, Trash2, Download
} from 'lucide-react';

/**
 * Ensures file URLs (e.g., /uploads/xxx.pdf) point to the server, not the Vite dev host.
 * Set VITE_SERVER_URL in your client .env during dev, e.g.:
 * VITE_SERVER_URL=http://localhost:5000
 */
const SERVER_BASE = (import.meta?.env?.VITE_SERVER_URL || '').replace(/\/+$/, ''); // no trailing slash
const toFileURL = (p) => {
  if (!p) return '';
  // If already absolute (http/https), return as-is
  if (/^https?:\/\//i.test(p)) return p;
  // Otherwise prefix with SERVER_BASE if provided
  if (SERVER_BASE) return `${SERVER_BASE}${p.startsWith('/') ? p : `/${p}`}`;
  // As a last resort, return original (will fail on 5173 unless proxy is set for /uploads)
  return p;
};

const MyAccount = () => {
  // --- auth / author state ---
  const [user, setUser] = useState(null);
  const [authorProfile, setAuthorProfile] = useState(null);

  // --- form state ---
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    idNumber: '',
    mobileNumber: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [bio, setBio] = useState('');

  // --- ui state ---
  const [editingField, setEditingField] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const fetchUser = async () => {
      setError('');
      setSuccess('');
      try {
        const { data } = await axios.get('/api/auth/me', { headers: authHeaders() });
        setUser(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          idNumber: data.idNumber || '',
          mobileNumber: data.mobileNumber || '',
        });

        // Load author profile (if exists)
        try {
          const authorRes = await axios.get('/api/authors/my-profile', { headers: authHeaders() });
          setAuthorProfile(authorRes.data || null);
          setBio(authorRes.data?.bio || '');
        } catch {
          // ignore if not found
        }
      } catch (e) {
        setError('Failed to fetch account details.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handlePasswordChange = (e) => {
    setPasswordData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // --- save a single field (name, email, mobileNumber) ---
  const handleFieldSave = async (fieldName) => {
    setError('');
    setSuccess('');
    try {
      const payload = { [fieldName]: formData[fieldName] };
      const { data } = await axios.put('/api/auth/update-details', payload, { headers: authHeaders() });

      // Keep local user in sync
      const userPayload = {
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        idNumber: data.idNumber,
        mobileNumber: data.mobileNumber,
      };
      localStorage.setItem('user', JSON.stringify(userPayload));
      setUser((u) => ({ ...(u || {}), ...data }));

      setSuccess(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} updated successfully!`);
      setEditingField(null);
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to update ${fieldName}.`);
    }
  };

  // --- password update ---
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }
    if ((passwordData.newPassword || '').length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    try {
      const { data } = await axios.put(
        '/api/auth/update-password',
        { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword },
        { headers: authHeaders() }
      );
      setSuccess(data?.message || 'Password updated.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update password.');
    }
  };

  // --- photo upload (multipart) ---
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await axios.put('/api/authors/my-profile/photo', fd, {
        headers: { ...authHeaders() },
      });
      setAuthorProfile(data);
      setSuccess('Profile photo uploaded successfully!');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to upload profile photo.');
    }
  };

  // --- CV upload (multipart) ---
  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('cv', file);
      const { data } = await axios.put('/api/authors/my-profile/cv', fd, {
        headers: { ...authHeaders() },
      });
      setAuthorProfile(data); // contains cvUrl
      setSuccess('CV uploaded successfully!');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to upload CV.');
    }
  };

  // --- Force-download helper (works cross-origin) ---
  const downloadCv = async () => {
    try {
      const url = toFileURL(authorProfile?.cvUrl);
      if (!url) return;
      const res = await axios.get(url, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = (authorProfile?.cvUrl?.split('/')?.pop()) || 'cv.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError('Could not download the CV file.');
    }
  };

  // --- delete assets using generic profile update (sets field to null) ---
  const handleDeleteAsset = async (asset) => {
    // asset: 'profilePicture' | 'cvUrl'
    const label = asset === 'cvUrl' ? 'CV' : 'profile picture';
    if (!window.confirm(`Remove your ${label}?`)) return;
    setError('');
    setSuccess('');
    try {
      const { data } = await axios.put('/api/authors/my-profile', { [asset]: null }, { headers: authHeaders() });
      setAuthorProfile(data);
      setSuccess(`${label.charAt(0).toUpperCase() + label.slice(1)} removed.`);
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to remove ${label}.`);
    }
  };

  // --- bio save ---
  const handleBioSave = async () => {
    setError('');
    setSuccess('');
    try {
      const { data } = await axios.put('/api/authors/my-profile', { bio }, { headers: authHeaders() });
      setAuthorProfile(data);
      setSuccess('Bio updated successfully!');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update bio.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-700 dark:text-gray-300">Loading your account details...</div>;
  }

  const cvHref = toFileURL(authorProfile?.cvUrl);
  const photoSrc = toFileURL(authorProfile?.profilePicture) || 'https://via.placeholder.com/150';

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-8">My Account</h1>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-md mb-6 text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 p-4 rounded-md mb-6 text-center">
          {success}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 space-y-8">
        {/* Profile details */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <User size={24} /> Profile Details
          </h2>

          <div className="space-y-5">
            {/* Name */}
            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
              <label className="text-lg font-medium text-gray-700 dark:text-gray-300 w-1/4">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                disabled={editingField !== 'name'}
                className={`flex-grow px-3 py-2 rounded-md ${
                  editingField === 'name'
                    ? 'bg-white dark:bg-slate-700 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    : 'border-none bg-transparent'
                }`}
              />
              {editingField === 'name' ? (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleFieldSave('name')}
                    className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50"
                    title="Save Name"
                  >
                    <Check size={20} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setFormData((prev) => ({ ...prev, name: user?.name || '' }));
                    }}
                    className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
                    title="Cancel"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingField('name')}
                  className="p-2 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 ml-4"
                  title="Edit Name"
                >
                  <Edit2 size={20} />
                </button>
              )}
            </div>

            {/* Email */}
            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
              <label className="text-lg font-medium text-gray-700 dark:text-gray-300 w-1/4">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                disabled={editingField !== 'email'}
                className={`flex-grow px-3 py-2 rounded-md ${
                  editingField === 'email'
                    ? 'bg-white dark:bg-slate-700 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    : 'border-none bg-transparent'
                }`}
              />
              {editingField === 'email' ? (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleFieldSave('email')}
                    className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50"
                    title="Save Email"
                  >
                    <Check size={20} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setFormData((prev) => ({ ...prev, email: user?.email || '' }));
                    }}
                    className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
                    title="Cancel"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingField('email')}
                  className="p-2 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 ml-4"
                  title="Edit Email"
                >
                  <Edit2 size={20} />
                </button>
              )}
            </div>

            {/* ID Number (read-only) */}
            <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
              <label className="text-lg font-medium text-gray-700 dark:text-gray-300 w-1/4">ID Number</label>
              <input
                type="text"
                value={user?.idNumber || ''}
                disabled
                className="flex-grow px-3 py-2 rounded-md border-none bg-transparent text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <div className="w-16 ml-4"></div>
            </div>

            {/* Mobile Number */}
            <div className="flex items-center justify-between py-2">
              <label className="text-lg font-medium text-gray-700 dark:text-gray-300 w-1/4">Mobile Number</label>
              <input
                type="text"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleFormChange}
                pattern="\d{9}"
                title="Mobile Number must be 9 digits"
                disabled={editingField !== 'mobileNumber'}
                className={`flex-grow px-3 py-2 rounded-md ${
                  editingField === 'mobileNumber'
                    ? 'bg-white dark:bg-slate-700 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    : 'border-none bg-transparent'
                }`}
              />
              {editingField === 'mobileNumber' ? (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleFieldSave('mobileNumber')}
                    className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50"
                    title="Save Mobile Number"
                  >
                    <Check size={20} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setFormData((prev) => ({ ...prev, mobileNumber: user?.mobileNumber || '' }));
                    }}
                    className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
                    title="Cancel"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingField('mobileNumber')}
                  className="p-2 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 ml-4"
                  title="Edit Mobile Number"
                >
                  <Edit2 size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Author profile */}
        {authorProfile && (
          <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <FileText size={24} /> Author Profile
            </h2>

            {/* Profile picture */}
            <div className="py-2 border-b border-slate-200 dark:border-slate-700">
              <label className="text-lg font-medium text-gray-700 dark:text-gray-300">Profile Picture</label>
              <div className="flex items-center gap-4 mt-2 mb-4">
                <img
                  src={photoSrc}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                />
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <ImageIcon size={16} />
                  <span className="text-sm">Upload new photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {authorProfile.profilePicture && (
                  <button
                    onClick={() => handleDeleteAsset('profilePicture')}
                    className="flex items-center gap-2 text-sm bg-red-100 text-red-700 px-3 py-2 rounded-full hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                )}
              </div>
            </div>

            {/* CV */}
            <div className="py-2 border-b border-slate-200 dark:border-slate-700">
              <label className="text-lg font-medium text-gray-700 dark:text-gray-300">My CV (PDF)</label>
              <div className="flex items-center gap-4 mt-2 mb-4">
                <input type="file" accept="application/pdf" onChange={handleCvUpload} />
                {authorProfile.cvUrl && (
                  <>
                    <a
                      href={cvHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                    >
                      Open CV
                    </a>
                    <button
                      onClick={downloadCv}
                      className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-2 rounded-full hover:bg-blue-700"
                    >
                      <Download size={16} /> Download
                    </button>
                    <button
                      onClick={() => handleDeleteAsset('cvUrl')}
                      className="flex items-center gap-2 text-sm bg-red-100 text-red-700 px-3 py-2 rounded-full hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </>
                )}
              </div>

              {/* Embedded preview */}
              {authorProfile.cvUrl && (
                <div className="mt-3 w-full h-[600px] bg-slate-100 dark:bg-slate-900 rounded overflow-hidden">
                  <object data={cvHref} type="application/pdf" width="100%" height="100%">
                    <p className="p-4 text-slate-600 dark:text-slate-300">
                      PDF preview not available.{' '}
                      <a
                        className="text-cyan-600 underline"
                        href={cvHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open CV
                      </a>
                      .
                    </p>
                  </object>
                </div>
              )}
            </div>

            {/* Bio */}
            <div className="py-2 mt-4">
              <label className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                My Bio / CV Description
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a short biography..."
                className="w-full h-32 p-3 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleBioSave}
                className="mt-3 bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition shadow-sm"
              >
                Save Bio
              </button>
            </div>
          </div>
        )}

        {/* Change password */}
        <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <Key size={24} /> Change Password
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-6 w-full max-w-lg">
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-slate-700"
              placeholder="Current Password"
            />
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm dark:bg-slate-700"
              placeholder="New Password"
            />
            <input
              type="password"
              name="confirmNewPassword"
              value={passwordData.confirmNewPassword}
              onChange={handlePasswordChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm dark:bg-slate-700"
              placeholder="Confirm New Password"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
            >
              Change Password
            </button>
          </form>
        </div>

        {/* Logout */}
        <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition shadow-md"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyAccount;