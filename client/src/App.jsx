import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux'; // Import useSelector
import Header from './components/Header';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CourseCatalog from './pages/CourseCatalog';
import CourseDetail from './pages/CourseDetail';
import AdminCourseEditor from './pages/AdminCourseEditor';
import LessonView from './pages/LessonView';
import MyAccount from './pages/MyAccount';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import AuthorProfile from './pages/AuthorProfile';
import PaymentSuccess from './pages/PaymentSuccess';
import Spinner from './components/Spinner';

function App() {
  // Get the authentication state from the Redux store
  const { loading } = useSelector((state) => state.auth);

  // Display a spinner for the entire page while initial user data is loading
  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Routes>
          {/* Public Routes */}
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

          {/* Protected User Routes */}
          <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
          <Route path="/account" element={<PrivateRoute><MyAccount /></PrivateRoute>} />
          <Route path="/learn/:courseId/lesson/:lessonId" element={<PrivateRoute><LessonView /></PrivateRoute>} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/course/new" element={<AdminRoute><AdminCourseEditor /></AdminRoute>} />
          <Route path="/admin/course/:id" element={<AdminRoute><AdminCourseEditor /></AdminRoute>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;