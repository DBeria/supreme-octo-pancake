import React from 'react';
import { Link } from 'react-router-dom';

const CourseCard = ({ course }) => {
    // FIX: Safely handle potentially missing description
    const description = course.description ? course.description.substring(0, 100) + '...' : 'No description available.';

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 border border-slate-200 dark:border-slate-700 flex flex-col">
            <img src={course.imageUrl || 'https://placehold.co/600x400/3B82F6/FFFFFF?text=POCUS'} alt={course.title} className="w-full h-48 object-cover" />
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-semibold uppercase px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">{course.level}</span>
                    <span className="text-xs font-semibold uppercase px-3 py-1 bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300 rounded-full">{course.specialty}</span>
                </div>
                <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white flex-grow">{course.title}</h3>
                {course.tags && course.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {course.tags.map(tag => (
                            <span key={tag} className="text-xs font-medium bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded-full">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{description}</p>
                <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-500">${course.price}</span>
                    <Link to={`/courses/${course._id}`} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm">View Course</Link>
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
