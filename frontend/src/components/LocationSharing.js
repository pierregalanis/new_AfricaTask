import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { locationAPI } from '../api/client';
import { toast } from 'react-toastify';
import { Navigation, MapPin } from 'lucide-react';

const LocationSharing = ({ task }) => {
  const { language } = useAuth();
  const [isSharing, setIsSharing] = useState(false);
  const [locationInterval, setLocationInterval] = useState(null);
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [locationInterval]);

  const startSharing = () => {
    if (!navigator.geolocation) {
      toast.error(language === 'en' ? 'Geolocation not supported' : 'Géolocalisation non supportée');
      return;
    }

    setIsSharing(true);
    
    // Share location immediately
    shareLocation();
    
    // Then share every 10 seconds
    const interval = setInterval(shareLocation, 10000);
    setLocationInterval(interval);
    
    toast.success(language === 'en' ? 'Location sharing started' : 'Partage de position démarré');
  };

  const stopSharing = () => {
    if (locationInterval) {
      clearInterval(locationInterval);
      setLocationInterval(null);
    }
    setIsSharing(false);
    toast.info(language === 'en' ? 'Location sharing stopped' : 'Partage de position arrêté');
  };

  const shareLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await locationAPI.update({
            task_id: task.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          console.log('Location updated');
        } catch (error) {
          console.error('Error updating location:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error(language === 'en' ? 'Failed to get location' : 'Échec de la géolocalisation');
        stopSharing();
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isSharing ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
          <div>
            <h4 className="font-semibold text-gray-900">
              {language === 'en' ? 'Location Sharing' : 'Partage de position'}
            </h4>
            <p className="text-sm text-gray-600">
              {isSharing
                ? (language === 'en' ? 'Sharing your location...' : 'Partage de votre position...')
                : (language === 'en' ? 'Let the client track you' : 'Laissez le client vous suivre')}
            </p>
          </div>
        </div>
        <button
          onClick={isSharing ? stopSharing : startSharing}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 ${
            isSharing
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          data-testid="location-sharing-toggle"
        >
          {isSharing ? <MapPin className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
          <span>
            {isSharing
              ? (language === 'en' ? 'Stop' : 'Arrêter')
              : (language === 'en' ? 'Start' : 'Démarrer')}
          </span>
        </button>
      </div>
      {isSharing && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm text-green-800">
          <p>✓ {language === 'en' ? 'Client can see your live location' : 'Le client peut voir votre position en direct'}</p>
        </div>
      )}
    </div>
  );
};

export default LocationSharing;
