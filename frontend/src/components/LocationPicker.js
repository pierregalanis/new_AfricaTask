import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Create a custom red marker icon
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });

  return position ? <Marker position={[position.lat, position.lng]} icon={customIcon} /> : null;
}

const LocationPicker = ({ 
  country, 
  initialPosition, 
  onLocationChange,
  height = '400px',
  label = 'Cliquez sur la carte pour placer votre épingle'
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

  useEffect(() => {
    if (country && countryCenter[country]) {
      setCenter(countryCenter[country]);
    }
  }, [country]);

  useEffect(() => {
    if (position && onLocationChange) {
      onLocationChange(position);
    }
  }, [position]);

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  return (
    <div className="location-picker">
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden" style={{ height }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={center.zoom}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>
      {position && (
        <div className="mt-2 text-sm text-gray-600">
          📍 Position: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
