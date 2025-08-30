import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import CourseCard from '../components/CourseCard';
import { Search } from 'lucide-react';

const CourseCatalog = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState('All');
    const [specialtyFilter, setSpecialtyFilter] = useState('All');
    const [tagFilter, setTagFilter] = useState('All');

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const { data } = await axios.get('/api/courses');
                setCourses(data);
            } catch (error) {
                console.error('Failed to fetch courses', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const filteredCourses = useMemo(() => {
        return courses.filter(course => {
            const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || course.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLevel = levelFilter === 'All' || course.level === levelFilter;
            const matchesSpecialty = specialtyFilter === 'All' || course.specialty === specialtyFilter;
            const matchesTag = tagFilter === 'All' || course.tags?.includes(tagFilter);
            return matchesSearch && matchesLevel && matchesSpecialty && matchesTag;
        });
    }, [courses, searchTerm, levelFilter, specialtyFilter, tagFilter]);

    const levels = useMemo(() => ['All', ...new Set(courses.map(c => c.level))], [courses]);
    const specialties = useMemo(() => ['All', ...new Set(courses.map(c => c.specialty))], [courses]);
    const tags = useMemo(() => ['All', ...new Set(courses.flatMap(c => c.tags))], [courses]);

    if (loading) return <div className="text-center py-10">Loading Courses...</div>;

    return (
        <div className="container mx-auto px-6 py-12">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white">Course Catalog</h1>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Browse our complete catalog of expert-led POCUS courses and workshops.</p>
            </div>

            {/* Search and Filter Section */}
            <div className="mb-12 space-y-8">
                {/* Search Bar */}
                <div className="relative w-full max-w-2xl mx-auto">
                    <input
                        type="text"
                        id="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by title or description..."
                        className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-700 rounded-full shadow-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 text-lg"
                    />
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-6 w-6 text-gray-400" />
                    </div>
                </div>

                {/* Filter Buttons */}
                <div className="space-y-4">
                    <div className="flex justify-center items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 mr-2">Level:</span>
                        {levels.map(level => (
                            <button
                                key={level}
                                onClick={() => setLevelFilter(level)}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${levelFilter === level ? 'bg-blue-600 text-white shadow' : 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-center items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 mr-2">Specialty:</span>
                        {specialties.map(spec => (
                             <button
                                key={spec}
                                onClick={() => setSpecialtyFilter(spec)}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${specialtyFilter === spec ? 'bg-blue-600 text-white shadow' : 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                            >
                                {spec}
                            </button>
                        ))}
                    </div>
                    {tags.length > 1 && (
                        <div className="flex justify-center items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 mr-2">Tags:</span>
                            {tags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setTagFilter(tag)}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${tagFilter === tag ? 'bg-blue-600 text-white shadow' : 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {filteredCourses.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCourses.map(course => (
                        <CourseCard key={course._id} course={course} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">No Courses Found</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Try adjusting your search or filter criteria.</p>
                </div>
            )}
        </div>
    );
};

export default CourseCatalog;
