import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { taskersAPI, categoriesAPI } from '../api/client';
import Navbar from '../components/Navbar';
import { Star, MapPin, Check, Filter, DollarSign, ArrowLeft } from 'lucide-react';

const BrowseTaskersPage = () => {
  const { categoryId } = useParams();
  const { language, user } = useAuth();
  const [taskers, setTaskers] = useState([]);
  const [allTaskers, setAllTaskers] = useState([]); // Store all taskers before filtering
  const [category, setCategory] = useState(null);
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
  }, [categoryId]);

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

  const applyFiltersAndSort = (taskersList) => {
    let filtered = [...taskersList];
    
    // Filter by distance
    if (maxDistance < 100) {
      filtered = filtered.filter(t => !t.distance || t.distance <= maxDistance);
    }
    
    // Filter by tasker's ability to reach
    filtered = filtered.filter(t => t.canReach);
    
    // Sort
    filtered = sortTaskers(filtered);
    
    setTaskers(filtered);
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

  const sortTaskers = (taskersList) => {
    switch (sortBy) {
      case 'price_low':
        return [...taskersList].sort((a, b) => 
          (a.tasker_profile?.hourly_rate || 0) - (b.tasker_profile?.hourly_rate || 0)
        );
      case 'price_high':
        return [...taskersList].sort((a, b) => 
          (b.tasker_profile?.hourly_rate || 0) - (a.tasker_profile?.hourly_rate || 0)
        );
      case 'distance':
        return [...taskersList].sort((a, b) => (a.distance || 999) - (b.distance || 999));
      case 'rating':
        return [...taskersList].sort((a, b) => 
          (b.tasker_profile?.average_rating || 0) - (a.tasker_profile?.average_rating || 0)
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

  const handleBookTasker = (taskerId) => {
    navigate(`/book-tasker/${taskerId}?category=${categoryId}`);
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
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('back')}</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="browse-taskers-title">
            {category && (language === 'en' ? category.name_en : category.name_fr)}
          </h1>
          <p className="text-gray-600">
            {language === 'en' 
              ? `${taskers.length} taskers available` 
              : `${taskers.length} taskers disponibles`}
          </p>
        </div>

        {/* Filters */}
        <div className="fancy-card p-6 mb-8 animate-fadeIn">
          <div className="flex flex-wrap items-center gap-4">
            {/* Sort By */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setTaskers(sortTaskers(taskers));
                }}
                className="fancy-input py-2"
                data-testid="sort-select"
              >
                <option value="recommended">{language === 'en' ? 'Recommended' : 'Recommandé'}</option>
                <option value="price_low">{language === 'en' ? 'Price: Low to High' : 'Prix: Bas à Haut'}</option>
                <option value="price_high">{language === 'en' ? 'Price: High to Low' : 'Prix: Haut à Bas'}</option>
                <option value="distance">{language === 'en' ? 'Nearest' : 'Plus proche'}</option>
                <option value="rating">{language === 'en' ? 'Highest Rated' : 'Mieux noté'}</option>
              </select>
            </div>

            {/* Availability Filter */}
            <div className="flex space-x-2">
              <button
                onClick={() => setFilterAvailability('all')}
                className={`px-4 py-2 rounded-full font-semibold transition ${
                  filterAvailability === 'all'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {language === 'en' ? 'All' : 'Tous'}
              </button>
              <button
                onClick={() => setFilterAvailability('today')}
                className={`px-4 py-2 rounded-full font-semibold transition ${
                  filterAvailability === 'today'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {language === 'en' ? 'Today' : "Aujourd'hui"}
              </button>
              <button
                onClick={() => setFilterAvailability('week')}
                className={`px-4 py-2 rounded-full font-semibold transition ${
                  filterAvailability === 'week'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {language === 'en' ? 'This Week' : 'Cette semaine'}
              </button>
            </div>
          </div>
          
          {/* Distance Filter */}
          {user?.latitude && user?.longitude && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Maximum Distance' : 'Distance maximale'}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-orange-600">
                    {maxDistance >= 100 ? (language === 'en' ? 'Any distance' : 'Toute distance') : `${maxDistance} km`}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5 km</span>
                  <span>25 km</span>
                  <span>50 km</span>
                  <span>75 km</span>
                  <span>{language === 'en' ? 'Any' : 'Tout'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Taskers List */}
        {taskers.length === 0 ? (
          <div className="fancy-card text-center py-12">
            <p className="text-gray-600">
              {language === 'en' 
                ? 'No taskers available for this service yet' 
                : 'Aucun tasker disponible pour ce service pour le moment'}
            </p>
          </div>
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
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold">
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

                    {/* Rating */}
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">
                          {tasker.tasker_profile?.average_rating?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-gray-500 text-sm">
                          ({tasker.tasker_profile?.total_reviews || 0} {language === 'en' ? 'reviews' : 'avis'})
                        </span>
                      </div>
                      {tasker.distance && (
                        <div className="flex items-center space-x-1 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{tasker.distance.toFixed(1)} km</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>
                        {tasker.tasker_profile?.completed_tasks || 0} {language === 'en' ? 'tasks completed' : 'tâches terminées'}
                      </span>
                    </div>

                    {/* Bio */}
                    {tasker.tasker_profile?.bio && (
                      <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                        {tasker.tasker_profile.bio}
                      </p>
                    )}
                  </div>

                  {/* Price & Book */}
                  <div className="flex-shrink-0 text-right">
                    <div className="mb-4">
                      <div className="flex items-center justify-end space-x-1 text-gray-500 text-sm mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span>{language === 'en' ? 'Hourly rate' : 'Tarif horaire'}</span>
                      </div>
                      <p className="text-3xl font-bold text-orange-600">
                        {tasker.tasker_profile?.hourly_rate || 0} <span className="text-lg">CFA/hr</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleBookTasker(tasker.id)}
                      className="btn-primary w-full"
                      data-testid={`book-button-${tasker.id}`}
                    >
                      {language === 'en' ? 'Select & Book' : 'Sélectionner'}
                    </button>
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
