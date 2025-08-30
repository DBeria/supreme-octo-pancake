import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const AdminDashboard = () => {
    const [courses, setCourses] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();

    const fetchCourses = useCallback(async () => {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            const { data } = await axios.get('/api/courses/admin-courses', config);
            setCourses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch admin courses", error);
            setCourses([]);
        }
    }, []);

    useEffect(() => {
        fetchCourses();
    }, [location.key, fetchCourses]);

    const handleCreateCourse = async () => {
        const token = localStorage.getItem('token');
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        const newCourseData = {
            title: 'New Draft Course',
            description: 'Add a description...',
            level: 'Beginner',
            specialty: 'General',
            price: 0,
            imageUrl: 'https://placehold.co/600x400/3B82F6/FFFFFF?text=New+Course',
            isPublic: false
        };
        try {
            const { data } = await axios.post('/api/courses', newCourseData, config);
            navigate(`/admin/course/${data._id}`);
        } catch (error) {
            console.error('Failed to create course:', error.response ? error.response.data : error.message);
            const serverMessage = error.response?.data?.message || 'An unknown error occurred.';
            const detailedError = error.response?.data?.error ? ` Details: ${error.response.data.error}` : '';
            alert(`Could not create a new course. Please try again.\n\nServer said: ${serverMessage}${detailedError}`);
        }
    };

    const handleTogglePublish = async (courseId, isPublic) => {
        const token = localStorage.getItem('token');
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        try {
            await axios.put(`/api/courses/${courseId}`, { isPublic: !isPublic }, config);
            setCourses(prevCourses => prevCourses.map(c => c._id === courseId ? { ...c, isPublic: !isPublic } : c));
        } catch (error) {
            console.error('Failed to update course status', error);
            alert('Could not update the course status.');
        }
    };

    const handleDeleteCourse = async (courseId) => {
        if (window.confirm('Are you sure you want to move this course to the recycle bin?')) {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                await axios.delete(`/api/courses/${courseId}`, config);
                setCourses(prevCourses => prevCourses.map(c => c._id === courseId ? { ...c, status: 'deleted', deletedAt: new Date() } : c));
            } catch (error) {
                console.error('Failed to move course to bin', error);
                alert('Could not move the course to the bin.');
            }
        }
    };

    const handleRestoreCourse = async (courseId) => {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.put(`/api/courses/${courseId}/restore`, {}, config);
            setCourses(prevCourses => prevCourses.map(c => c._id === courseId ? { ...c, status: 'active', deletedAt: undefined } : c));
        } catch (error) {
            console.error('Failed to restore course', error);
            alert('Could not restore the course.');
        }
    };

    const handlePermanentlyDeleteCourse = async (courseId) => {
        if (window.confirm('This action is irreversible. Are you sure you want to permanently delete this course?')) {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                await axios.delete(`/api/courses/${courseId}/permanent-delete`, config);
                setCourses(prevCourses => prevCourses.filter(c => c._id !== courseId));
            } catch (error) {
                console.error('Failed to permanently delete course', error);
                alert('Could not permanently delete the course.');
            }
        }
    };

    const activeCourses = Array.isArray(courses) ? courses.filter(c => c && c.status !== 'deleted') : [];
    const deletedCourses = Array.isArray(courses) ? courses.filter(c => c && c.status === 'deleted') : [];

    const getTimeLeft = (deletedAt) => {
        if (!deletedAt) return "Expired";
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        const timeElapsed = new Date() - new Date(deletedAt);
        const timeLeft = threeDays - timeElapsed;
        if (timeLeft <= 0) return "Expired";
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days}d ${hours}h left`;
    };

    return (
        <div className="container mx-auto px-6 py-12">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <button onClick={handleCreateCourse} className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition shadow-sm">
                    Create New Course
                </button>
            </div>
            {/* Active Courses */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Active Courses</h2>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {activeCourses.length > 0 ? activeCourses.map(course => (
                        <div key={course?._id} className="flex justify-between items-center py-3">
                             <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{course?.title}</p>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${course?.isPublic ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                    {course?.isPublic ? 'Published' : 'Draft'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => navigate(`/admin/course/${course?._id}`)} className="text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition">Edit</button>
                                <button onClick={() => handleTogglePublish(course?._id, course?.isPublic)} className={`text-sm text-white px-3 py-1 rounded-md transition ${course?.isPublic ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-500 hover:bg-green-600'}`}>
                                    {course?.isPublic ? 'Unpublish' : 'Publish'}
                                </button>
                                <button onClick={() => handleDeleteCourse(course?._id)} className="text-sm bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition">Delete</button>
                            </div>
                        </div>
                    )) : <p className="text-gray-500 dark:text-gray-400 py-4">No active courses.</p>}
                </div>
            </div>

            {/* Recycle Bin */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Recycle Bin</h2>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {deletedCourses.length > 0 ? deletedCourses.map(course => (
                        <div key={course?._id} className="flex justify-between items-center py-3">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{course?.title}</p>
                                <span className="text-xs text-red-500 dark:text-red-400">{getTimeLeft(course?.deletedAt)} until permanent deletion</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleRestoreCourse(course?._id)} className="text-sm bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition">Restore</button>
                                <button onClick={() => handlePermanentlyDeleteCourse(course?._id)} className="text-sm bg-red-700 text-white px-3 py-1 rounded-md hover:bg-red-800 transition">Delete Permanently</button>
                            </div>
                        </div>
                    )) : <p className="text-gray-500 dark:text-gray-400 py-4">The recycle bin is empty.</p>}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;