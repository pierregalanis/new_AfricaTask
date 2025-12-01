import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import Navbar from '../components/Navbar';
import { 
  Briefcase, Users, Star, Shield, MapPin, Clock, 
  TrendingUp, Award, Zap, CheckCircle, ArrowRight,
  Smartphone, Globe, DollarSign
} from 'lucide-react';

const LandingPage = () => {
  const { language, user } = useAuth();
  const navigate = useNavigate();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const t = (key) => translations[language]?.[key] || key;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(user.role === 'client' ? '/dashboard' : '/tasker/dashboard');
    }
  }, [user, navigate]);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Briefcase className="w-10 h-10" />,
      titleEn: 'Find Local Services',
      titleFr: 'Trouvez des services locaux',
      descEn: 'Connect with trusted professionals for any task, from cleaning to repairs',
      descFr: 'Connectez-vous avec des professionnels de confiance pour toute tâche',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: <MapPin className="w-10 h-10" />,
      titleEn: 'Real-time GPS Tracking',
      titleFr: 'Suivi GPS en temps réel',
      descEn: 'Track your tasker\'s location with live GPS and get accurate ETAs',
      descFr: 'Suivez la localisation de votre tasker avec GPS en direct',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Star className="w-10 h-10" />,
      titleEn: 'Verified Reviews',
      titleFr: 'Avis vérifiés',
      descEn: 'Read authentic reviews from real customers before booking',
      descFr: 'Lisez les avis de vrais clients',
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      icon: <Shield className="w-10 h-10" />,
      titleEn: 'Secure Payments',
      titleFr: 'Paiements sécurisés',
      descEn: 'Cash, mobile money, and secure online payment options',
      descFr: 'Espèces, mobile money et paiements en ligne sécurisés',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: <Clock className="w-10 h-10" />,
      titleEn: '24/7 Availability',
      titleFr: 'Disponibilité 24/7',
      descEn: 'Book services anytime, day or night, for your convenience',
      descFr: 'Réservez des services à tout moment',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: <DollarSign className="w-10 h-10" />,
      titleEn: 'Transparent Pricing',
      titleFr: 'Tarification transparente',
      descEn: 'See rates upfront with no hidden fees or surprises',
      descFr: 'Voyez les tarifs à l\'avance sans frais cachés',
      gradient: 'from-teal-500 to-blue-500'
    },
  ];

  const categories = [
    { icon: '🏠', nameEn: 'Home & Repairs', nameFr: 'Maison & Réparations' },
    { icon: '🧹', nameEn: 'Cleaning', nameFr: 'Nettoyage' },
    { icon: '🚗', nameEn: 'Car Services', nameFr: 'Services Auto' },
    { icon: '💄', nameEn: 'Beauty & Wellness', nameFr: 'Beauté & Bien-être' },
    { icon: '📚', nameEn: 'Tutoring', nameFr: 'Tutorat' },
    { icon: '👶', nameEn: 'Childcare', nameFr: 'Garde d\'enfants' },
    { icon: '🚚', nameEn: 'Delivery', nameFr: 'Livraison' },
    { icon: '💦', nameEn: 'Massage', nameFr: 'Massage' },
  ];

  const stats = [
    { value: '10,000+', labelEn: 'Active Users', labelFr: 'Utilisateurs actifs', icon: <Users className="w-6 h-6" /> },
    { value: '5,000+', labelEn: 'Tasks Completed', labelFr: 'Tâches terminées', icon: <CheckCircle className="w-6 h-6" /> },
    { value: '1,500+', labelEn: 'Verified Taskers', labelFr: 'Taskers vérifiés', icon: <Award className="w-6 h-6" /> },
    { value: '4.8/5', labelEn: 'Average Rating', labelFr: 'Note moyenne', icon: <Star className="w-6 h-6" /> },
  ];

  const testimonials = [
    {
      name: 'Aminata K.',
      role: 'Client',
      image: '👩',
      textEn: 'AfricaTask made it so easy to find a reliable cleaner. The GPS tracking gave me peace of mind!',
      textFr: 'AfricaTask m\'a facilité la tâche pour trouver une femme de ménage fiable. Le suivi GPS m\'a rassuré!',
      rating: 5
    },
    {
      name: 'Ibrahima S.',
      role: 'Tasker',
      image: '👨',
      textEn: 'I\'ve tripled my income since joining AfricaTask. The platform is simple and clients pay on time!',
      textFr: 'J\'ai triplé mes revenus depuis que j\'ai rejoint AfricaTask. La plateforme est simple!',
      rating: 5
    },
    {
      name: 'Fatou D.',
      role: 'Client',
      image: '👩‍💼',
      textEn: 'Booked a plumber in minutes. He arrived on time and fixed everything perfectly!',
      textFr: 'Réservé un plombier en quelques minutes. Il est arrivé à l\'heure et tout a été parfait!',
      rating: 5
    },
  ];

  const howItWorks = [
    { step: '1', titleEn: 'Choose a Service', titleFr: 'Choisissez un service', descEn: 'Browse 13+ service categories', descFr: 'Parcourez 13+ catégories' },
    { step: '2', titleEn: 'Find a Tasker', titleFr: 'Trouvez un tasker', descEn: 'View profiles, reviews & rates', descFr: 'Consultez profils et avis' },
    { step: '3', titleEn: 'Book & Track', titleFr: 'Réservez et suivez', descEn: 'Real-time GPS tracking', descFr: 'Suivi GPS en temps réel' },
    { step: '4', titleEn: 'Pay & Review', titleFr: 'Payez et évaluez', descEn: 'Secure payment & rating', descFr: 'Paiement sécurisé' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section with Gradient */}
      <section className="relative bg-gradient-to-br from-orange-50 via-white to-orange-50 pt-20 pb-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fadeIn">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-orange-100 px-4 py-2 rounded-full mb-6">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-700">
                {language === 'en' ? '🇮🇨 🇸🇳 Africa\'s #1 Task Platform' : '🇮🇨 🇸🇳 Plateforme #1 en Afrique'}
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              {language === 'en' ? (
                <>
                  Get Things Done
                  <br />
                  <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    Anytime, Anywhere
                  </span>
                </>
              ) : (
                <>
                  Faites les choses
                  <br />
                  <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    n'importe quand
                  </span>
                </>
              )}
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              {language === 'en' 
                ? 'Connect with trusted local professionals for home repairs, cleaning, beauty services, and more. All in one platform.'
                : 'Connectez-vous avec des professionnels locaux de confiance pour réparations, nettoyage, beauté et plus. Tout en une plateforme.'}
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
              <Link
                to="/register"
                className="group px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center space-x-2"
              >
                <span>{language === 'en' ? 'Get Started Free' : 'Commencez gratuitement'}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/register"
                className="px-8 py-4 bg-white border-2 border-orange-600 text-orange-600 rounded-xl font-bold text-lg hover:bg-orange-50 transition-all duration-200"
              >
                {language === 'en' ? 'Become a Tasker' : 'Devenir Tasker'}
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>{language === 'en' ? 'Verified Professionals' : 'Professionnels vérifiés'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>{language === 'en' ? 'Secure Payments' : 'Paiements sécurisés'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <span>{language === 'en' ? '4.8/5 Average Rating' : 'Note moyenne 4.8/5'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="animate-fadeIn" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex justify-center mb-3 text-orange-500">
                  {stat.icon}
                </div>
                <div className="text-4xl md:text-5xl font-extrabold mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm md:text-base">
                  {language === 'en' ? stat.labelEn : stat.labelFr}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {language === 'en' ? 'Why Choose AfricaTask?' : 'Pourquoi AfricaTask?'}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {language === 'en' 
                ? 'Everything you need for hassle-free task management'
                : 'Tout ce dont vous avez besoin pour une gestion sans tracas'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white p-8 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.gradient} text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {language === 'en' ? feature.titleEn : feature.titleFr}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {language === 'en' ? feature.descEn : feature.descFr}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {language === 'en' ? 'How It Works' : 'Comment ça marche'}
            </h2>
            <p className="text-xl text-gray-600">
              {language === 'en' ? 'Get started in 4 simple steps' : 'Commencez en 4 étapes simples'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-1/4 left-0 right-0 h-1 bg-gradient-to-r from-orange-200 via-orange-400 to-orange-600" style={{ zIndex: 0 }} />
            
            {howItWorks.map((item, index) => (
              <div key={index} className="relative z-10">
                <div className="bg-white rounded-2xl p-6 text-center shadow-lg border-2 border-orange-100 hover:border-orange-400 transition-all">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {language === 'en' ? item.titleEn : item.titleFr}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {language === 'en' ? item.descEn : item.descFr}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {language === 'en' ? 'Popular Services' : 'Services populaires'}
            </h2>
            <p className="text-xl text-gray-600">
              {language === 'en' ? '13+ service categories to choose from' : '13+ catégories de services'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat, index) => (
              <Link
                key={index}
                to="/services"
                className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 text-center border border-gray-100 hover:border-orange-400 transform hover:-translate-y-1"
              >
                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <h3 className="font-semibold text-gray-900">
                  {language === 'en' ? cat.nameEn : cat.nameFr}
                </h3>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/services"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              <span>{language === 'en' ? 'View All Services' : 'Voir tous les services'}</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-br from-orange-500 to-red-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              {language === 'en' ? 'What Our Users Say' : 'Ce que disent nos utilisateurs'}
            </h2>
          </div>

          <div className="relative">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`transition-all duration-500 ${index === activeTestimonial ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute inset-0'}`}
              >
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="text-5xl">{testimonial.image}</div>
                    <div>
                      <h4 className="font-bold text-xl">{testimonial.name}</h4>
                      <p className="text-orange-100">{testimonial.role}</p>
                    </div>
                    <div className="ml-auto flex space-x-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-lg leading-relaxed">
                    "{language === 'en' ? testimonial.textEn : testimonial.textFr}"
                  </p>
                </div>
              </div>
            ))}

            {/* Dots */}
            <div className="flex justify-center space-x-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === activeTestimonial ? 'bg-white w-8' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {language === 'en' ? 'Ready to Get Started?' : 'Prêt à commencer?'}
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            {language === 'en' 
              ? 'Join thousands of satisfied users. Create your account in minutes.'
              : 'Rejoignez des milliers d\'utilisateurs satisfaits. Créez votre compte en minutes.'}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              to="/register"
              className="px-10 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              {language === 'en' ? 'Sign Up Now' : 'S\'inscrire maintenant'}
            </Link>
            <Link
              to="/login"
              className="px-10 py-4 bg-white/10 backdrop-blur text-white border-2 border-white/30 rounded-xl font-bold text-lg hover:bg-white/20 transition-all"
            >
              {language === 'en' ? 'Sign In' : 'Se connecter'}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">AfricaTask</h3>
              <p className="text-sm leading-relaxed">
                {language === 'en' 
                  ? 'Africa\'s leading platform for connecting service providers and clients.'
                  : 'Plateforme leader en Afrique pour connecter prestataires et clients.'}
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{language === 'en' ? 'For Clients' : 'Pour les clients'}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/services" className="hover:text-orange-500 transition">Browse Services</Link></li>
                <li><Link to="/register" className="hover:text-orange-500 transition">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{language === 'en' ? 'For Taskers' : 'Pour les taskers'}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/register" className="hover:text-orange-500 transition">Become a Tasker</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{language === 'en' ? 'Languages' : 'Langues'}</h4>
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span className="text-sm">English | Français</span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2025 AfricaTask. {language === 'en' ? 'All rights reserved.' : 'Tous droits réservés.'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
