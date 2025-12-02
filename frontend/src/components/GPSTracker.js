import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { locationAPI } from '../api/client';
import { Navigation, Clock, MapPin, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const GPSTracker = ({ task, onClose }) => {
  const { language } = useAuth();
  const [taskerLocation, setTaskerLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    fetchLocation();
    // Poll for location updates every 5 seconds
    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, [task.id, task.assigned_tasker_id]);

  const fetchLocation = async () => {
    if (!task.assigned_tasker_id) {
      setError(language === 'en' ? 'No tasker assigned yet' : 'Aucun tasker assigné encore');
      setLoading(false);
      return;
    }

    try {
      const response = await locationAPI.getTaskerLocation(task.assigned_tasker_id, task.id);
      setTaskerLocation(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching location:', error);
      if (error.response?.status === 404) {
        setError(language === 'en' ? 'Tasker has not shared location yet' : 'Le tasker n\'a pas encore partagé sa position');
      } else {
        setError(language === 'en' ? 'Failed to load location' : 'Échec du chargement de la position');
      }
    } finally {
      setLoading(false);
    }
  };

  const taskLocation = task.latitude && task.longitude ? [task.latitude, task.longitude] : null;
  const taskerPos = taskerLocation ? [taskerLocation.latitude, taskerLocation.longitude] : null;
  const center = taskerPos || taskLocation || [5.345317, -4.024429]; // Default to Abidjan

  return (
    <div className="fixed inset-0 md:inset-auto md:top-4 md:right-4 md:w-[500px] md:h-[600px] bg-white md:rounded-lg shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-emerald-600 text-white p-4 md:rounded-t-lg flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Navigation className="w-5 h-5" />
          <div>
            <h3 className="font-semibold" data-testid="gps-tracker-header">
              {language === 'en' ? 'Live Tracking' : 'Suivi en direct'}
            </h3>
            <p className="text-xs opacity-90">{task.title}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-emerald-700 rounded-full p-1 transition"
          data-testid="close-tracker-button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Status Info */}
      {taskerLocation && (
        <div className="bg-green-50 border-b border-green-200 p-4 space-y-2">
          <div className="flex items-center space-x-2 text-green-800">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium">{language === 'en' ? 'Tasker is on the way!' : 'Le tasker est en route!'}</span>
          </div>
          {taskerLocation.estimated_arrival_minutes && (
            <div className="flex items-center space-x-2 text-gray-700">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                {language === 'en' ? 'Estimated arrival:' : 'Arrivée estimée:'} 
                <strong className="ml-1">{taskerLocation.estimated_arrival_minutes} {language === 'en' ? 'min' : 'min'}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative" data-testid="map-container">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">{t('loading')}</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
            <MapPin className="w-12 h-12 mb-2 opacity-50" />
            <p>{error}</p>
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            className="md:rounded-b-lg"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Task Location */}
            {taskLocation && (
              <>
                <Marker position={taskLocation}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-semibold">{language === 'en' ? 'Task Location' : 'Emplacement de la tâche'}</p>
                      <p className="text-sm text-gray-600">{task.address}</p>
                    </div>
                  </Popup>
                </Marker>
                <Circle center={taskLocation} radius={200} color="orange" fillColor="orange" fillOpacity={0.1} />
              </>
            )}
            
            {/* Tasker Location */}
            {taskerPos && (
              <>
                <Marker position={taskerPos}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-semibold">{language === 'en' ? 'Tasker Location' : 'Position du tasker'}</p>
                      {taskerLocation.estimated_arrival_minutes && (
                        <p className="text-sm text-gray-600">
                          {language === 'en' ? 'ETA:' : 'ETA:'} {taskerLocation.estimated_arrival_minutes} min
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
                <Circle center={taskerPos} radius={100} color="green" fillColor="green" fillOpacity={0.2} />
              </>
            )}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="border-t p-3 bg-gray-50 md:rounded-b-lg">
        <div className="flex justify-around text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span>{language === 'en' ? 'Task Location' : 'Tâche'}</span>
          </div>
          {taskerPos && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>{language === 'en' ? 'Tasker' : 'Tasker'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GPSTracker;
