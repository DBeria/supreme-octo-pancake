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
    
    // State to manage which lesson accordions are open
    const [openLessons, setOpenLessons] = useState({});

    const handleAccordionToggle = (lessonId) => {
        setOpenLessons(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
    };
    
    const author = course?.creator;

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
        // Using Promise.all to fetch data concurrently for better performance
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
    if (!course) return <div className="text-center py-20">Course not found.</div>;

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

    return (
        <div className="bg-slate-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200">
            {/* --- NEW: Modern Hero Section --- */}
            <div className="relative h-[50vh] min-h-[350px] w-full flex items-center justify-center text-white text-center p-6">
                <div className="absolute inset-0 bg-black/60 z-10"></div>
                <img src={course.imageUrl} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    className="relative z-20"
                >
                    <span className="px-3 py-1 text-sm font-semibold bg-blue-500/80 rounded-full">{course.specialty}</span>
                    <h1 className="text-4xl md:text-6xl font-extrabold mt-4 mb-4 max-w-4xl text-shadow">{course.title}</h1>

                    {/* --- NEW: Creator Name and PFP --- */}
                    {author && (
                        <div className="flex items-center justify-center gap-3">
                            <img src={author.profilePicture} alt={author.fullName} className="w-10 h-10 rounded-full object-cover border-2 border-white/80" />
                            <span className="font-semibold">By {author.fullName}</span>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* --- NEW: Modern Two-Column Layout --- */}
            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">

                    {/* Left Column (Main Details) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="lg:col-span-2 space-y-10"
                    >
                        <div>
                            <h2 className="text-3xl font-bold mb-4">About This Course</h2>
                            <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400">{course.description}</p>
                        </div>

                        {/* Displays the new optional instructor welcome note */}
                        {course.instructorWelcomeNote && (
                            <div>
                                <h3 className="text-2xl font-bold mb-4">A Note From Your Instructor</h3>
                                <blockquote className="p-4 border-l-4 border-blue-500 bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-r-lg italic">
                                    {course.instructorWelcomeNote}
                                </blockquote>
                            </div>
                        )}

                        <div>
                            <h2 className="text-3xl font-bold mb-6">Course Content</h2>
                            <div className="space-y-3">
                                {course.lessons?.length > 0 ? course.lessons.map((lesson, index) => (
                                    <div key={lesson._id || index} className="bg-white dark:bg-slate-800/50 rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                                        <button
                                            onClick={() => handleAccordionToggle(lesson._id)}
                                            className="flex justify-between items-center w-full px-6 py-4 text-lg font-semibold text-gray-900 dark:text-white"
                                        >
                                            <span>{lesson.title}</span>
                                            <ChevronDown className={`w-5 h-5 transition-transform ${openLessons[lesson._id] ? 'rotate-180' : ''}`} />
                                        </button>
                                        {openLessons[lesson._id] && (
                                            <div className="p-4 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600">
                                                <ul className="space-y-2">
                                                    {lesson.slides.map((slide, slideIndex) => (
                                                         <li
                                                            key={slide._id || slideIndex}
                                                            className="flex items-center justify-between p-3 rounded-md transition-colors bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                                                        >
                                                            <span>{slide.quiz ? `Quiz ${slideIndex + 1}: ${slide.quiz.question.substring(0, 30)}...` : `Slide ${slideIndex + 1}`}</span>
                                                            {(isEnrolled || isAdmin) && (
                                                                <Link to={`/learn/${course._id}/lesson/${lesson._id}?slideIndex=${slideIndex}`} className="text-blue-500 hover:underline font-semibold text-sm flex-shrink-0">
                                                                    View
                                                                </Link>
                                                            )}
                                                         </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )) : <p className="text-gray-500">Lessons will be available soon.</p>}
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column (Sticky Sidebar) */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.4 }}
                            className="sticky top-24"
                        >
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-5">
                                <ActionButton />
                                <div className="border-t border-slate-200 dark:border-slate-700"></div>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex items-center gap-3">
                                        <BookOpen className="w-5 h-5 text-blue-500"/>
                                        <span className="font-bold mr-2">{course.lessons.length}</span> Lessons
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <BarChart className="w-5 h-5 text-blue-500"/>
                                        <span className="font-bold mr-1">{course.level}</span> Level
                                    </li>
                                </ul>
                            </div>
                            {/* --- NEW: Clickable Author Profile Card --- */}
                            {author && (
                                <Link to={`/author/${author._id}`} className="block mt-6 group">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-4 transition-all duration-300 group-hover:shadow-xl group-hover:border-blue-500">
                                        <img src={author.profilePicture} alt={author.fullName} className="w-14 h-14 rounded-full object-cover"/>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{author.fullName}</p>
                                            <p className="text-sm text-blue-500 group-hover:underline">View Profile <ArrowRight className="inline w-4 h-4"/></p>
                                        </div>
                                    </div>
                                </Link>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;
