import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Download, BookOpen, User, Mail } from 'lucide-react'; // Added Mail icon
import CourseCard from '../components/CourseCard';

const AuthorProfile = () => {
    const { id } = useParams();
    const [author, setAuthor] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const authorRes = await axios.get(`/api/authors/by-user/${id}`);
                setAuthor(authorRes.data);

                const coursesRes = await axios.get('/api/courses');
                setCourses(coursesRes.data.filter(c => {
                    const created = c.createdBy;
                    const creatorId = (created && typeof created === 'object') ? created._id : created;
                    return String(creatorId) === String(id);
                }));
            } catch (err) {
                console.error('Failed to fetch author data', err);
                setError('Could not load author profile.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="text-center py-20 text-gray-700 dark:text-gray-300">Loading Profile...</div>;
    if (error) return <div className="text-center text-red-500 py-10">{error}</div>;
    if (!author) return <div className="text-center py-10">Author not found.</div>;

    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
            {/* --- Professional Header Section --- */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="container mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <img 
                            src={author.profilePicture || 'https://via.placeholder.com/150'}
                            alt={author.fullName} 
                            className="w-28 h-28 rounded-full object-cover border-4 border-slate-200 dark:border-slate-600 flex-shrink-0" 
                        />
                        <div className="flex-grow">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{author.fullName}</h1>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">POCUS World Instructor</p>
                            
                            {/* --- NEW: Email Address Display --- */}
                            {author.user?.email && (
                                <div className="mt-2">
                                    <a 
                                        href={`mailto:${author.user.email}`} 
                                        className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <Mail size={16} />
                                        <span>{author.user.email}</span>
                                    </a>
                                </div>
                            )}
                        </div>
                        {author.cv && (
                            <a 
                                href={author.cv} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-md font-semibold hover:bg-blue-700 transition shadow-sm flex-shrink-0"
                            >
                                <Download size={18} /> View CV
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* --- Main Content Area --- */}
            <main className="container mx-auto px-6 py-12">
                {/* Biography Section */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 mb-12">
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-3">
                        <User size={24} className="text-blue-500"/>
                        Biography
                    </h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                        <p className="whitespace-pre-wrap">{author.bio}</p>
                    </div>
                </div>

                {/* Courses Section */}
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8">Courses by {author.fullName.split(' ')[0]}</h2>
                    {courses.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {courses.map(course => (
                                <CourseCard key={course._id} course={course} />
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
                             <p className="text-lg text-gray-500 dark:text-gray-400">No courses have been published by this author yet.</p>
                        </div>
                    )}
                </div>
            
            {/* CV Preview / Download */}
            {author.cvUrl && (
              <section className="max-w-5xl mx-auto px-6 mt-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-200">Curriculum Vitae</h3>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-600 dark:text-slate-300 break-all">{author.cvUrl}</span>
                    <a href={author.cvUrl} target="_blank" rel="noreferrer" className="px-3 py-1 rounded bg-cyan-600 text-white text-sm">Open</a>
                  </div>
                  <div className="w-full h-[600px] bg-slate-100 dark:bg-slate-900 rounded overflow-hidden">
                    <object data={author.cvUrl} type="application/pdf" width="100%" height="100%">
                      <p className="p-4 text-slate-600 dark:text-slate-300">
                        PDF preview is not available. <a className="text-cyan-600 underline" href={author.cvUrl} target="_blank" rel="noreferrer">Click here to download.</a>
                      </p>
                    </object>
                  </div>
                </div>
              </section>
            )}
          </main>
        
        </div>
    );
};

export default AuthorProfile;