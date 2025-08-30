import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, LayoutDashboard, Shield, Settings, Menu, X } from 'lucide-react';
import axios from 'axios';

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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    
    const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
    const [user, setUser] = useState(null);
    const [profilePicture, setProfilePicture] = useState(null);
    
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // NEW: State for mobile menu

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const handleStorageChange = () => {
            setLoggedIn(!!localStorage.getItem('token'));
        };

        handleStorageChange();
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('focus', handleStorageChange);
        window.addEventListener('storageChanged', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', handleStorageChange);
            window.removeEventListener('storageChanged', handleStorageChange);
        };
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            if (loggedIn) {
                const token = localStorage.getItem('token');
                const storedUser = JSON.parse(localStorage.getItem('user'));
                setUser(storedUser);

                if (storedUser && storedUser.role === 'admin' && token) {
                    try {
                        const config = { headers: { 'Authorization': `Bearer ${token}` } };
                        const { data } = await axios.get('/api/authors/my-profile', config);
                        setProfilePicture(data.profilePicture);
                    } catch (error) {
                        console.error("Could not fetch author profile picture for header", error);
                    }
                }
            } else {
                setUser(null);
                setProfilePicture(null);
            }
        };

        fetchUserData();
    }, [loggedIn]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsMenuOpen(false);
        setIsMobileMenuOpen(false); // Close mobile menu on logout
        window.dispatchEvent(new Event("storageChanged"));
        navigate('/login');
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    // NEW: Function to toggle the mobile menu
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
            <nav className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                        POCUS World
                    </Link>
                    {/* Desktop Navigation Links */}
                    <div className="hidden lg:flex items-center space-x-8">
                        <Link to="/courses" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors duration-200">Courses</Link>
                        <Link to="/blog" className="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors duration-200">Blog</Link>
                    </div>
                    {/* Desktop User/Auth buttons */}
                    <div className="hidden lg:flex items-center space-x-4">
                        {loggedIn && user && user.role === 'user' && (
                            <Link to="/dashboard" className="px-4 py-2 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 transition hidden lg:block">Dashboard</Link>
                        )}
                        {loggedIn && user && user.role === 'admin' && (
                            <Link to="/admin" className="px-4 py-2 rounded-lg text-white font-semibold bg-purple-600 hover:bg-purple-700 transition hidden lg:block">Admin</Link>
                        )}
                        
                        {loggedIn && user ? (
                            <div className="relative" ref={menuRef}>
                                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 pl-2 pr-4 py-1 rounded-full font-semibold text-gray-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                    {user.role === 'admin' && profilePicture ? (
                                        <img src={profilePicture} alt="Admin" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                                            <User size={18} />
                                        </div>
                                    )}
                                    <span>{user.name}</span>
                                </button>
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-700 py-2">
                                        
                                        <button onClick={toggleTheme} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                                            {theme === 'dark' ? <SunIcon /> : <MoonIcon />} <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
                                        </button>

                                        <Link to="/account" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                                            <Settings size={16} /> Settings
                                        </Link>
                                        <div className="my-2 border-t border-slate-200 dark:border-slate-700"></div>
                                        <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50">
                                            <LogOut size={16} /> Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="text-gray-600 dark:text-gray-300 font-medium hover:text-blue-500 transition-colors duration-200">Login</Link>
                                <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm">
                                    Register
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="lg:hidden flex items-center space-x-4">
                        <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors duration-200">
                            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                        </button>
                        <button onClick={toggleMobileMenu} className="text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors duration-200">
                            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </nav>
            {/* Mobile Menu Content */}
            {isMobileMenuOpen && (
                <div className="lg:hidden absolute top-16 left-0 right-0 bg-white dark:bg-slate-900 shadow-lg border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex flex-col items-center space-y-4 py-4">
                        <Link to="/courses" onClick={toggleMobileMenu} className="block w-full text-center py-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors duration-200">Courses</Link>
                        <Link to="/blog" onClick={toggleMobileMenu} className="block w-full text-center py-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors duration-200">Blog</Link>
                        <div className="w-1/2 border-t border-slate-200 dark:border-slate-700"></div>
                        {loggedIn && user ? (
                            <>
                                {user.role === 'user' && (
                                    <Link to="/dashboard" onClick={toggleMobileMenu} className="w-full text-center py-2 px-4 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 transition-all duration-200">Dashboard</Link>
                                )}
                                {user.role === 'admin' && (
                                    <Link to="/admin" onClick={toggleMobileMenu} className="w-full text-center py-2 px-4 rounded-lg text-white font-semibold bg-purple-600 hover:bg-purple-700 transition-all duration-200">Admin</Link>
                                )}
                                <Link to="/account" onClick={toggleMobileMenu} className="w-full text-center py-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 transition-colors duration-200">Settings</Link>
                                <button onClick={handleLogout} className="w-full text-center py-2 text-red-600 dark:text-red-400 hover:text-red-700 transition-colors duration-200">Logout</button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" onClick={toggleMobileMenu} className="w-full text-center py-2 text-gray-600 dark:text-gray-300 font-medium hover:text-blue-500 transition-colors duration-200">Login</Link>
                                <Link to="/register" onClick={toggleMobileMenu} className="w-full text-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm">
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;