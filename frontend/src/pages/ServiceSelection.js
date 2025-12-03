import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { categoriesAPI } from '../api/client';
import Navbar from '../components/Navbar';
import { Search } from 'lucide-react';

const ServiceSelection = () => {
  const { language } = useAuth();
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSelectCategory = (categoryId) => {
    navigate(`/browse-taskers/${categoryId}`);
  };

  const handleSelectSubcategory = (categoryId, subcategoryName) => {
    navigate(`/browse-taskers/${categoryId}?subcategory=${encodeURIComponent(subcategoryName)}`);
  };

  const filteredCategories = categories.filter(cat => {
    const name = language === 'en' ? cat.name_en : cat.name_fr;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="fancy-card p-8 mb-8 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-center animate-fadeIn">
          <h1 className="text-4xl font-bold mb-4" data-testid="service-selection-title">
            {language === 'en' ? 'What do you need help with?' : 'De quoi avez-vous besoin?'}
          </h1>
          <p className="text-xl text-emerald-100 mb-6">
            {language === 'en' 
              ? 'Browse services and find the perfect tasker'
              : 'Parcourez les services et trouvez le tasker parfait'}
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'en' ? 'Search services...' : 'Rechercher des services...'}
              className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-300"
              data-testid="service-search-input"
            />
          </div>
        </div>

        {/* Popular Services */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {language === 'en' ? 'Popular Services' : 'Services populaires'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCategories.slice(0, 8).map((category, index) => (
              <div
                key={category.id}
                onClick={() => handleSelectCategory(category.id)}
                className="fancy-card p-6 text-center cursor-pointer hover-glow animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`service-card-${category.id}`}
              >
                <div className="text-5xl mb-3">{category.icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {language === 'en' ? category.name_en : category.name_fr}
                </h3>
              </div>
            ))}
          </div>
        </div>

        {/* All Services */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {language === 'en' ? 'All Services' : 'Tous les services'}
          </h2>
          <div className="space-y-6">
            {filteredCategories.map((category) => (
              <div key={category.id} className="fancy-card p-6 animate-fadeIn">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="text-4xl">{category.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold gradient-text">
                      {language === 'en' ? category.name_en : category.name_fr}
                    </h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.subcategories.map((sub, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectCategory(category.id)}
                      className="text-left p-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600"
                      data-testid={`subcategory-${category.id}-${idx}`}
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {language === 'en' ? sub.en : sub.fr}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceSelection;
