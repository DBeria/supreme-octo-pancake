import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { BarChart, BookOpen, CheckCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button.jsx';
import { toast } from 'react-hot-toast';
import { FaPlayCircle, FaLock, FaArrowRight } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';


const CourseDetail = () => {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const { userInfo } = useSelector(state => state.auth);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const { data } = await axios.get(`/api/courses/${id}`);
                setCourse(data);
            } catch (error) {
                console.error('Failed to fetch course', error);
                toast.error(error.response?.data?.message || 'Could not load the course details.');
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
    }, [id]);

    const handleCheckout = async () => {
        if (!userInfo) {
            toast.error('Please log in to enroll in a course.');
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            const { data } = await axios.post(`/api/courses/${id}/create-checkout-session`, {}, config);
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error(error.response?.data?.message || 'Could not initiate checkout.');
        }
    };

    const isEnrolled = userInfo && userInfo.enrolledCourses?.some(enrolledCourse => enrolledCourse.course === id || enrolledCourse.course?._id === id);
    const isAdmin = userInfo && userInfo.role === 'admin';
    
    // --- THIS IS THE CHANGE ---
    // We explicitly check if 'course' exists before trying to access 'createdBy'.
    // This prevents any potential errors if the course data is still loading or fails to load.
    const author = course ? course.createdBy : null;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 p-8">
                <div className="max-w-7xl mx-auto">
                    <Skeleton className="w-3/4 h-12 mb-4" />
                    <Skeleton className="w-full h-96 mb-8" />
                </div>
            </div>
        );
    }
    
    if (!course) {
        return <div className="flex justify-center items-center h-screen text-white bg-slate-950">Course not found.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="mb-6">
                            <img src={course.imageUrl} alt={course.title} className="w-full h-auto object-cover rounded-xl shadow-2xl mb-4" />
                            <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-cyan-400 tracking-tight">{course.title}</h1>
                            
                            <p className="mb-6 text-lg text-slate-400">
                                Created by <span className="font-semibold text-slate-300">{author ? (author.fullName || author.name) : 'Unknown Author'}</span>
                            </p>

                            <p className="text-slate-300 text-lg leading-relaxed">{course.description}</p>
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <Card className="bg-slate-900 border-slate-700 sticky top-28">
                            <CardHeader>
                                <CardTitle className="flex items-center text-2xl">
                                    <BookOpen className="mr-3 text-cyan-400" />
                                    Course Content
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 mb-6">
                                    {course.lessons && course.lessons.map((lesson, index) => (
                                        <li key={lesson._id || index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                            <div className="flex items-center">
                                                {isEnrolled || isAdmin ? (
                                                    <FaPlayCircle className="text-cyan-400 mr-4 flex-shrink-0" />
                                                ) : (
                                                    <FaLock className="text-red-500 mr-4 flex-shrink-0" />
                                                )}
                                                <span className="font-medium text-slate-300">{lesson.title}</span>
                                            </div>
                                            {(isEnrolled || isAdmin) && (
                                                <Link to={`/learn/${id}/lesson/${lesson._id}`}>
                                                    <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-white">Start</Button>
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                <div>
                                    {isEnrolled ? (
                                        <Button className="w-full bg-green-600 hover:bg-green-700 text-lg py-6" asChild>
                                            <Link to={`/learn/${id}/lesson/${course.lessons?.[0]?._id}`}>Go to Course</Link>
                                        </Button>
                                    ) : (
                                        <Button onClick={handleCheckout} className="w-full bg-cyan-500 hover:bg-cyan-600 text-lg py-6">
                                            Enroll for ${course.price}
                                        </Button>
                                    )}
                                </div>
                                {author && (
                                    <Link to={`/author/${author._id}`} className="block mt-6 group">
                                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                                            <img src={author.profilePicture} alt={author.fullName || author.name} className="w-14 h-14 rounded-full object-cover"/>
                                            <div>
                                                <p className="font-bold text-white">{author.fullName || author.name}</p>
                                                <p className="text-sm text-cyan-400 group-hover:underline">View Profile <FaArrowRight className="inline w-3 h-3 ml-1"/></p>
                                            </div>
                                        </div>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;