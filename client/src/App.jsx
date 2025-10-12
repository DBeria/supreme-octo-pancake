// client/src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from './components/Header';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminCourseEditor from './pages/AdminCourseEditor';
import CourseCatalog from './pages/CourseCatalog';
import CourseDetail from './pages/CourseDetail';
import LessonView from './pages/LessonView';
import MyAccount from './pages/MyAccount';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import AuthorProfile from './pages/AuthorProfile';
import PaymentSuccess from './pages/PaymentSuccess';
import Spinner from './components/common/Spinner';

function App() {
  const { loading } = useSelector((state) => state.auth);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:resettoken" element={<ResetPassword />} />
          <Route path="/courses" element={<CourseCatalog />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/author/:id" element={<AuthorProfile />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />

          {/* Private routes */}
          <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
          <Route path="/account" element={<PrivateRoute><MyAccount /></PrivateRoute>} />
          <Route path="/learn/:courseId/lesson/:lessonId" element={<PrivateRoute><LessonView /></PrivateRoute>} />

          {/* Admin routes */}
          <Route path="/admin/course/new" element={<AdminRoute><AdminCourseEditor /></AdminRoute>} />
          <Route path="/admin/course/:id" element={<AdminRoute><AdminCourseEditor /></AdminRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminCourseEditor /></AdminRoute>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;

