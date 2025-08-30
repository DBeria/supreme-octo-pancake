import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Award, Heart, Stethoscope, Quote, Clock, BookOpen, BarChart2 } from 'lucide-react';

const Home = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const { data } = await axios.get('/api/courses');
                // Filter courses to show only public ones
                setCourses(data.filter(course => course.isPublic));
            } catch (error) {
                console.error('Failed to fetch courses', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100,
            },
        },
    };

    const featuredCourses = courses.slice(0, 3);
    const courseOfTheMonth = courses[0];

    if (loading) {
        return <div className="text-center py-32 dark:bg-slate-900 text-gray-400">Loading courses...</div>;
    }

    return (
        <div className="bg-slate-900 text-gray-200">
            {/* Hero Section */}
            <section className="container mx-auto px-6 py-32 text-center relative z-10">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold leading-tight text-white mb-4 drop-shadow-md">
                        Advance Your Skills in Point-of-Care Ultrasound
                    </motion.h1>
                    <motion.p variants={itemVariants} className="text-lg md:text-xl mb-8 max-w-3xl mx-auto text-gray-300 drop-shadow-sm">
                        High-quality, interactive POCUS training designed for medical professionals. Master critical diagnostic techniques with our expert-led courses.
                    </motion.p>
                    <motion.div variants={itemVariants}>
                        <Link 
                            to="/courses" 
                            className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition transform hover:scale-105 shadow-lg"
                        >
                            Explore Our Courses
                        </Link>
                    </motion.div>
                </motion.div>
            </section>
            
            {/* Course of the Month Section (if available) */}
            {courseOfTheMonth && (
                <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white py-20">
                    <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center gap-12">
                        <motion.div 
                            initial={{ x: -50, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.8 }}
                            className="w-full lg:w-1/2"
                        >
                            <span className="inline-block text-sm font-bold uppercase px-4 py-1.5 rounded-full bg-yellow-400 text-yellow-900">Course of the Month</span>
                            <h2 className="text-4xl font-bold mt-4 mb-3">{courseOfTheMonth.title}</h2>
                            <p className="text-lg text-blue-100 mb-6">{courseOfTheMonth.description}</p>
                            <div className="flex items-center space-x-6 text-sm mb-6">
                                <span className="flex items-center gap-2"><BookOpen size={16} className="text-yellow-400" /> {courseOfTheMonth.lessons?.length || 0} Lessons</span>
                                <span className="flex items-center gap-2"><BarChart2 size={16} className="text-yellow-400" /> {courseOfTheMonth.level}</span>
                            </div>
                            <Link to={`/courses/${courseOfTheMonth._id}`} className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition shadow-md">
                                Learn More
                            </Link>
                        </motion.div>
                        <motion.div
                            initial={{ x: 50, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.8 }}
                            className="w-full lg:w-1/2 flex justify-center"
                        >
                            <img src={courseOfTheMonth.imageUrl} alt={courseOfTheMonth.title} className="rounded-2xl shadow-xl w-full max-w-lg" />
                        </motion.div>
                    </div>
                </section>
            )}

            {/* Featured Courses Section */}
            {featuredCourses.length > 0 && (
                <section className="bg-white dark:bg-slate-800 py-16">
                    <div className="container mx-auto px-6">
                        <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-10 text-center">Our Courses</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {featuredCourses.map(course => (
                                <CourseCard key={course._id} course={course} />
                            ))}
                        </div>
                        <div className="text-center mt-12">
                             <Link 
                                to="/courses" 
                                className="inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold text-lg hover:underline"
                            >
                                View All Courses 
                            </Link>
                        </div>
                    </div>
                </section>
            )}
            
            {/* What Our Students Say Section */}
            <section className="bg-slate-900 py-20 text-white">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <Quote size={48} className="mx-auto text-blue-500 mb-6" />
                        <h2 className="text-3xl font-extrabold mb-4">What Our Students Say</h2>
                        <blockquote className="text-xl italic font-medium leading-relaxed text-gray-300">
                            "The Cardiac Ultrasound course was a game-changer for my clinical practice. The lessons were incredibly clear, and the interactive elements made complex concepts easy to understand. I feel much more confident in my ability to perform POCUS at the bedside."
                        </blockquote>
                        <div className="mt-8 flex flex-col items-center">
                            <span className="font-semibold text-white text-lg">Dr. Jane Smith</span>
                            <span className="text-sm text-gray-400">Emergency Physician, New York</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Choose Us Section */}
            <section className="bg-white dark:bg-slate-800 py-20 text-center">
                <div className="container mx-auto px-6">
                    <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-12">Why Choose POCUS World?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="p-6 bg-slate-100 dark:bg-slate-700 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700">
                            <Stethoscope size={48} className="text-blue-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Expert-Led Training</h3>
                            <p className="text-gray-600 dark:text-gray-400">Our courses are designed and taught by experienced medical professionals who are leaders in the field of POCUS.</p>
                        </div>
                        <div className="p-6 bg-slate-100 dark:bg-slate-700 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700">
                            <Award size={48} className="text-yellow-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Certified Learning</h3>
                            <p className="text-gray-600 dark:text-gray-400">Earn official certificates of completion that validate your new skills and enhance your professional credentials.</p>
                        </div>
                        <div className="p-6 bg-slate-100 dark:bg-slate-700 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700">
                            <Heart size={48} className="text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Patient-Centered Care</h3>
                            <p className="text-gray-600 dark:text-gray-400">Apply your POCUS skills to provide faster, more accurate diagnoses and improve patient outcomes in any clinical setting.</p>
                        </div>
                    </div>
                </div>
            </section>
            
        </div>
    );
};

export default Home;