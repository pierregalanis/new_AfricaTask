import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { Search, MapPin } from 'lucide-react';

const libraries = ['places'];

const LocationPickerGoogle = ({ 
  country, 
  initialPosition, 
  onLocationChange,
  height = '400px',
  label = 'Search for a place or click on the map to pin your location'
}) => {
  // Default centers for each country
  const countryCenter = {
    'ivory_coast': { lat: 5.3600, lng: -4.0083, zoom: 12 }, // Abidjan
    'senegal': { lat: 14.7167, lng: -17.4677, zoom: 12 }, // Dakar
  };

  const [position, setPosition] = useState(initialPosition || null);
  const [center, setCenter] = useState(
    countryCenter[country] || countryCenter['ivory_coast']
  );
  const [map, setMap] = useState(null);
  const [searchBox, setSearchBox] = useState(null);
  const autocompleteRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    if (country && countryCenter[country]) {
      setCenter(countryCenter[country]);
    }
  }, [country]);

  useEffect(() => {
    if (position && onLocationChange) {
      onLocationChange(position);
    }
  }, [position, onLocationChange]);

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  const onMapClick = useCallback((e) => {
    const newPosition = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };
    setPosition(newPosition);
  }, []);

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onAutocompleteLoad = (autocomplete) => {
    setSearchBox(autocomplete);
  };

  const onPlaceChanged = () => {
    if (searchBox !== null) {
      const place = searchBox.getPlace();
      if (place.geometry && place.geometry.location) {
        const newPosition = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setPosition(newPosition);
        setCenter({ ...newPosition, zoom: 15 });
        if (map) {
          map.panTo(newPosition);
          map.setZoom(15);
        }
      }
    }
  };

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">
          ❌ Error loading Google Maps. Please check your API key and internet connection.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600">🗺️ Loading map...</p>
      </div>
    );
  }

  const mapContainerStyle = {
    width: '100%',
    height: height,
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    clickableIcons: true,
  };

  return (
    <div className="location-picker-google">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{label}</p>
      
      {/* Search Box */}
      <div className="mb-3 relative">
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            componentRestrictions: { country: country === 'senegal' ? 'sn' : 'ci' },
            types: ['establishment', 'geocode'],
          }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={autocompleteRef}
              type="text"
              placeholder="Search for pharmacy, school, store, restaurant..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50
                       transition-all"
            />
          </div>
        </Autocomplete>
      </div>

      {/* Map Container */}
      <div 
        className={`border-2 rounded-lg overflow-hidden transition-all ${
          position ? 'border-green-500' : 'border-gray-300'
        }`} 
        style={{ height }}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={center.zoom}
          onClick={onMapClick}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={mapOptions}
        >
          {position && (
            <Marker
              position={position}
              animation={window.google?.maps?.Animation?.DROP}
            />
          )}
        </GoogleMap>
      </div>

      {/* Status Display */}
      {position ? (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            ✅ Location pinned successfully!
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            📍 Coordinates: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </p>
        </div>
      ) : (
        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            👆 Search for a place above or click on the map to pin your location
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationPickerGoogle;
