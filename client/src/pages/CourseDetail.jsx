import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { BookOpen } from 'lucide-react';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

const CourseDetail = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    (async () => {
      setError('');
      setLoading(true);
      try {
        const { data } = await axios.get(`/api/courses/${id}`);
        setCourse(data);
      } catch (e) {
        console.error(e);
        setError(e.response?.data?.message || 'Could not load the course details.');
        toast.error(e.response?.data?.message || 'Could not load the course details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleCheckout = async () => {
    if (!userInfo) {
      toast.error('Please log in to enroll in a course.');
      return;
    }
    try {
      const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
      const { data } = await axios.post(`/api/courses/${id}/create-checkout-session`, {}, config);
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Could not initiate checkout.');
    }
  };

  const isAdmin = !!userInfo && userInfo.role === 'admin';
  const isEnrolled = !!userInfo && Array.isArray(userInfo.enrolledCourses) && userInfo.enrolledCourses.some((en) => {
    const cid = typeof en.course === 'object' && en.course?._id ? en.course._id : en.course;
    return cid === id || cid === course?._id;
  });

  const author = course ? (course.authorProfile || course.createdBy || null) : null;
  const authorId = course?.createdBy?._id || course?.authorProfile?.user || null;

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

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold mb-2">Error</h1>
          <p className="opacity-80">{error}</p>
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
              {course?.imageUrl && (
                <img
                  src={course.imageUrl}
                  alt={course?.title || 'Course'}
                  className="w-full h-auto object-cover rounded-xl shadow-2xl mb-4"
                />
              )}
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">{course?.title || 'Course'}</h1>
              <p className="mb-6 text-lg text-slate-300">{course?.description || ''}</p>
            </div>

            {/* Instructor */}
            {author && (
              <div className="mt-6 flex items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700">
                <img
                  src={(author.profilePicture || author.avatarUrl) || '/default-avatar.png'}
                  alt={(author.fullName || author.name) || 'Instructor'}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-600"
                />
                <div>
                  <p className="text-sm text-slate-400">Instructor</p>
                  <h3 className="text-lg font-semibold">
                    {(author.fullName || author.name) || 'Instructor'}
                  </h3>
                  {author.bio && <p className="text-slate-400 text-sm mt-1">{author.bio}</p>}
                  {authorId && (
                    <p className="mt-2">
                      <Link className="text-cyan-400 hover:underline" to={`/author/${authorId}`}>View Profile</Link>
                    </p>
                  )}
                </div>
              </div>
            )}
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
                  {Array.isArray(course?.lessons) && course.lessons.map((lesson) => (
                    <li key={lesson._id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center">
                        {(isEnrolled || isAdmin) ? (
                          <span className="inline-flex items-center">
                            <span className="mr-2">▶</span>{lesson.title}
                          </span>
                        ) : (
                          <span className="inline-flex items-center opacity-70">
                            <span className="mr-2">🔒</span>{lesson.title}
                          </span>
                        )}
                      </div>
                      {(isEnrolled || isAdmin) && (
                        <Link to={`/learn/${id}/lesson/${lesson._id}`}>
                          <Button size="sm" variant="secondary">Start</Button>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>

                {isEnrolled ? (
                  <Link to={`/learn/${id}/lesson/${course?.lessons?.[0]?._id || ''}`}>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-lg py-6">
                      Go to Course
                    </Button>
                  </Link>
                ) : (
                  <Button onClick={handleCheckout} className="w-full bg-cyan-500 hover:bg-cyan-600 text-lg py-6">
                    Enroll for ${course?.price ?? 0}
                  </Button>
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
