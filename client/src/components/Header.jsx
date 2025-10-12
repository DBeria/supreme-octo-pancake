// client/src/components/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Moon, Settings, Sun, User, X } from 'lucide-react';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  });
  const loggedIn = !!user;

  // Sync user from localStorage on navigation/storage/focus so header updates after login
  useEffect(() => {
    const sync = () => setUser(() => {
      try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
    });
    sync();
    const onStorage = (e) => { if (e.key === 'user' || e.key === 'token' || e.key === 'userInfo') sync(); };
    const onFocus = () => sync();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [location.pathname]);

  // Theme handling
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-blue-600 dark:text-blue-500">POCUS World</Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center space-x-8">
          <Link to="/courses" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Courses</Link>
          <Link to="/blog" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Blog</Link>
          <button onClick={toggleTheme} className="p-2 rounded-full border border-slate-300 dark:border-slate-700">
            {theme === 'dark' ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span className="text-gray-700 dark:text-gray-200">{loggedIn ? (user?.name || 'Account') : 'Guest'}</span>
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                {loggedIn ? (
                  <ul className="py-2">
                    <li><Link to="/dashboard" className="block px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700">Dashboard</Link></li>
                    {user?.role === "admin" && (<li><Link to="/admin" className="block px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700">Admin</Link></li>)}
                    <li><Link to="/account" className="block px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700"><span className="inline-flex items-center gap-2"><Settings className="w-4 h-4"/>Account</span></Link></li>
                  </ul>
                ) : (
                  <ul className="py-2">
                    <li><Link to="/login" className="block px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700">Login</Link></li>
                    <li><Link to="/register" className="block px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700">Register</Link></li>
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <button className="lg:hidden" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800">
          <div className="px-6 py-4 space-y-4">
            <Link to="/courses" onClick={()=>setIsMobileMenuOpen(false)} className="block">Courses</Link>
            <Link to="/blog" onClick={()=>setIsMobileMenuOpen(false)} className="block">Blog</Link>
            <button onClick={toggleTheme} className="p-2 rounded-full border border-slate-300 dark:border-slate-700">
              {theme === 'dark' ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
            </button>
            {loggedIn ? (
              <>
                <Link to="/dashboard" onClick={()=>setIsMobileMenuOpen(false)} className="block">Dashboard</Link>
                {loggedIn && user?.role === "admin" && (<Link to="/admin" onClick={()=>setIsMobileMenuOpen(false)} className="block">Admin</Link>)}
                <Link to="/account" onClick={()=>setIsMobileMenuOpen(false)} className="block">Account</Link>
              </>
            ) : (
              <>
                <Link to="/login" onClick={()=>setIsMobileMenuOpen(false)} className="block">Login</Link>
                <Link to="/register" onClick={()=>setIsMobileMenuOpen(false)} className="block">Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
