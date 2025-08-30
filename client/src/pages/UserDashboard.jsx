import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';

const EnrolledCourseCard = ({ enrollment }) => {
    const calculateProgress = () => {
        if (!enrollment.course?.lessons || enrollment.course.lessons.length === 0) return 0;

        let completedItemsCount = 0;
        let totalItems = 0;

        const lessons = enrollment.course.lessons;
        const lastViewedLessonId = enrollment.lastViewedLesson;
        const lastViewedSlideIndex = enrollment.lastViewedSlideIndex;

        let foundLastViewed = false;

        for (let lesson of lessons) {
            if (lesson.isFinalExam) {
                totalItems += 1;
                if (enrollment.isCompleted) {
                    completedItemsCount += 1;
                }
            } else {
                totalItems += lesson.slides.length;
                if (lesson._id === lastViewedLessonId) {
                    completedItemsCount += (lastViewedSlideIndex || 0) + 1;
                    foundLastViewed = true;
                } else if (!foundLastViewed) {
                    completedItemsCount += lesson.slides.length;
                }
            }
        }
        
        if (totalItems === 0) return 0;

        return Math.min(100, (completedItemsCount / totalItems) * 100);
    };

    const progressPercentage = calculateProgress();
    
    // Safely access course properties
    const firstLesson = enrollment.course?.lessons?.find(l => !l.isFinalExam) || enrollment.course?.lessons?.[0];
    const firstLessonId = firstLesson?._id;
    const continueLessonId = enrollment.lastViewedLesson || firstLessonId;
    const continueLink = continueLessonId ? `/learn/${enrollment.course._id}/lesson/${continueLessonId}?slideIndex=${enrollment.lastViewedSlideIndex || 0}` : '#';
    const buttonText = progressPercentage > 0 ? 'Continue Learning' : 'Start Course';

    // Guard clause for missing course data
    if (!enrollment.course) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
            <img 
                src={enrollment.course.imageUrl || 'https://placehold.co/600x400/3B82F6/FFFFFF?text=POCUS'} 
                alt={enrollment.course.title} 
                className="w-full h-40 object-cover" 
            />
            <div className="p-6 flex flex-col flex-grow">
                <h3 className="font-bold text-lg mb-2 truncate text-gray-900 dark:text-white">{enrollment.course.title}</h3>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 mb-2">
                    <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${Math.round(progressPercentage)}%` }}
                    ></div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{Math.round(progressPercentage)}% Complete</p>
                <Link 
                    to={continueLink}
                    className={`mt-auto text-center bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm ${!continueLessonId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={(e) => !continueLessonId && e.preventDefault()}
                >
                    {buttonText}
                </Link>
            </div>
        </div>
    );
};

const UserDashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const location = useLocation();

    // NEW: Function to handle the download
    const handleDownloadCertificate = (certificateData, courseTitle) => {
        if (certificateData) {
            saveAs(certificateData, `Certificate_of_Completion_${courseTitle}.png`);
        } else {
            alert("Certificate data not found.");
        }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication error. Please log in again.');
                setLoading(false);
                return;
            }
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            try {
                const res = await axios.get('/api/auth/me', config);
                setUser(res.data);
            } catch (err) {
                console.error('Failed to fetch user data:', err);
                setError('Could not load your dashboard. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [location.key]);

    if (loading) return <div className="text-center py-10">Loading Dashboard...</div>;
    if (error) return <div className="text-center text-red-500 py-10">{error}</div>;
    if (!user) return <div className="text-center py-10">User data not found. Please log in again.</div>;

    return (
        <div className="container mx-auto px-6 py-12">
            <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">Welcome, {user?.name}</h1>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">My Enrolled Courses</h2>
                {user?.enrolledCourses?.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {user.enrolledCourses
                            .filter(enrollment => enrollment && enrollment.course) // FIX: Add this filter
                            .map((enrollment) => (
                                <EnrolledCourseCard key={enrollment.course._id} enrollment={enrollment} />
                            ))}
                    </div>
                ) : (
                    <p className="text-gray-600 dark:text-gray-400">You are not enrolled in any courses yet. <Link to="/courses" className="text-blue-500 hover:underline">Browse courses</Link>.</p>
                )}
            </div>
            
            {user?.enrolledCourses?.some(e => e.isCompleted && e.certificate) && (
                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                        <Download size={24} /> My Certificates
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {user.enrolledCourses
                            .filter(e => e.isCompleted && e.certificate)
                            .map(enrollment => (
                            <div key={enrollment.course._id} className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg flex items-center justify-between">
                                <span className="font-semibold">{enrollment.course.title}</span>
                                <button
                                    onClick={() => handleDownloadCertificate(enrollment.certificate, enrollment.course.title)}
                                    className="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
                                >
                                    View Certificate
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;