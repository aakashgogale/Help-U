import { useState, useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useConfig } from '../context/ConfigContext';
import { useLanguage } from '../context/LanguageContext';

export const DEFAULT_LIBRARIES = ['places', 'geometry'];

// Global singleton tracking across the lifetime of the browser session
// This guarantees that the Google Maps JavaScript script is never requested multiple times
// or with conflicting options, which causes @googlemaps/js-api-loader to throw an error.
let activeLoaderInstance = null;
let activeLoaderPromise = null;
const isMapsFullyLoaded = () => typeof window !== 'undefined' && Boolean(window.google?.maps && window.google?.maps?.places);
let globalIsLoaded = isMapsFullyLoaded();
let globalLoadError = undefined;

/**
 * Hook to retrieve dynamic Google Maps configuration (API Key, Language, Region)
 * configured completely by Admin in settings.
 */
export const useGoogleMapsConfig = () => {
  const { config } = useConfig();
  const { mapLanguage, currentLanguage } = useLanguage();

  const apiKey = config?.googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const language = (config?.googleMapsLanguage && config.googleMapsLanguage !== 'auto')
    ? config.googleMapsLanguage
    : (mapLanguage || currentLanguage || 'en');
  const region = config?.mapRegion || 'IN';

  return {
    apiKey,
    language,
    region,
    isConfigured: Boolean(apiKey),
    libraries: DEFAULT_LIBRARIES
  };
};

/**
 * Standardized Google Maps API loader hook.
 * Replaces direct calls to `useJsApiLoader` across the application so that:
 * 1. The API key is loaded dynamically from Admin Settings (with fallback to env)
 * 2. Maps, markers, autocomplete, and routes render in the configured App / Map Language
 * 3. Prevents "Loader must not be called again with different options" fatal runtime error
 * 4. Region and libraries remain consistent across all modules
 */
export const useAppGoogleMaps = (options = {}) => {
  const config = useGoogleMapsConfig();

  const [isLoaded, setIsLoaded] = useState(() => {
    return globalIsLoaded || isMapsFullyLoaded();
  });
  const [loadError, setLoadError] = useState(globalLoadError);

  useEffect(() => {
    let isMounted = true;

    // 1. If window.google.maps with places is already available, resolve immediately
    if (isMapsFullyLoaded()) {
      globalIsLoaded = true;
      if (isMounted) setIsLoaded(true);
      return;
    }

    const targetApiKey = config.apiKey;
    if (!targetApiKey) {
      return;
    }

    // 2. Reuse or initialize singleton Loader instance
    if (!activeLoaderInstance) {
      if (Loader.instance) {
        activeLoaderInstance = Loader.instance;
      } else {
        try {
          activeLoaderInstance = new Loader({
            id: options.id || 'google-map-script',
            apiKey: targetApiKey,
            version: 'weekly',
            language: options.language || config.language || 'en',
            region: options.region || config.region || 'IN',
            libraries: DEFAULT_LIBRARIES,
            ...(options.mapIds ? { mapIds: options.mapIds } : {})
          });
        } catch (e) {
          // If constructor threw because an instance exists, safely adopt it
          if (Loader.instance) {
            activeLoaderInstance = Loader.instance;
          } else {
            console.error('Failed to initialize Google Maps loader:', e);
            globalLoadError = e;
            if (isMounted) setLoadError(e);
            return;
          }
        }
      }
    }

    // 3. Trigger loader promise once
    if (!activeLoaderPromise && activeLoaderInstance) {
      activeLoaderPromise = activeLoaderInstance.load();
    }

    // 4. Await load resolution
    if (activeLoaderPromise) {
      activeLoaderPromise
        .then(() => {
          globalIsLoaded = true;
          if (isMounted) {
            setIsLoaded(true);
          }
        })
        .catch((err) => {
          console.error('Failed to load Google Maps script:', err);
          globalLoadError = err;
          if (isMounted) {
            setLoadError(err);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [config.apiKey, config.language, config.region, options.id, options.language, options.region]);

  const activeOptions = activeLoaderInstance?.options || activeLoaderInstance || {};

  return {
    isLoaded,
    loadError,
    apiKey: activeOptions.apiKey || config.apiKey,
    language: activeOptions.language || config.language,
    region: activeOptions.region || config.region
  };
};

/**
 * Utility for non-React or vanilla fetch calls (e.g. geocoding, routes)
 */
export const getActiveMapsParams = () => {
  let apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  let language = 'en';
  let region = 'IN';

  try {
    const cachedConfig = localStorage.getItem('app_public_config');
    if (cachedConfig) {
      const parsed = JSON.parse(cachedConfig);
      if (parsed.googleMapsApiKey) apiKey = parsed.googleMapsApiKey;
      if (parsed.googleMapsLanguage && parsed.googleMapsLanguage !== 'auto') {
        language = parsed.googleMapsLanguage;
      }
      if (parsed.mapRegion) region = parsed.mapRegion;
    }

    const savedLang = localStorage.getItem('app_language');
    if (savedLang && (!language || language === 'auto')) {
      language = savedLang;
    }
  } catch (e) {
    // Ignore storage parse error
  }

  return { apiKey, language, region };
};

export default useAppGoogleMaps;
