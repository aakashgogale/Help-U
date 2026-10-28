import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useAppGoogleMaps } from '../../../../../hooks/useGoogleMapsConfig';
import flutterBridge from '../../../../../utils/flutterBridge';
import { reverseGeocodeCoords } from '../../../../../utils/reverseGeocode';

const libraries = ['places', 'geometry'];

const mapContainerStyle = {
  width: '100%',
  height: '300px'
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

const GoogleMapPicker = ({ onLocationSelect, initialPosition = null }) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(initialPosition || defaultCenter);
  const [loading, setLoading] = useState(false);

  const { isLoaded, loadError } = useAppGoogleMaps({
    libraries
  });

  // Update marker when initialPosition changes
  useEffect(() => {
    if (initialPosition) {
      setMarker(initialPosition);
      if (map) {
        map.panTo(initialPosition);
        map.setZoom(15);
      }
    }
  }, [initialPosition, map]);

  // Get user's current location on mount
  useEffect(() => {
    if (!initialPosition && isLoaded) {
      handleCurrentLocation();
    }
  }, [isLoaded, map]);

  // Reverse geocode to get address from coordinates with resilient fallbacks
  const reverseGeocode = async (position) => {
    setLoading(true);
    try {
      const result = await reverseGeocodeCoords(position.lat, position.lng);
      if (result && onLocationSelect) {
        onLocationSelect({
          lat: position.lat,
          lng: position.lng,
          address: result.formattedAddress || result.shortLabel
        });
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle map click
  const onMapClick = useCallback((e) => {
    const newPos = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    setMarker(newPos);
    reverseGeocode(newPos);
  }, []);

  // Handle current location button
  const handleCurrentLocation = async () => {
    setLoading(true);
    try {
      const pos = await flutterBridge.getCurrentLocation();
      const newPos = {
        lat: pos.latitude,
        lng: pos.longitude
      };
      setMarker(newPos);
      if (map) {
        map.panTo(newPos);
        map.setZoom(15);
      }
      reverseGeocode(newPos);
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loadError) {
    return <div className="h-64 bg-gray-200 flex items-center justify-center">
      <p className="text-red-600">Error loading Google Maps</p>
    </div>;
  }

  if (!isLoaded) {
    return <div className="h-64 bg-gray-200 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
    </div>;
  }

  return (
    <div className="w-full">
      <div className="relative bg-gray-200">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={marker}
          zoom={15}
          onClick={onMapClick}
          onLoad={setMap}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy',
            rotateControl: false
          }}
        >
          {marker && <Marker position={marker} />}
        </GoogleMap>

        {/* Pin Instruction Overlay */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm z-10">
          {loading ? 'Fetching address...' : 'Click on map to set your location'}
        </div>

        {/* Locate Me Button */}
        <button
          onClick={handleCurrentLocation}
          className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
        >
          <div className="w-6 h-6 border-2 border-gray-600 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default GoogleMapPicker;
