import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { BarChart, BookOpen, CheckCircle, ArrowRight, ChevronDown } from 'lucide-react';

const CourseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [openLessons, setOpenLessons] = useState({});

    const handleAccordionToggle = (lessonId) => {
        setOpenLessons(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
    };
    
    // --- KEY CHANGE ---
    // Changed from `course?.creator` to `course?.createdBy` to match the new API structure.
    const author = course?.createdBy;

    useEffect(() => {
        const checkUserStatus = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                const config = { headers: { 'Authorization': `Bearer ${token}` } };
                try {
                    const { data } = await axios.get('/api/auth/me', config);
                    setUser(data);
                    if (data && data.enrolledCourses?.some(c => c.course?._id === id)) {
                        setIsEnrolled(true);
                    }
                } catch (e) { console.error("Could not fetch user status", e); }
            }
        };

        const fetchCourse = async () => {
            try {
                const { data } = await axios.get(`/api/courses/${id}`);
                setCourse(data);
            } catch (err) {
                setError('Could not find the requested course.');
            } finally {
                setLoading(false);
            }
        };
        
        setLoading(true);
        Promise.all([checkUserStatus(), fetchCourse()]);
    }, [id]);

    const handleEnroll = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const config = { headers: { 'Authorization': `Bearer ${token}` } };

        try {
            if (course.price > 0) {
                const { data } = await axios.post(`/api/courses/${id}/create-checkout-session`, {}, config);
                window.location.href = data.url; // Redirect to Stripe Checkout
            } else {
                await axios.post(`/api/courses/${id}/enroll`, {}, config);
                alert('Successfully enrolled!');
                setIsEnrolled(true);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Enrollment failed.');
        }
    };
    
   if (loading) return <div className="text-center py-20">Loading Course...</div>;
    if (error) return <div className="text-center text-red-500 py-20">{error}</div>;
    if (!course) return <div></div>;

    const isAdmin = user && user.role === 'admin';
    const enrollmentInfo = user?.enrolledCourses?.find(c => c.course?._id === id);
    const continueLink = `/learn/${id}/lesson/${enrollmentInfo?.lastViewedLesson || course?.lessons?.[0]?._id}`;
    
    // This component determines which button to show based on user status
    const ActionButton = () => {
        if (isAdmin) {
            return <Link to={continueLink} className="w-full text-center bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition shadow-lg hover:shadow-purple-400/30">Review Course (Admin)</Link>;
        }
        if (isEnrolled) {
            return <Link to={continueLink} className="w-full text-center bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition shadow-lg hover:shadow-green-400/30">Continue Course</Link>;
        }
        return <button onClick={handleEnroll} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-blue-400/30">Enroll Now for ${course.price}</button>;
    };
  if (loading) return <div className="text-center py-20">Loading Course...</div>;
    if (error) return <div className="text-center text-red-500 py-20">{error}</div>;
    if (!course) return <div></div>;

     return (
        <div className="bg-slate-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200">
            {/* ... (Your header and other JSX is unchanged) ... */}
            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    {/* ... */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                        className="lg:col-span-1"
                    >
                        <div className="sticky top-28 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                            {/* ... */}
                            {/* --- NEW: Clickable Author Profile Card --- */}
                            {author && (
                                <Link to={`/author/${author._id}`} className="block mt-6 group">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-4 transition-all duration-300 group-hover:shadow-xl group-hover:border-blue-500">
                                        
                                        {/* This will now use the populated user data */}
                                        <img src={author.profilePicture} alt={author.fullName || author.name} className="w-14 h-14 rounded-full object-cover"/>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{author.fullName || author.name}</p>
                                            <p className="text-sm text-blue-500 group-hover:underline">View Profile <ArrowRight className="inline w-4 h-4"/></p>
                                        </div>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;
