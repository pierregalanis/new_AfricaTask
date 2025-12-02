import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { Mail, Lock } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, language } = useAuth();
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success(language === 'en' ? 'Login successful!' : 'Connexion réussie!');
      
      // Redirect based on user role after login completes
      const userData = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).then(res => res.json());
      
      if (userData.role === 'client') {
        navigate('/services');
      } else if (userData.role === 'tasker') {
        // Check if tasker has set up their profile
        if (userData.tasker_profile?.hourly_rate > 0) {
          navigate('/tasker/dashboard');
        } else {
          navigate('/tasker-profile-setup');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(
        error.response?.data?.detail ||
        (language === 'en' ? 'Login failed. Please check your credentials.' : 'Échec de la connexion. Vérifiez vos identifiants.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 dark:bg-gray-950">
      <Navbar />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        {/* Floating orbs background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-md w-full space-y-8 relative z-10">
          {/* Glass card with glow */}
          <div className="glass-card animate-scale-in">
            <div className="text-center">
              <div className="inline-block p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/30 mb-6">
                <Lock className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold gradient-text mb-2">
                {t('login')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300">
                {t('dontHaveAccount')}{' '}
                <Link to="/register" className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors">
                  {t('register')}
                </Link>
              </p>
            </div>
            
            <form className="mt-8 space-y-6" onSubmit={handleSubmit} data-testid="login-form">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    {t('email')}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="fancy-input pl-12"
                      data-testid="email-input"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    {t('password')}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="fancy-input pl-12"
                      data-testid="password-input"
                    />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex justify-center items-center space-x-2 py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="login-submit-button"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{t('loading')}</span>
                    </>
                  ) : (
                    <span>{t('login')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
