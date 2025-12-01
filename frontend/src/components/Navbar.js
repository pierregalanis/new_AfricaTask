import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { Globe, LogOut, User, LayoutDashboard, Shield, Repeat } from 'lucide-react';
import NotificationBell from './NotificationBell';
import CoinBalanceWidget from './CoinBalanceWidget';

const Navbar = () => {
  const { isAuthenticated, user, logout, language, changeLanguage } = useAuth();
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-orange-600">{t('appName')}</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language Toggle */}
            <button
              onClick={() => changeLanguage(language === 'en' ? 'fr' : 'en')}
              className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-gray-100"
              data-testid="language-toggle"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{language.toUpperCase()}</span>
            </button>

            {isAuthenticated ? (
              <>
                {/* Dashboard Link - shows for both clients and taskers */}
                <Link
                  to={user?.role === 'tasker' ? '/tasker/dashboard' : '/client/dashboard'}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md hover:bg-gray-100 text-orange-600 font-medium"
                  data-testid="dashboard-link"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-sm">{language === 'en' ? 'Dashboard' : 'Tableau de bord'}</span>
                </Link>
                
                {/* Notification Bell */}
                <NotificationBell />
                
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 px-4 py-2 rounded-md hover:bg-gray-100"
                  data-testid="profile-link"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">{user?.full_name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  data-testid="logout-button"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">{t('logout')}</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  data-testid="login-link"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  data-testid="register-link"
                >
                  {t('register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
