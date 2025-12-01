import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { Globe, LogOut, User, LayoutDashboard, Shield, Repeat } from 'lucide-react';
import ImprovedNotificationCenter from './ImprovedNotificationCenter';
import CoinBalanceWidget from './CoinBalanceWidget';
import MobileNav from './MobileNav';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { isAuthenticated, user, logout, language, changeLanguage } = useAuth();
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="glass sticky top-0 z-50 backdrop-blur-xl border-b dark:border-emerald-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all duration-300 group-hover:scale-110">
                <span className="text-white font-bold text-xl">Q</span>
              </div>
              <span className="text-2xl font-bold gradient-text">{t('appName')}</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Language Toggle */}
            <button
              onClick={() => changeLanguage(language === 'en' ? 'fr' : 'en')}
              className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
              data-testid="language-toggle"
            >
              <Globe className="w-4 h-4 text-gray-700 dark:text-emerald-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-emerald-400">{language.toUpperCase()}</span>
            </button>

            {isAuthenticated ? (
              <>
                {/* Dashboard Link - shows for both clients and taskers */}
                <Link
                  to={user?.role === 'tasker' ? '/tasker/dashboard' : '/client/dashboard'}
                  className="flex items-center space-x-2 px-4 py-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium transition-colors"
                  data-testid="dashboard-link"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-sm">{language === 'en' ? 'Dashboard' : 'Tableau de bord'}</span>
                </Link>
                
                {/* Coin Balance */}
                <CoinBalanceWidget language={language} />

                {/* Recurring Tasks Link */}
                <Link
                  to="/recurring-tasks"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                  title={language === 'en' ? 'Recurring Tasks' : 'Tâches récurrentes'}
                >
                  <Repeat className="w-4 h-4 text-gray-700 dark:text-emerald-400" />
                </Link>

                {/* Notification Center */}
                <ImprovedNotificationCenter language={language} />

                {/* Admin Link (if admin) */}
                {user?.email === 'admin@africatask.com' && (
                  <Link
                    to="/admin"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                    title="Admin Panel"
                  >
                    <Shield className="w-4 h-4" />
                  </Link>
                )}

                {/* Mobile Navigation */}
                <MobileNav language={language} />
                
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 px-4 py-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-gray-700 dark:text-gray-200 transition-colors"
                  data-testid="profile-link"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">{user?.full_name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 hidden md:block"
                  data-testid="login-link"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 hidden md:block"
                  data-testid="register-link"
                >
                  {t('register')}
                </Link>
                
                {/* Mobile Navigation for non-authenticated */}
                <MobileNav language={language} />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
