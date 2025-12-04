import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { taskersAPI, categoriesAPI } from '../api/client';
import Navbar from '../components/Navbar';
import TaskerRating from '../components/TaskerRating';
import AdvancedSearchFilters from '../components/AdvancedSearchFilters';
import { SkeletonCard } from '../components/LoadingStates';
import { NoSearchResults } from '../components/EmptyStates';
import { Star, MapPin, Check, Filter, DollarSign, ArrowLeft } from 'lucide-react';

const BrowseTaskersPage = () => {
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const subcategoryParam = searchParams.get('subcategory');
  const { language, user } = useAuth();
  const [taskers, setTaskers] = useState([]);
  const [allTaskers, setAllTaskers] = useState([]); // Store all taskers before filtering
  const [category, setCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(subcategoryParam || null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recommended');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [maxPrice, setMaxPrice] = useState(null);
  const [maxDistance, setMaxDistance] = useState(100); // Max distance filter in km
  const navigate = useNavigate();
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    fetchCategory();
    fetchTaskers();
  }, [categoryId, selectedSubcategory]);

  const fetchCategory = async () => {
    try {
      const response = await categoriesAPI.getById(categoryId);
      setCategory(response.data);
    } catch (error) {
      console.error('Error fetching category:', error);
    }
  };

  const fetchTaskers = async () => {
    try {
      const params = {
        category_id: categoryId,
        is_available: true,
      };
      if (maxPrice) {
        params.max_rate = maxPrice;
      }
      
      // Add country filter if user has country
      if (user?.country) {
        params.country = user.country;
      }
      
      const response = await taskersAPI.search(params);
      
      // Calculate distances if user has location
      let taskersWithDistance = response.data.map(tasker => {
        if (user?.latitude && user?.longitude && tasker.latitude && tasker.longitude) {
          const distance = calculateDistance(
            user.latitude, user.longitude,
            tasker.latitude, tasker.longitude
          );
          
          // Check if tasker can reach client's location
          const canReach = distance <= (tasker.tasker_profile?.max_travel_distance || 50);
          
          return { ...tasker, distance, canReach };
        }
        return { ...tasker, distance: null, canReach: true };
      });

      // Filter by subcategory if specified
      if (selectedSubcategory) {
        taskersWithDistance = taskersWithDistance.filter(tasker => {
          const services = tasker.tasker_profile?.services || [];
          return services.some(service => {
            // Handle both old format (string) and new format (object with subcategory)
            if (typeof service === 'string') {
              return false; // Old format doesn't have subcategory info
            }
            return service.subcategory === selectedSubcategory;
          });
        });
      }

      // Store all taskers
      setAllTaskers(taskersWithDistance);
      
      // Apply filters and sort
      applyFiltersAndSort(taskersWithDistance);
      
    } catch (error) {
      console.error('Error fetching taskers:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = (taskersList, customFilters = null) => {
    let filtered = [...taskersList];
    
    const activeFilters = customFilters || {
      priceMin: '',
      priceMax: '',
      minRating: 0,
      maxDistance: maxDistance,
      sortBy: sortBy,
      searchQuery: ''
    };
    
    // Filter by search query (name, bio, skills)
    if (activeFilters.searchQuery) {
      const query = activeFilters.searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.full_name?.toLowerCase().includes(query) ||
        t.tasker_profile?.bio?.toLowerCase().includes(query) ||
        t.tasker_profile?.services?.some(s => s.toLowerCase().includes(query))
      );
    }
    
    // Filter by price range
    if (activeFilters.priceMin) {
      filtered = filtered.filter(t => 
        (t.tasker_profile?.hourly_rate || 0) >= parseFloat(activeFilters.priceMin)
      );
    }
    if (activeFilters.priceMax) {
      filtered = filtered.filter(t => 
        (t.tasker_profile?.hourly_rate || 0) <= parseFloat(activeFilters.priceMax)
      );
    }
    
    // Filter by minimum rating
    if (activeFilters.minRating > 0) {
      filtered = filtered.filter(t => 
        (t.tasker_profile?.average_rating || 0) >= activeFilters.minRating
      );
    }
    
    // Filter by distance
    if (activeFilters.maxDistance < 100) {
      filtered = filtered.filter(t => !t.distance || t.distance <= activeFilters.maxDistance);
    }
    
    // Filter by tasker's ability to reach
    filtered = filtered.filter(t => t.canReach);
    
    // Sort based on active filters
    const sortKey = activeFilters.sortBy || sortBy;
    filtered = sortTaskersWithKey(filtered, sortKey);
    
    setTaskers(filtered);
  };

  const sortTaskersWithKey = (taskersList, key) => {
    switch (key) {
      case 'price-low':
        return [...taskersList].sort((a, b) => 
          (a.tasker_profile?.hourly_rate || 0) - (b.tasker_profile?.hourly_rate || 0)
        );
      case 'price-high':
        return [...taskersList].sort((a, b) => 
          (b.tasker_profile?.hourly_rate || 0) - (a.tasker_profile?.hourly_rate || 0)
        );
      case 'distance':
        return [...taskersList].sort((a, b) => (a.distance || 999) - (b.distance || 999));
      case 'rating':
        return [...taskersList].sort((a, b) => 
          (b.tasker_profile?.average_rating || 0) - (a.tasker_profile?.average_rating || 0)
        );
      case 'reviews':
        return [...taskersList].sort((a, b) => 
          (b.tasker_profile?.total_reviews || 0) - (a.tasker_profile?.total_reviews || 0)
        );
      default: // recommended
        return [...taskersList].sort((a, b) => {
          const scoreA = (a.tasker_profile?.average_rating || 0) * 
                        (a.tasker_profile?.completed_tasks || 0) / 
                        ((a.distance || 10) + 1);
          const scoreB = (b.tasker_profile?.average_rating || 0) * 
                        (b.tasker_profile?.completed_tasks || 0) / 
                        ((b.distance || 10) + 1);
          return scoreB - scoreA;
        });
    }
  };

  // Re-apply filters when distance or sort changes
  useEffect(() => {
    if (allTaskers.length > 0) {
      applyFiltersAndSort(allTaskers);
    }
  }, [maxDistance, sortBy]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleBookTasker = (taskerId) => {
    const url = selectedSubcategory 
      ? `/tasker/${taskerId}?category=${categoryId}&subcategory=${selectedSubcategory}`
      : `/tasker/${taskerId}?category=${categoryId}`;
    navigate(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">{t('loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button & Header */}
        <button
          onClick={() => navigate('/services')}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('back')}</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="browse-taskers-title">
            {category && (language === 'en' ? category.name_en : category.name_fr)}
          </h1>
          
          {/* Subcategory Filter */}
          {category?.subcategories && category.subcategories.length > 0 && (
            <div className="mt-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {language === 'en' ? 'Filter by subcategory:' : 'Filtrer par sous-catégorie:'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedSubcategory(null);
                    fetchTaskers();
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    !selectedSubcategory
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {language === 'en' ? 'All' : 'Tous'}
                </button>
                {category.subcategories.map((sub, idx) => {
                  const subName = language === 'en' ? sub.en : sub.fr;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedSubcategory(sub.en);
                        navigate(`/browse-taskers/${categoryId}?subcategory=${encodeURIComponent(sub.en)}`);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedSubcategory === sub.en
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {subName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'en' 
              ? `${taskers.length} taskers available` 
              : `${taskers.length} taskers disponibles`}
          </p>
        </div>

        {/* Advanced Search & Filters */}
        <AdvancedSearchFilters 
          onFilterChange={(filters) => applyFiltersAndSort(allTaskers, filters)}
          language={language}
        />

        {/* Taskers List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : taskers.length === 0 ? (
          <NoSearchResults language={language} query={category?.name_en || 'this service'} />
        ) : (
          <div className="space-y-4">
            {taskers.map((tasker, index) => (
              <div
                key={tasker.id}
                className="fancy-card p-6 hover-glow animate-fadeIn"
                style={{ animationDelay: `${index * 0.05}s` }}
                data-testid={`tasker-card-${tasker.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Profile Image */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-3xl font-bold">
                      {tasker.full_name?.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{tasker.full_name}</h3>
                      {tasker.tasker_profile?.completed_tasks > 50 && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                          ⭐ {language === 'en' ? 'ELITE' : 'ÉLITE'}
                        </span>
                      )}
                    </div>

                    {/* Rating & Distance */}
                    <div className="flex items-center space-x-4 mb-3">
                      <TaskerRating 
                        taskerId={tasker.id} 
                        showDetails={true}
                        language={language}
                      />
                      {tasker.distance !== null && (
                        <div className="flex items-center space-x-1 bg-blue-50 px-3 py-1 rounded-full">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-700">
                            {tasker.distance.toFixed(1)} km {language === 'en' ? 'away' : 'de distance'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Service-Specific Info */}
                    {(() => {
                      // Find the specific service the client is looking for
                      const services = tasker.tasker_profile?.services || [];
                      const matchingService = selectedSubcategory
                        ? services.find(s => typeof s === 'object' && s.subcategory === selectedSubcategory)
                        : services.find(s => typeof s === 'object' && s.category === category?.name_en);
                      
                      const travelDistance = matchingService?.max_travel_distance || tasker.tasker_profile?.max_travel_distance;
                      
                      return (
                        <>
                          {travelDistance && (
                            <div className="mb-3">
                              <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                                🚗 {language === 'en' ? 'Travels up to' : 'Se déplace jusqu\'à'} {travelDistance} km
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Bio */}
                    {tasker.tasker_profile?.bio && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2 mb-3">
                        {tasker.tasker_profile.bio}
                      </p>
                    )}

                    {/* Services */}
                    {tasker.tasker_profile?.services && tasker.tasker_profile.services.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {tasker.tasker_profile.services.map((service, idx) => {
                          let displayText = '';
                          if (typeof service === 'string') {
                            // Old format - just service name
                            displayText = service;
                          } else if (service.subcategory) {
                            // New format - show subcategory
                            displayText = service.subcategory;
                          }
                          
                          return displayText ? (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-full"
                            >
                              {displayText}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>

                  {/* Price & Book */}
                  <div className="flex-shrink-0 text-right">
                    {(() => {
                      // Find the specific service pricing
                      const services = tasker.tasker_profile?.services || [];
                      const matchingService = selectedSubcategory
                        ? services.find(s => typeof s === 'object' && s.subcategory === selectedSubcategory)
                        : services.find(s => typeof s === 'object' && s.category === category?.name_en);
                      
                      const pricingType = matchingService?.pricing_type || 'hourly';
                      const hourlyRate = matchingService?.hourly_rate || tasker.tasker_profile?.hourly_rate || 0;
                      const fixedPrice = matchingService?.fixed_price || 0;
                      
                      return (
                        <div className="mb-4">
                          {pricingType === 'fixed' ? (
                            <>
                              <div className="flex items-center justify-end space-x-1 text-gray-500 text-sm mb-1">
                                <DollarSign className="w-4 h-4" />
                                <span>{language === 'en' ? 'Fixed Price' : 'Prix fixe'}</span>
                              </div>
                              <p className="text-3xl font-bold text-emerald-600">
                                {fixedPrice.toLocaleString()} <span className="text-lg">CFA</span>
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {language === 'en' ? 'Flat rate for service' : 'Tarif forfaitaire'}
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-end space-x-1 text-gray-500 text-sm mb-1">
                                <DollarSign className="w-4 h-4" />
                                <span>{language === 'en' ? 'Hourly rate' : 'Tarif horaire'}</span>
                              </div>
                              <p className="text-3xl font-bold text-emerald-600">
                                {hourlyRate.toLocaleString()} <span className="text-lg">CFA/hr</span>
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {language === 'en' ? 'e.g. 3h' : 'ex: 3h'} = {(hourlyRate * 3).toLocaleString()} CFA
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => navigate(`/book-tasker/${tasker.id}?category=${categoryId}`)}
                        className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition font-semibold"
                        data-testid={`book-now-button-${tasker.id}`}
                      >
                        {language === 'en' ? 'Book Now' : 'Réserver'}
                      </button>
                      <button
                        onClick={() => handleBookTasker(tasker.id)}
                        className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition font-semibold"
                        data-testid={`view-profile-button-${tasker.id}`}
                      >
                        {language === 'en' ? 'View Profile' : 'Voir le profil'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseTaskersPage;
