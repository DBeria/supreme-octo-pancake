import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Edit2, Check, X, LogOut, Key, User, FileText, Image as ImageIcon, Trash2, Download } from 'lucide-react'; 

const MyAccount = () => {
    const [user, setUser] = useState(null);
    const [authorProfile, setAuthorProfile] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', idNumber: '', mobileNumber: '' });
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    const [bio, setBio] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingField, setEditingField] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('token');
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            try {
                const { data } = await axios.get('/api/auth/me', config);
                setUser(data);
                setFormData({ name: data.name, email: data.email, idNumber: data.idNumber || '', mobileNumber: data.mobileNumber || '' });

                if (data.role === 'admin') {
                    const authorRes = await axios.get('/api/authors/my-profile', config);
                    setAuthorProfile(authorRes.data);
                    setBio(authorRes.data.bio || '');
                }
            } catch (err) {
                setError('Failed to fetch user data.');
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const handleFormChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handlePasswordChange = e => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

    const handleFieldSave = async (fieldName) => {
        setError('');
        setSuccess('');
        const token = localStorage.getItem('token');
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        try {
            const updatedData = { [fieldName]: formData[fieldName] };
            const { data } = await axios.put('/api/auth/update-details', updatedData, config);
            
            const userPayload = {
                _id: data._id,
                name: data.name,
                email: data.email,
                role: data.role
            };
            localStorage.setItem('user', JSON.stringify(userPayload));
            setUser(prevUser => ({...prevUser, ...data}));
            
            setSuccess(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} updated successfully!`);
            setEditingField(null);
        } catch (err) {
            setError(err.response?.data?.message || `Failed to update ${fieldName}.`);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (passwordData.newPassword !== passwordData.confirmNewPassword) {
            return setError('New passwords do not match.');
        }
        if (passwordData.newPassword.length < 6) {
            return setError('New password must be at least 6 characters long.');
        }

        const token = localStorage.getItem('token');
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        try {
            const { data } = await axios.put('/api/auth/update-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, config);
            setSuccess(data.message);
            setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password.');
        }
    };
    
    const handleProfilePictureUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64Image = reader.result;
            setError('');
            setSuccess('');
            const token = localStorage.getItem('token');
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            try {
                const { data } = await axios.put('/api/authors/my-profile', { profilePicture: base64Image }, config);
                setAuthorProfile(data);
                setSuccess('Profile picture uploaded successfully!');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to upload profile picture.');
            }
        };
        reader.onerror = () => {
             setError('Error reading file.');
        }
    };

    const handleCvUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64Cv = reader.result;
            setError('');
            setSuccess('');
            const token = localStorage.getItem('token');
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            try {
                const { data } = await axios.put('/api/authors/my-profile', { cv: base64Cv }, config);
                setAuthorProfile(data);
                setSuccess('CV uploaded successfully!');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to upload CV.');
            }
        };
        reader.onerror = () => {
             setError('Error reading file.');
        }
    };

    // --- NEW: Function to handle deleting assets ---
    const handleDeleteAsset = async (assetType) => {
        const assetName = assetType === 'cv' ? 'CV' : 'profile picture';
        if (!window.confirm(`Are you sure you want to remove your ${assetName}?`)) {
            return;
        }
        setError('');
        setSuccess('');
        const token = localStorage.getItem('token');
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        const payload = { [assetType]: null }; // Send null to the backend

        try {
            const { data } = await axios.put('/api/authors/my-profile', payload, config);
            setAuthorProfile(data); // Update state with response from the server
            setSuccess(`${assetName.charAt(0).toUpperCase() + assetName.slice(1)} removed successfully!`);
        } catch (err) {
            setError(err.response?.data?.message || `Failed to remove ${assetName}.`);
        }
    };

    const handleBioSave = async () => {
        setError('');
        setSuccess('');
        const token = localStorage.getItem('token');
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        try {
            const { data } = await axios.put('/api/authors/my-profile', { bio }, config);
            setAuthorProfile(data);
            setSuccess('Author bio updated successfully!');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update bio.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (loading) return <div className="text-center py-10 text-gray-700 dark:text-gray-300">Loading your account details...</div>;

    return (
        <div className="container mx-auto px-6 py-12">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-8">My Account</h1>

            {error && <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-md mb-6 text-center">{error}</div>}
            {success && <div className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 p-4 rounded-md mb-6 text-center">{success}</div>}
            
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 space-y-8">
                 {/* Certificates Section */}
                {user?.enrolledCourses?.some(e => e.isCompleted && e.certificate) && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                            <Download size={24} /> My Certificates
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {user.enrolledCourses
                                .filter(e => e.isCompleted && e.certificate)
                                .map(enrollment => (
                                <div key={enrollment.course._id} className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg flex items-center justify-between">
                                    <span className="font-semibold">{enrollment.course.title}</span>
                                    {/* For simplicity, we just have a button to show the generation ability. The actual certificate would be a link to the stored file. */}
                                    <button 
                                        onClick={() => window.open(enrollment.certificate)}
                                        className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                                    >
                                        View Certificate
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                        <User size={24} /> Profile Details
                    </h2>
                    <div className="space-y-5">
                         {/* Name Field */}
                        <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <label className="text-lg font-medium text-gray-700 dark:text-gray-300 w-1/4">Full Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleFormChange} disabled={editingField !== 'name'} className={`flex-grow px-3 py-2 rounded-md ${editingField === 'name' ? 'bg-white dark:bg-slate-700 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500' : 'border-none bg-transparent'}`} />
                            {editingField === 'name' ? (
                                <div className="flex gap-2 ml-4"><button onClick={() => handleFieldSave('name')} className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50" title="Save Name"><Check size={20} /></button><button onClick={() => { setEditingField(null); setFormData(prev => ({ ...prev, name: user.name })); }} className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50" title="Cancel"><X size={20} /></button></div>
                            ) : (
                                <button onClick={() => setEditingField('name')} className="p-2 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 ml-4" title="Edit Name"><Edit2 size={20} /></button>
                            )}
                        </div>
                        {/* Email Field */}
                        <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                             <label className="text-lg font-medium text-gray-700 dark:text-gray-300 w-1/4">Email Address</label>
                             <input type="email" name="email" value={formData.email} onChange={handleFormChange} disabled={editingField !== 'email'} className={`flex-grow px-3 py-2 rounded-md ${editingField === 'email' ? 'bg-white dark:bg-slate-700 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500' : 'border-none bg-transparent'}`}/>
                             {editingField === 'email' ? (
                                <div className="flex gap-2 ml-4"><button onClick={() => handleFieldSave('email')} className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50" title="Save Email"><Check size={20} /></button><button onClick={() => { setEditingField(null); setFormData(prev => ({ ...prev, email: user.email })); }} className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50" title="Cancel"><X size={20} /></button></div>
                            ) : (
                                <button onClick={() => setEditingField('email')} className="p-2 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 ml-4" title="Edit Email"><Edit2 size={20} /></button>
                            )}
                        </div>
                        {/* ID Number Field */}
                        <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                            <label className="text-lg font-medium text-gray-700 dark:text-gray-300 w-1/4">ID Number</label>
                            <input type="text" value={user?.idNumber} disabled className="flex-grow px-3 py-2 rounded-md border-none bg-transparent text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                            <div className="w-16 ml-4"></div>
                        </div>
                        {/* Mobile Number Field */}
                        <div className="flex items-center justify-between py-2">
                            <label className="text-lg font-medium text-gray-700 dark:text-gray-300 w-1/4">Mobile Number</label>
                            <input type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleFormChange} pattern="\d{9}" title="Mobile Number must be 9 digits" disabled={editingField !== 'mobileNumber'} className={`flex-grow px-3 py-2 rounded-md ${editingField === 'mobileNumber' ? 'bg-white dark:bg-slate-700 border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500' : 'border-none bg-transparent'}`}/>
                            {editingField === 'mobileNumber' ? (
                                <div className="flex gap-2 ml-4"><button onClick={() => handleFieldSave('mobileNumber')} className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50" title="Save Mobile Number"><Check size={20} /></button><button onClick={() => { setEditingField(null); setFormData(prev => ({ ...prev, mobileNumber: user.mobileNumber || '' })); }} className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50" title="Cancel"><X size={20} /></button></div>
                            ) : (
                                <button onClick={() => setEditingField('mobileNumber')} className="p-2 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 ml-4" title="Edit Mobile Number"><Edit2 size={20} /></button>
                            )}
                        </div>
                    </div>
                </div>

                {user?.role === 'admin' && authorProfile && (
                    <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                            <FileText size={24} /> Author Profile
                        </h2>
                        
                        <div className="py-2 border-b border-slate-200 dark:border-slate-700">
                            <label className="text-lg font-medium text-gray-700 dark:text-gray-300">Profile Picture</label>
                            <div className="flex items-center gap-4 mt-2 mb-4">
                                <img src={authorProfile.profilePicture || 'https://via.placeholder.com/150'} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-slate-300 dark:border-slate-600" />
                                <input type="file" accept="image/*" onChange={handleProfilePictureUpload} className="block text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                {/* --- NEW: Delete Profile Picture Button --- */}
                                {authorProfile.profilePicture && authorProfile.profilePicture !== 'https://via.placeholder.com/150' && (
                                     <button onClick={() => handleDeleteAsset('profilePicture')} className="flex items-center gap-2 text-sm bg-red-100 text-red-700 px-3 py-2 rounded-full hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900">
                                         <Trash2 size={16}/> Remove
                                     </button>
                                )}
                            </div>
                        </div>

                        <div className="py-2 border-b border-slate-200 dark:border-slate-700">
                             <label className="text-lg font-medium text-gray-700 dark:text-gray-300">My CV (PDF)</label>
                             <div className="flex items-center gap-4 mt-2 mb-4">
                                <input type="file" accept=".pdf,.doc,.docx" onChange={handleCvUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                {authorProfile.cv && 
                                    <>
                                        <a href={authorProfile.cv} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline inline-block whitespace-nowrap">View Current CV</a>
                                        {/* --- NEW: Delete CV Button --- */}
                                        <button onClick={() => handleDeleteAsset('cv')} className="flex items-center gap-2 text-sm bg-red-100 text-red-700 px-3 py-2 rounded-full hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900">
                                            <Trash2 size={16}/> Remove
                                        </button>
                                    </>
                                }
                             </div>
                        </div>

                        <div className="py-2 mt-4">
                            <label className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2 block">My Bio / CV Description</label>
                            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a short biography..." className="w-full h-32 p-3 rounded-md bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            <button onClick={handleBioSave} className="mt-3 bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition shadow-sm">Save Bio</button>
                        </div>
                    </div>
                )}

                <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700 flex flex-col items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                        <Key size={24} /> Change Password
                    </h2>
                    <form onSubmit={handlePasswordSubmit} className="space-y-6 w-full max-w-lg">
                         <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-slate-700" placeholder="Current Password"/>
                         <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm dark:bg-slate-700" placeholder="New Password"/>
                         <input type="password" name="confirmNewPassword" value={passwordData.confirmNewPassword} onChange={handlePasswordChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm dark:bg-slate-700" placeholder="Confirm New Password"/>
                         <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md">Change Password</button>
                    </form>
                </div>

                <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-center">
                    <button onClick={handleLogout} className="flex items-center gap-3 bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition shadow-md">
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MyAccount;
