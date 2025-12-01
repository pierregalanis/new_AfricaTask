import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navigation, Clock, MapPin } from 'lucide-react';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const LiveGPSTrackerWithRoute = ({ 
  taskId, 
  taskerLocation, 
  jobLocation, 
  taskerName,
  language = 'en' 
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const taskerMarker = useRef(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [jobLocation.longitude, jobLocation.latitude],
      zoom: 13
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add job location marker (destination)
    const jobMarkerEl = document.createElement('div');
    jobMarkerEl.className = 'custom-marker-destination';
    jobMarkerEl.innerHTML = `
      <div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 20px;">📍</div>
      </div>
    `;

    new mapboxgl.Marker(jobMarkerEl)
      .setLngLat([jobLocation.longitude, jobLocation.latitude])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<strong>${language === 'en' ? 'Job Location' : 'Lieu de travail'}</strong>`)
      )
      .addTo(map.current);

    setLoading(false);
  }, [jobLocation, language]);

  useEffect(() => {
    if (!map.current || !taskerLocation) return;

    // Update or create tasker marker
    if (taskerMarker.current) {
      taskerMarker.current.setLngLat([taskerLocation.longitude, taskerLocation.latitude]);
    } else {
      const taskerMarkerEl = document.createElement('div');
      taskerMarkerEl.innerHTML = `
        <div style="
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s infinite;
        ">
          <div style="color: white; font-size: 24px;">🚗</div>
        </div>
      `;

      taskerMarker.current = new mapboxgl.Marker(taskerMarkerEl)
        .setLngLat([taskerLocation.longitude, taskerLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<strong>${taskerName || (language === 'en' ? 'Tasker' : 'Prestataire')}</strong><br/>${language === 'en' ? 'En route' : 'En route'}`)
        )
        .addTo(map.current);
    }

    // Fetch and draw route
    fetchRoute(taskerLocation, jobLocation);
  }, [taskerLocation, jobLocation, taskerName, language]);

  const fetchRoute = async (start, end) => {
    try {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`,
        { method: 'GET' }
      );
      const json = await query.json();

      if (json.routes && json.routes.length > 0) {
        const route = json.routes[0];
        const geojson = {
          type: 'Feature',
          properties: {},
          geometry: route.geometry
        };

        // Calculate ETA and distance
        const durationMinutes = Math.round(route.duration / 60);
        const distanceKm = (route.distance / 1000).toFixed(1);

        setRouteInfo({
          duration: durationMinutes,
          distance: distanceKm
        });

        // Remove existing route layer if it exists
        if (map.current.getSource('route')) {
          map.current.removeLayer('route');
          map.current.removeSource('route');
        }

        // Add route layer
        map.current.addSource('route', {
          type: 'geojson',
          data: geojson
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 5,
            'line-opacity': 0.8
          }
        });

        // Fit map to show both markers and route
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([start.longitude, start.latitude]);
        bounds.extend([end.longitude, end.latitude]);
        
        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 }
        });
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full rounded-lg" />

      {/* Route Info Overlay */}
      {routeInfo && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-sm">
          <div className="flex items-center space-x-2 mb-3">
            <Navigation className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">
              {language === 'en' ? 'En Route' : 'En route'}
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">
                  {language === 'en' ? 'ETA' : 'Arrivée'}
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {routeInfo.duration} min
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">
                  {language === 'en' ? 'Distance' : 'Distance'}
                </p>
                <p className="text-lg font-bold text-orange-600">
                  {routeInfo.distance} km
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: '35%' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {taskerName || (language === 'en' ? 'Tasker' : 'Prestataire')} {language === 'en' ? 'is on the way' : 'est en route'}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {language === 'en' ? 'Loading map...' : 'Chargement de la carte...'}
            </p>
          </div>
        </div>
      )}

      {/* Pulse Animation CSS */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};

export default LiveGPSTrackerWithRoute;
