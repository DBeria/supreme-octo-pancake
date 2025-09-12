import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { FaPlayCircle, FaLock, FaBookOpen } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const CourseDetail = () => {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const { userInfo } = useSelector(state => state.auth);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCourse = async () => {
            const config = userInfo ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
            try {
                const { data } = await axios.get(`/api/courses/${id}`, config);
                setCourse(data);
            } catch (error) {
                console.error('Failed to fetch course', error);
                toast.error(error.response?.data?.message || 'Could not load the course details.');
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
    }, [id, userInfo]);

    const handleCheckout = async () => {
        if (!userInfo) {
            toast.error('Please log in to enroll in a course.');
            navigate('/login');
            return;
        }
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userInfo.token}`,
                },
            };
            const { data } = await axios.post(`/api/courses/${id}/checkout`, {}, config);
            window.location.href = data.redirectUrl; 
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error(error.response?.data?.message || 'Could not initiate checkout.');
        }
    };

    const isEnrolled = userInfo && userInfo.enrolledCourses?.includes(id);
    const isAdmin = userInfo && userInfo.role === 'admin';

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-white bg-slate-950">Loading course...</div>;
    }

    if (!course) {
        return <div className="flex justify-center items-center h-screen text-white bg-slate-950">Course not found.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column */}
                    <div className="lg:col-span-2">
                        <div className="mb-6">
                            <img src={course.thumbnail} alt={course.title} className="w-full h-auto object-cover rounded-xl shadow-2xl mb-4" />
                            <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-cyan-400 tracking-tight">{course.title}</h1>
                            
                            {/* THIS IS THE ONLY CHANGE IN THIS ENTIRE FILE */}
                            {course.author && course.author.fullName && (
                                <p className="mb-6 text-lg text-slate-400">
                                    Created by <span className="font-semibold text-slate-300">{course.author.fullName}</span>
                                </p>
                            )}

                            <p className="text-slate-300 text-lg leading-relaxed">{course.description}</p>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-1">
                        <Card className="bg-slate-900 border-slate-700">
                            <CardHeader>
                                <CardTitle className="flex items-center text-2xl">
                                    <FaBookOpen className="mr-3 text-cyan-400" />
                                    Course Content
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3 mb-6">
                                    {course.lessons.map((lesson, index) => (
                                        <li key={lesson._id || index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg transition-all hover:bg-slate-800">
                                            <div className="flex items-center">
                                                {isEnrolled || isAdmin ? (
                                                    <FaPlayCircle className="text-cyan-400 mr-4 flex-shrink-0" />
                                                ) : (
                                                    <FaLock className="text-red-500 mr-4 flex-shrink-0" />
                                                )}
                                                <span className="font-medium text-slate-300">{lesson.title}</span>
                                            </div>
                                            {(isEnrolled || isAdmin) && (
                                                <Link to={`/courses/${id}/lesson/${index}`}>
                                                    <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-white">Start</Button>
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                <div>
                                    {isEnrolled ? (
                                        <Button className="w-full bg-green-600 hover:bg-green-700 text-lg py-6" asChild>
                                            <Link to={`/courses/${id}/lesson/0`}>Go to Course</Link>
                                        </Button>
                                    ) : (
                                        <Button onClick={handleCheckout} className="w-full bg-cyan-500 hover:bg-cyan-600 text-lg py-6">
                                            Enroll for ${course.price}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;