import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, Marker, MarkerF } from '@react-google-maps/api';
import { useAppGoogleMaps } from '../../../../../hooks/useGoogleMapsConfig';
import { FiCrosshair } from 'react-icons/fi';
import flutterBridge from '../../../../../utils/flutterBridge';
import { reverseGeocodeCoords } from '../../../../../utils/reverseGeocode';
import { toast } from 'react-hot-toast';

const MarkerComponent = MarkerF || Marker;

const libraries = ['places', 'geometry'];

const mapContainerStyle = {
  width: '100%',
  height: '256px'
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

const LocationPicker = ({ onLocationSelect, initialPosition = null, height = 256 }) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(initialPosition || defaultCenter);
  const [autocomplete, setAutocomplete] = useState(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = React.useRef(false);

  const { isLoaded, loadError } = useAppGoogleMaps({
    libraries
  });

  // Hooks must run on every render, so this stays above the early returns for the loading map
  const safeMarker = useMemo(() => {
    if (!marker) return defaultCenter;
    const lat = Number(marker.lat);
    const lng = Number(marker.lng);
    if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
      return { lat, lng };
    }
    return defaultCenter;
  }, [marker]);

  // Update marker when initialPosition changes (from external selection)
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
  }, [isLoaded]);

  // Reverse geocode to get address from coordinates with resilient fallbacks
  const reverseGeocode = async (position) => {
    setLoading(true);
    try {
      const result = await reverseGeocodeCoords(position.lat, position.lng);
      if (result && onLocationSelect) {
        onLocationSelect({
          lat: position.lat,
          lng: position.lng,
          address: result.formattedAddress || result.shortLabel,
          components: result.components || []
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

  // Handle autocomplete place selection
  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const newPos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setMarker(newPos);
        if (map) {
          map.panTo(newPos);
          map.setZoom(15);
        }
        if (onLocationSelect) {
          onLocationSelect({
            lat: newPos.lat,
            lng: newPos.lng,
            address: place.formatted_address
          });
        }
      }
    }
  };

  // Handle current location button
  const handleCurrentLocation = async () => {
    setLoading(true);
    loadingRef.current = true;
    
    // Safety timer: If it takes more than 5 seconds, prompt user to check GPS
    const slowLocationTimer = setTimeout(() => {
      if (loadingRef.current) {
        window.dispatchEvent(new CustomEvent('requestLocationPrompt'));
        toast('Location taking too long. Please ensure GPS is ON.', { icon: '📍' });
      }
    }, 5000);

    try {
      const pos = await flutterBridge.getCurrentLocation();
      clearTimeout(slowLocationTimer);
      setLoading(false);
      loadingRef.current = false;
      
      const newPos = {
        lat: pos.latitude,
        lng: pos.longitude
      };
      
      setMarker(newPos);
      if (map) {
        map.panTo(newPos);
        map.setZoom(17);
      }
      reverseGeocode(newPos);
    } catch (error) {
      clearTimeout(slowLocationTimer);
      setLoading(false);
      loadingRef.current = false;
      console.error("Geolocation error:", error);
      
      // Trigger the specialized "Allow GPS" popup
      window.dispatchEvent(new CustomEvent('requestLocationPrompt'));
      
      let errorMessage = 'Unable to get location.';
      if (error.code === 1) errorMessage = 'Location permission denied.';
      else if (error.code === 2) errorMessage = 'GPS is turned off.';
      else if (error.code === 3) errorMessage = 'Location request timed out.';

      toast.error(`${errorMessage} Please select manually on the map.`);
    }
  };

  if (loadError) {
    return <div className="bg-gray-200 flex items-center justify-center" style={{ height }}>
      <p className="text-red-600">Error loading Google Maps</p>
    </div>;
  }

  if (!isLoaded) {
    return <div className="bg-gray-200 flex items-center justify-center" style={{ height }}>
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
    </div>;
  }

  return (
    <div className="w-full">
      <div className="relative bg-gray-200" style={{ height }}>
        <GoogleMap
          mapContainerStyle={{ ...mapContainerStyle, height: `${height}px` }}
          center={safeMarker}
          zoom={15}
          onClick={onMapClick}
          onLoad={setMap}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy',
            rotateControl: true,
            tiltControl: true,
            zoomControl: false
          }}
        >
          {safeMarker && <MarkerComponent position={safeMarker} />}
        </GoogleMap>

        {/* Pin Instruction Overlay */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm z-10">
          {loading ? 'Fetching address...' : 'Place the pin accurately on map'}
        </div>

        {/* Locate Me Button */}
        {/* Locate Me Button - Now on right */}
        <button
          onClick={handleCurrentLocation}
          className="absolute bottom-4 right-4 p-3 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all z-10"
        >
          <FiCrosshair className="w-6 h-6 text-gray-700" />
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;
