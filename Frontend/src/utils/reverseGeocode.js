import api from '../services/api';

/**
 * Universal Reverse Geocoder (Google Maps Only)
 * Resolves (lat, lng) to human-readable address exclusively using Google Maps:
 * 1. Backend Google Maps Reverse-Geocode API (uses server key without origin restrictions)
 * 2. Client Google Maps Geocoder (window.google.maps.Geocoder)
 * 3. Direct Google Maps Geocode HTTP API fetch
 */
export async function reverseGeocodeCoords(lat, lng, language = 'en') {
  const numericLat = parseFloat(lat);
  const numericLng = parseFloat(lng);

  if (isNaN(numericLat) || isNaN(numericLng)) {
    throw new Error('Invalid coordinates for reverse geocoding');
  }

  let googleResult = null;
  let rawComponents = [];
  let formattedAddress = '';

  // 1. Try Backend Google Maps Reverse-Geocode endpoint (server-side API key)
  try {
    const backendRes = await api.get('/public/reverse-geocode', {
      params: { lat: numericLat, lng: numericLng, language }
    });
    if (backendRes.data?.success && backendRes.data?.result) {
      googleResult = backendRes.data.result;
      formattedAddress = googleResult.formatted_address || '';
      rawComponents = googleResult.address_components || [];
    }
  } catch (backendErr) {
    // Continue to client Google Geocoder
  }

  // 2. Try window.google.maps.Geocoder if loaded in DOM
  if (!googleResult && typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const clientRes = await new Promise((resolve) => {
        geocoder.geocode({ location: { lat: numericLat, lng: numericLng } }, (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            resolve(results[0]);
          } else {
            resolve(null);
          }
        });
      });
      if (clientRes) {
        googleResult = clientRes;
        formattedAddress = clientRes.formatted_address || '';
        rawComponents = clientRes.address_components || [];
      }
    } catch (clientErr) {
      // Continue to direct Google Maps fetch
    }
  }

  // 3. Direct Google Maps Geocode HTTP API fetch fallback
  if (!googleResult) {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${numericLat},${numericLng}&key=${apiKey}&language=${language}`
        );
        const data = await response.json();
        if (data.status === 'OK' && data.results?.length > 0) {
          googleResult = data.results[0];
          formattedAddress = googleResult.formatted_address || '';
          rawComponents = googleResult.address_components || [];
        }
      }
    } catch (directErr) {
      // Ignore
    }
  }

  // Parse components from Google Maps result
  if (googleResult) {
    const getComponent = (...types) => {
      for (const t of types) {
        const found = rawComponents.find(c => c.types?.includes(t));
        if (found) return found.long_name;
      }
      return '';
    };

    const area = getComponent('sublocality_level_1', 'sublocality', 'neighborhood');
    const city = getComponent('locality', 'administrative_area_level_2');
    const state = getComponent('administrative_area_level_1');
    const pincode = getComponent('postal_code');
    const landmark = getComponent('landmark', 'premise');

    let shortLabel = '';
    if (area && city) {
      shortLabel = `${area}, ${city}`;
    } else if (city && state) {
      shortLabel = `${city}, ${state}`;
    } else if (city) {
      shortLabel = city;
    } else {
      const parts = formattedAddress.split(',').map(p => p.trim());
      shortLabel = parts.slice(0, 2).join(', ') || formattedAddress;
    }

    return {
      success: true,
      formattedAddress,
      shortLabel,
      area,
      city,
      state,
      pincode,
      landmark,
      lat: numericLat,
      lng: numericLng,
      components: rawComponents,
      source: 'google_maps'
    };
  }

  // If Google Maps reverse geocode fails, return raw coordinates
  return {
    success: false,
    formattedAddress: `${numericLat.toFixed(4)}, ${numericLng.toFixed(4)}`,
    shortLabel: `${numericLat.toFixed(4)}, ${numericLng.toFixed(4)}`,
    city: '',
    state: '',
    pincode: '',
    lat: numericLat,
    lng: numericLng,
    source: 'raw_coords'
  };
}

export default reverseGeocodeCoords;
