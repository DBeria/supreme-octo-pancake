import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CalendarIcon, ClockIcon, UsersIcon, AwardIcon } from 'lucide-react';
import axios from 'axios';
import {
    Container,
    Button,
    Badge,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Avatar,
    AvatarImage,
    AvatarFallback
} from '../components/ui';

const CourseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchCourseAndUser = async () => {
            try {
                const courseRes = await axios.get(`/api/courses/${id}`);
                setCourse(courseRes.data);

                const token = localStorage.getItem('token');
                if (token) {
                    const userRes = await axios.get('/api/users/profile', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setUser(userRes.data);

                    const enrollmentRes = await axios.get(`/api/courses/${id}/enrollment-status`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setIsEnrolled(enrollmentRes.data.isEnrolled);
                }
            } catch (err) {
                setError('Failed to load course details or user data. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCourseAndUser();
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
                if (data && data.url) {
                    window.location.href = data.url; // Redirect to Stripe Checkout
                } else {
                    throw new Error("Invalid response from checkout session API.");
                }
            } else {
                await axios.post(`/api/courses/${id}/enroll`, {}, config);
                alert('Successfully enrolled!');
                setIsEnrolled(true);
            }
        } catch (err) {
            console.error('Enrollment error:', err);
            alert(err.response?.data?.message || 'Enrollment failed. Please try again or contact support.');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-white">Loading...</div>;
    }

    if (error) {
        return <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-red-500">{error}</div>;
    }

    if (!course) {
        return <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900 text-white">Course not found.</div>;
    }

    return (
        <Container className="py-8 lg:py-16">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                <div className="lg:w-2/3">
                    <img src={course.imageUrl} alt={course.title} className="w-full h-80 object-cover rounded-xl shadow-lg mb-6 lg:mb-8" />
                    <div className="flex flex-wrap gap-2 mb-4">
                        {course.categories.map(category => (
                            <Badge key={category} variant="secondary">{category}</Badge>
                        ))}
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">{course.title}</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">{course.description}</p>
                    <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400 text-sm mb-8">
                        <div className="flex items-center gap-2"><ClockIcon size={16} />{course.duration}</div>
                        <div className="flex items-center gap-2"><UsersIcon size={16} />{course.enrollmentCount} students</div>
                    </div>

                    <Tabs defaultValue="overview">
                        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                            <TabsTrigger value="instructor">Instructor</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="mt-6">
                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">What you'll learn</h2>
                            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 mb-6">
                                {course.learningObjectives.map((objective, index) => (
                                    <li key={index}>{objective}</li>
                                ))}
                            </ul>
                        </TabsContent>
                        <TabsContent value="curriculum" className="mt-6">
                            <div className="space-y-4">
                                {course.lessons.map((lesson, index) => (
                                    <Card key={index} className="dark:bg-slate-800 dark:border-slate-700">
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-900 dark:text-white">
                                                <span>Lesson {index + 1}: {lesson.title}</span>
                                                {isEnrolled && (
                                                    <Button onClick={() => navigate(`/lesson/${course._id}/${lesson._id}`)} size="sm">
                                                        Start Lesson
                                                    </Button>
                                                )}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{lesson.slides.length} slides</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                        <TabsContent value="instructor" className="mt-6">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={course.creator.avatarUrl} />
                                    <AvatarFallback>{course.creator.fullName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{course.creator.fullName}</h3>
                                    <p className="text-gray-600 dark:text-gray-400">{course.creator.bio}</p>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="lg:w-1/3">
                    <Card className="dark:bg-slate-800 dark:border-slate-700 sticky top-24">
                        <CardHeader className="p-6 pb-0">
                            <CardTitle className="text-4xl font-bold text-gray-900 dark:text-white">
                                {course.price > 0 ? `$${course.price}` : 'Free'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-4">
                            <div className="space-y-4 mb-6">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <ClockIcon size={18} />
                                    <span>{course.duration} of content</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <CalendarIcon size={18} />
                                    <span>Lifetime access</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <AwardIcon size={18} />
                                    <span>Certificate of completion</span>
                                </div>
                            </div>
                            <Button
                                onClick={isEnrolled ? () => navigate(`/lesson/${course._id}/${course.lessons[0]?._id}`) : handleEnroll}
                                className="w-full text-lg py-3"
                                disabled={isEnrolled && !course.lessons[0]}
                            >
                                {isEnrolled ? "Go to First Lesson" : (course.price > 0 ? "Enroll Now" : "Enroll for Free")}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Container>
    );
};

export default CourseDetail;