import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import Navbar from '../components/Navbar';
import { Briefcase, Users, Star, Shield, MapPin, Clock } from 'lucide-react';

const LandingPage = () => {
  const { language } = useAuth();
  const t = (key) => translations[language]?.[key] || key;

  const features = [
    {
      icon: <Briefcase className="w-12 h-12 text-orange-600" />,
      titleEn: 'Find Local Services',
      titleFr: 'Trouvez des services locaux',
      descEn: 'Connect with trusted professionals for any task',
      descFr: 'Connectez-vous avec des professionnels de confiance pour toute tâche',
    },
    {
      icon: <MapPin className="w-12 h-12 text-orange-600" />,
      titleEn: 'Real-time Tracking',
      titleFr: 'Suivi en temps réel',
      descEn: 'Track your tasker\'s location with live GPS',
      descFr: 'Suivez la localisation de votre tasker avec GPS en direct',
    },
    {
      icon: <Star className="w-12 h-12 text-orange-600" />,
      titleEn: 'Verified Reviews',
      titleFr: 'Avis vérifiés',
      descEn: 'Read reviews from real customers',
      descFr: 'Lisez les avis de vrais clients',
    },
    {
      icon: <Shield className="w-12 h-12 text-orange-600" />,
      titleEn: 'Secure Payments',
      titleFr: 'Paiements sécurisés',
      descEn: 'Cash, Orange Money, Wave, or PayPal',
      descFr: 'Espèces, Orange Money, Wave, ou PayPal',
    },
  ];

  const categories = [
    { icon: '🏠', nameEn: 'Home & Repairs', nameFr: 'Maison & Réparations' },
    { icon: '🧹', nameEn: 'Cleaning', nameFr: 'Nettoyage' },
    { icon: '🚗', nameEn: 'Car Services', nameFr: 'Services Auto' },
    { icon: '💄', nameEn: 'Beauty', nameFr: 'Beauté' },
    { icon: '📚', nameEn: 'Tutoring', nameFr: 'Tutorat' },
    { icon: '👶', nameEn: 'Childcare', nameFr: 'Garde d\'enfants' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-20" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">
            {language === 'en' ? 'Connect with Local Service Providers' : 'Connectez-vous avec des prestataires locaux'}
          </h1>
          <p className="text-xl mb-8 text-orange-100">
            {t('tagline')}
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-orange-600 rounded-lg font-semibold hover:bg-gray-100 transition"
              data-testid="get-started-button"
            >
              {t('getStarted')}
            </Link>
            <Link
              to="/register"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-orange-600 transition"
              data-testid="become-tasker-button"
            >
              {t('becomeTasker')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            {language === 'en' ? 'Why Choose AfricaTask?' : 'Pourquoi choisir AfricaTask?'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="flex justify-center mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'en' ? feature.titleEn : feature.titleFr}
                </h3>
                <p className="text-gray-600">
                  {language === 'en' ? feature.descEn : feature.descFr}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white" data-testid="categories-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            {language === 'en' ? 'Popular Categories' : 'Catégories populaires'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category, index) => (
              <div
                key={index}
                className="bg-gray-50 p-6 rounded-lg text-center hover:shadow-lg transition cursor-pointer"
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <p className="font-medium">
                  {language === 'en' ? category.nameEn : category.nameFr}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16" data-testid="how-it-works-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{t('howItWorks')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {language === 'en' ? 'Post Your Task' : 'Publiez votre tâche'}
              </h3>
              <p className="text-gray-600">
                {language === 'en'
                  ? 'Describe what you need done'
                  : 'Décrivez ce dont vous avez besoin'}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {language === 'en' ? 'Choose a Tasker' : 'Choisissez un Tasker'}
              </h3>
              <p className="text-gray-600">
                {language === 'en'
                  ? 'Review bids and select the best fit'
                  : 'Examinez les offres et choisissez la meilleure'}
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {language === 'en' ? 'Get It Done' : 'C\'est fait'}
              </h3>
              <p className="text-gray-600">
                {language === 'en'
                  ? 'Track progress and pay securely'
                  : 'Suivez les progrès et payez en toute sécurité'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-orange-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold mb-4">
            {language === 'en' ? 'Ready to get started?' : 'Prêt à commencer?'}
          </h2>
          <p className="text-xl mb-8">
            {language === 'en'
              ? 'Join thousands of satisfied customers across Africa'
              : 'Rejoignez des milliers de clients satisfaits à travers l\'Afrique'}
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-white text-orange-600 rounded-lg font-semibold hover:bg-gray-100 transition"
            data-testid="cta-register-button"
          >
            {t('register')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2024 AfricaTask. {language === 'en' ? 'All rights reserved.' : 'Tous droits réservés.'}</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
