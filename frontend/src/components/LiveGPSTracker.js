import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Navigation, Clock, MapPin } from 'lucide-react';

// Custom icons for tasker and job location
const taskerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const jobIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to auto-center map when tasker position updates
function MapUpdater({ taskerPosition, jobPosition }) {
  const map = useMap();
  
  useEffect(() => {
    if (taskerPosition && jobPosition) {
      // Fit bounds to show both markers
      const bounds = L.latLngBounds([
        [taskerPosition.lat, taskerPosition.lng],
        [jobPosition.lat, jobPosition.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (taskerPosition) {
      map.setView([taskerPosition.lat, taskerPosition.lng], 14);
    } else if (jobPosition) {
      map.setView([jobPosition.lat, jobPosition.lng], 13);
    }
  }, [taskerPosition, jobPosition, map]);
  
  return null;
}

const LiveGPSTracker = ({ taskId, jobLocation, taskerName, language = 'fr' }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [hasNotified, setHasNotified] = useState(false);
  const [hasNotifiedProximity, setHasNotifiedProximity] = useState(false);
  const [previousDistance, setPreviousDistance] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchTrackingStatus();
    
    // Poll every 5 seconds for updates
    intervalRef.current = setInterval(() => {
      fetchTrackingStatus();
    }, 5000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [taskId]);

  const fetchTrackingStatus = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}/tracking-status`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      
      const data = response.data;
      const wasTracking = isTracking;
      setIsTracking(data.is_tracking);
      
      // Show notification when tracking starts for the first time
      if (data.is_tracking && !wasTracking && !hasNotified) {
        toast.success(
          `🚗 ${taskerName} ${language === 'en' ? 'is on the way!' : 'est en route!'}`,
          {
            position: "top-center",
            autoClose: 5000,
          }
        );
        setHasNotified(true);
      }
      
      // If tracking stopped, reset notification flag
      if (!data.is_tracking && wasTracking) {
        setHasNotified(false);
        setTrackingData(null);
      }
      
      if (data.is_tracking && data.current_latitude && data.current_longitude) {
        setTrackingData({
          latitude: data.current_latitude,
          longitude: data.current_longitude,
          lastUpdate: data.last_location_update,
        });
        setError(null);
        
        // Check proximity and notify if within 2km
        if (jobLocation) {
          const distance = calculateDistance(
            data.current_latitude,
            data.current_longitude,
            jobLocation.latitude,
            jobLocation.longitude
          );
          
          // Notify when tasker comes within 2km (only once)
          if (distance <= 2 && !hasNotifiedProximity && previousDistance && previousDistance > 2) {
            toast.info(
              `📍 ${taskerName} ${language === 'en' ? 'is arriving soon! Less than 2 km away.' : 'arrive bientôt! Moins de 2 km.'}`,
              {
                position: "top-center",
                autoClose: 7000,
              }
            );
            setHasNotifiedProximity(true);
          }
          
          setPreviousDistance(distance);
        }
      } else if (data.is_tracking) {
        setError(language === 'en' ? 'Waiting for location...' : 'En attente de la localisation...');
      }
    } catch (err) {
      console.error('Error fetching tracking status:', err);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getDistanceAndETA = () => {
    if (!trackingData || !jobLocation) return null;
    
    const distance = calculateDistance(
      trackingData.latitude,
      trackingData.longitude,
      jobLocation.latitude,
      jobLocation.longitude
    );
    
    // Assume 30 km/h average speed
    const etaMinutes = Math.round((distance / 30) * 60);
    
    return { distance: distance.toFixed(2), eta: etaMinutes };
  };

  if (!isTracking) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-semibold">
          {language === 'en' 
            ? 'Tasker has not started GPS tracking yet' 
            : 'Le prestataire n\'a pas encore démarré le suivi GPS'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {language === 'en' 
            ? 'You will see their live location when they are en route' 
            : 'Vous verrez leur position en direct quand ils seront en route'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <Navigation className="w-12 h-12 text-yellow-600 mx-auto mb-3 animate-pulse" />
        <p className="text-yellow-800 font-semibold">{error}</p>
      </div>
    );
  }

  if (!trackingData) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-blue-800 font-semibold">
          {language === 'en' ? 'Loading location...' : 'Chargement de la localisation...'}
        </p>
      </div>
    );
  }

  const stats = getDistanceAndETA();

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="font-semibold text-green-800">
                🚗 {language === 'en' ? 'Tasker is en route!' : 'Le prestataire est en route!'}
              </p>
              <p className="text-sm text-green-600">
                {language === 'en' ? 'Live location tracking active' : 'Suivi de localisation en direct actif'}
              </p>
            </div>
          </div>
          {stats && (
            <div className="text-right">
              <div className="flex items-center space-x-2 text-green-700">
                <MapPin className="w-4 h-4" />
                <span className="font-bold text-lg">{stats.distance} km</span>
              </div>
              <div className="flex items-center space-x-2 text-green-600 text-sm">
                <Clock className="w-3 h-3" />
                <span>{language === 'en' ? 'ETA:' : 'Arrivée:'} ~{stats.eta} min</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="border-2 border-green-500 rounded-lg overflow-hidden shadow-lg" style={{ height: '400px' }}>
        <MapContainer
          center={[trackingData.latitude, trackingData.longitude]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Tasker's current position */}
          <Marker 
            position={[trackingData.latitude, trackingData.longitude]} 
            icon={taskerIcon}
          >
            <Popup>
              <div className="text-center">
                <p className="font-bold">{taskerName}</p>
                <p className="text-sm text-gray-600">
                  {language === 'en' ? 'Current Location' : 'Position actuelle'}
                </p>
              </div>
            </Popup>
          </Marker>
          
          {/* Job location */}
          {jobLocation && (
            <Marker 
              position={[jobLocation.latitude, jobLocation.longitude]} 
              icon={jobIcon}
            >
              <Popup>
                <div className="text-center">
                  <p className="font-bold">
                    {language === 'en' ? 'Job Location' : 'Lieu du travail'}
                  </p>
                  <p className="text-sm text-gray-600">{jobLocation.address}</p>
                </div>
              </Popup>
            </Marker>
          )}
          
          <MapUpdater 
            taskerPosition={trackingData ? { lat: trackingData.latitude, lng: trackingData.longitude } : null}
            jobPosition={jobLocation ? { lat: jobLocation.latitude, lng: jobLocation.longitude } : null}
          />
        </MapContainer>
      </div>

      {/* Last Update */}
      <div className="text-center text-sm text-gray-500">
        {language === 'en' ? 'Last updated:' : 'Dernière mise à jour:'}{' '}
        {trackingData.lastUpdate ? new Date(trackingData.lastUpdate).toLocaleTimeString() : 'N/A'}
      </div>
    </div>
  );
};

export default LiveGPSTracker;
