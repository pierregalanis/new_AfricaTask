import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Menu, X, Home, Briefcase, User, LogOut, 
  LayoutDashboard, Settings, Bell, MessageCircle,
  Shield, Coins
} from 'lucide-react';

const MobileNav = ({ language = 'en' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/login');
  };

  const menuItems = user ? [
    {
      label: language === 'en' ? 'Dashboard' : 'Tableau de bord',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: user.role === 'client' ? '/dashboard' : '/tasker/dashboard'
    },
    {
      label: language === 'en' ? 'Profile' : 'Profil',
      icon: <User className="w-5 h-5" />,
      path: '/profile'
    },
    {
      label: language === 'en' ? 'Services' : 'Services',
      icon: <Briefcase className="w-5 h-5" />,
      path: '/services'
    },
    ...(user.email === 'admin@africatask.com' ? [{
      label: 'Admin Panel',
      icon: <Shield className="w-5 h-5" />,
      path: '/admin'
    }] : [])
  ] : [
    {
      label: language === 'en' ? 'Home' : 'Accueil',
      icon: <Home className="w-5 h-5" />,
      path: '/'
    },
    {
      label: language === 'en' ? 'Services' : 'Services',
      icon: <Briefcase className="w-5 h-5" />,
      path: '/services'
    }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:bg-gray-800 transition"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      >
        <div
          className={`fixed top-0 right-0 bottom-0 w-80 bg-white shadow-2xl transform transition-transform ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-600 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">AfricaTask</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white dark:bg-gray-800/70/20 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {user && (
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white dark:bg-gray-800/70/20 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">{user.full_name}</p>
                  <p className="text-sm text-emerald-100 capitalize">{user.role}</p>
                </div>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="p-4 space-y-2">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-emerald-50 transition-colors group"
              >
                <span className="text-gray-600 dark:text-gray-400 group-hover:text-emerald-600">
                  {item.icon}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-600">
                  {item.label}
                </span>
              </Link>
            ))}

            {user && (
              <>
                <hr className="my-4" />
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors group w-full text-left"
                >
                  <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-red-600" />
                  <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-red-600">
                    {language === 'en' ? 'Logout' : 'Déconnexion'}
                  </span>
                </button>
              </>
            )}

            {!user && (
              <>
                <hr className="my-4" />
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 bg-emerald-600 text-white text-center rounded-lg font-semibold hover:bg-emerald-700 transition"
                >
                  {language === 'en' ? 'Sign In' : 'Se connecter'}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 border-2 border-emerald-600 text-emerald-600 text-center rounded-lg font-semibold hover:bg-emerald-50 transition"
                >
                  {language === 'en' ? 'Sign Up' : 'S\'inscrire'}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNav;
