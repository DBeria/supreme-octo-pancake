// client/src/components/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, Menu, X } from 'lucide-react';

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 18v-1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const Header = () => {
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const loggedIn = !!user;

  // Theme handling
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setIsMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/login');
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-500">POCUS World</Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center space-x-8">
          <Link to="/courses" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition">Courses</Link>
          <Link to="/blog" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition">Blog</Link>
        </div>

        {/* Desktop User Menu */}
        <div className="hidden lg:flex items-center space-x-4">
          {loggedIn && user ? (
            <>
              {user.role === 'admin' ? (
                <Link to="/admin/course/new" className="px-4 py-2 rounded-lg text-white font-semibold bg-purple-600 hover:bg-purple-700 transition">Admin</Link>
              ) : (
                <Link to="/dashboard" className="px-4 py-2 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 transition">Dashboard</Link>
              )}
              <Link to="/account" className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:text-blue-500 transition">Settings</Link>
              <button onClick={handleLogout} className="px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:text-red-700 transition">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 dark:text-gray-300 font-medium hover:text-blue-500 transition">Login</Link>
              <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Register</Link>
            </>
          )}
          <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:text-blue-500 ml-4">
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center space-x-4">
          <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:text-blue-500">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
          <button onClick={toggleMobileMenu} className="text-gray-600 dark:text-gray-300 hover:text-blue-500">{isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}</button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-white dark:bg-slate-900 shadow-lg border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex flex-col items-center space-y-4 py-4">
            <Link to="/courses" onClick={toggleMobileMenu} className="w-full text-center py-2 text-gray-600 dark:text-gray-300 hover:text-blue-500">Courses</Link>
            <Link to="/blog" onClick={toggleMobileMenu} className="w-full text-center py-2 text-gray-600 dark:text-gray-300 hover:text-blue-500">Blog</Link>
            <div className="w-1/2 border-t border-slate-200 dark:border-slate-700"></div>
            {loggedIn && user ? (
              <>
                {user.role === 'admin' ? (
                  <Link to="/admin/course/new" onClick={toggleMobileMenu} className="w-full text-center py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700">Admin</Link>
                ) : (
                  <Link to="/dashboard" onClick={toggleMobileMenu} className="w-full text-center py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Dashboard</Link>
                )}
                <Link to="/account" onClick={toggleMobileMenu} className="w-full text-center py-2 text-gray-600 dark:text-gray-300 hover:text-blue-500">Settings</Link>
                <button onClick={handleLogout} className="w-full text-center py-2 text-red-600 dark:text-red-400 hover:text-red-700">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={toggleMobileMenu} className="w-full text-center py-2 text-gray-600 dark:text-gray-300 hover:text-blue-500">Login</Link>
                <Link to="/register" onClick={toggleMobileMenu} className="w-full text-center py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
