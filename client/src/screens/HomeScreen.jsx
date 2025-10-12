
import React from 'react';
import { useGetCoursesQuery } from '../slices/coursesApiSlice';
import Loader from '../components/Loader';
import Message from '../components/Message';
import Course from '../components/Course';

const HomeScreen = () => {
  const { data: courses, isLoading, error } = useGetCoursesQuery();

  return (
    <div>
      {/* IMPROVEMENT: Added a loading spinner for better user experience */}
      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">
          {error?.data?.message || error.error}
        </Message>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <Course course={course} key={course._id} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeScreen;

