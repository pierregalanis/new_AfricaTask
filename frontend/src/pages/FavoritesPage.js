import React, { useState, useEffect } from 'react';
import { Heart, Star, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BadgeDisplay from '../components/BadgeDisplay';
import EmptyStates from '../components/EmptyStates';
import { SkeletonCard } from '../components/LoadingStates';
import { toast } from 'react-toastify';

const FavoritesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    if (user?.role === 'client') {
      fetchFavorites();
    } else {
      navigate('/');
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (taskerId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/favorites/${taskerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(favorites.filter(f => f.tasker_id !== taskerId));
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove favorite');
    }
  };

  const viewTaskerProfile = (taskerId) => {
    navigate(`/tasker/${taskerId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingStates.CardGrid />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      
      {/* Floating orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-scale-in">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/30">
              <Heart className="w-8 h-8 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">My Favorite Taskers</h1>
              <p className="text-gray-600 dark:text-gray-400">Quick access to your trusted professionals</p>
            </div>
          </div>
        </div>

        {favorites.length === 0 ? (
          <EmptyStates.NoFavorites onBrowse={() => navigate('/services')} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite, index) => (
              <div
                key={favorite.id}
                className="glass-card hover-lift cursor-pointer group animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => viewTaskerProfile(favorite.tasker_id)}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {favorite.tasker_name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-gray-700 dark:text-gray-300 font-semibold">
                        {favorite.tasker_rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(favorite.tasker_id);
                    }}
                    className="p-2 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 hover:scale-110"
                    title="Remove from favorites"
                  >
                    <Heart className="w-5 h-5 fill-current" />
                  </button>
                </div>

                {/* Badges */}
                <div className="mb-4">
                  <BadgeDisplay taskerId={favorite.tasker_id} />
                </div>

                {/* Services */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {favorite.tasker_services.slice(0, 3).map((service, idx) => (
                      <span
                        key={idx}
                        className="badge text-xs"
                      >
                        {service}
                      </span>
                    ))}
                    {favorite.tasker_services.length > 3 && (
                      <span className="badge text-xs">
                        +{favorite.tasker_services.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* View Profile Button */}
                <button
                  className="w-full btn-primary flex items-center justify-center space-x-2 py-2 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    viewTaskerProfile(favorite.tasker_id);
                  }}
                >
                  <span>View Profile</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
