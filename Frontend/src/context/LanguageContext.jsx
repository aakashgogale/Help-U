import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useConfig } from './ConfigContext';

// Comprehensive language catalog with code, native name, and English name
export const ALL_AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' }
];

// Essential UI translations dictionary
const TRANSLATIONS = {
  en: {
    select_location: 'Select Location',
    detecting_location: 'Detecting location...',
    search_services: 'Search for services...',
    book_now: 'Book Now',
    track_booking: 'Track Booking',
    current_location: 'Current Location',
    confirm_location: 'Confirm Location',
    enter_address: 'Enter complete address',
    my_addresses: 'My Addresses',
    add_new_address: 'Add New Address',
    save_address: 'Save Address',
    directions: 'Directions',
    calculating_route: 'Calculating route...',
    distance: 'Distance',
    duration: 'Estimated Time',
    language: 'Language',
    app_language: 'App Language',
    map_language: 'Map Language',
    settings: 'Settings',
    notifications: 'Notifications',
    push_notifications: 'Push Notifications',
    email_notifications: 'Email Notifications',
    account: 'Account',
    save_changes: 'Save Changes',
    saved_successfully: 'Saved successfully',
    auto_detect_lang: 'Auto-detect from location',
    suggested_language: 'Suggested Language'
  },
  hi: {
    select_location: 'स्थान चुनें',
    detecting_location: 'स्थान का पता लगाया जा रहा है...',
    search_services: 'सेवाएं खोजें...',
    book_now: 'अभी बुक करें',
    track_booking: 'बुकिंग ट्रैक करें',
    current_location: 'वर्तमान स्थान',
    confirm_location: 'स्थान की पुष्टि करें',
    enter_address: 'पूरा पता दर्ज करें',
    my_addresses: 'मेरे पते',
    add_new_address: 'नया पता जोड़ें',
    save_address: 'पता सहेजें',
    directions: 'दिशा-निर्देश',
    calculating_route: 'मार्ग की गणना हो रही है...',
    distance: 'दूरी',
    duration: 'अनुमानित समय',
    language: 'भाषा',
    app_language: 'ऐप भाषा',
    map_language: 'मानचित्र भाषा',
    settings: 'सेटिंग्स',
    notifications: 'सूचनाएं',
    push_notifications: 'पुश सूचनाएं',
    email_notifications: 'ईमेल सूचनाएं',
    account: 'खाता',
    save_changes: 'परिवर्तन सहेजें',
    saved_successfully: 'सफलतापूर्वक सहेजा गया',
    auto_detect_lang: 'स्थान से स्वतः पहचानें',
    suggested_language: 'सुझाई गई भाषा'
  },
  gu: {
    select_location: 'સ્થાન પસંદ કરો',
    detecting_location: 'સ્થાન શોધી રહ્યું છે...',
    search_services: 'સેવાઓ શોધો...',
    book_now: 'હમણાં બુક કરો',
    track_booking: 'બુકિંગ ટ્રેક કરો',
    current_location: 'વર્તમાન સ્થાન',
    confirm_location: 'સ્થાનની પુષ્ટિ કરો',
    enter_address: 'સંપૂર્ણ સરનામું દાખલ કરો',
    my_addresses: 'મારા સરનામાં',
    add_new_address: 'નવું સરનામું ઉમેરો',
    save_address: 'સરનામું સાચવો',
    directions: 'દિશાઓ',
    calculating_route: 'માર્ગની ગણતરી...',
    distance: 'અંતર',
    duration: 'અંદાજિત સમય',
    language: 'ભાષા',
    app_language: 'એપ્લિકેશન ભાષા',
    map_language: 'નકશાની ભાષા',
    settings: 'સેટિંગ્સ',
    notifications: 'સૂચનાઓ',
    push_notifications: 'પુશ સૂચનાઓ',
    account: 'ખાતું',
    save_changes: 'ફેરફારો સાચવો',
    saved_successfully: 'સફળતાપૂર્વક સંગ્રહિત'
  },
  mr: {
    select_location: 'स्थान निवडा',
    detecting_location: 'स्थान शोधत आहे...',
    search_services: 'सेवा शोधा...',
    book_now: 'आता बुक करा',
    track_booking: 'बुकिंग ट्रॅक करा',
    current_location: 'सध्याचे स्थान',
    confirm_location: 'स्थानाची पुष्टी करा',
    enter_address: 'पूर्ण पत्ता प्रविष्ट करा',
    my_addresses: 'माझे पत्ते',
    add_new_address: 'नवीन पत्ता जोडा',
    save_address: 'पत्ता जतन करा',
    directions: 'दिशानिर्देश',
    calculating_route: 'मार्ग मोजत आहे...',
    distance: 'अंतर',
    duration: 'अंदाजे वेळ',
    language: 'भाषा',
    app_language: 'अ‍ॅप भाषा',
    map_language: 'नकाशा भाषा',
    settings: 'सेटिंग्ज',
    notifications: 'सूचना',
    push_notifications: 'पुश सूचना',
    account: 'खाते',
    save_changes: 'बदल जतन करा',
    saved_successfully: 'यशस्वीरित्या जतन केले'
  }
};

const LanguageContext = createContext(null);
const STORAGE_KEY = 'app_language';

export const LanguageProvider = ({ children }) => {
  const { config } = useConfig();

  // Admin-configured supported languages or fallback to English and Hindi
  const configuredCodes = Array.isArray(config?.supportedLanguages) && config.supportedLanguages.length > 0
    ? config.supportedLanguages
    : ['en', 'hi'];

  const supportedLanguages = ALL_AVAILABLE_LANGUAGES.filter(lang =>
    configuredCodes.includes(lang.code)
  );

  // Active language state
  const [currentLanguage, setCurrentLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && configuredCodes.includes(saved)) {
        return saved;
      }
    } catch (e) {
      // Ignore localStorage error
    }
    return config?.defaultAppLanguage || 'en';
  });

  // Keep language in sync if admin changes default or disables a previously selected language
  useEffect(() => {
    if (config?.defaultAppLanguage && !localStorage.getItem(STORAGE_KEY)) {
      setCurrentLanguageState(config.defaultAppLanguage);
    } else if (currentLanguage && !configuredCodes.includes(currentLanguage)) {
      const fallback = config?.defaultAppLanguage || configuredCodes[0] || 'en';
      setCurrentLanguageState(fallback);
      try { localStorage.setItem(STORAGE_KEY, fallback); } catch {}
    }
  }, [config?.defaultAppLanguage, configuredCodes, currentLanguage]);

  // Set language function
  const setLanguage = useCallback((langCode) => {
    if (!langCode) return;
    setCurrentLanguageState(langCode);
    try {
      localStorage.setItem(STORAGE_KEY, langCode);
      window.dispatchEvent(new CustomEvent('appLanguageChanged', { detail: { language: langCode } }));
    } catch (e) {
      console.warn('Failed to save language to localStorage:', e);
    }
  }, []);

  // Compute map language:
  // If admin configured a fixed map language, use it;
  // If 'auto' or not specified, use current app language.
  const mapLanguage = (config?.googleMapsLanguage && config.googleMapsLanguage !== 'auto')
    ? config.googleMapsLanguage
    : currentLanguage;

  // Translation helper
  const t = useCallback((key, fallback) => {
    const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en || {};
    if (dict[key]) return dict[key];
    const enDict = TRANSLATIONS.en || {};
    return enDict[key] || fallback || key;
  }, [currentLanguage]);

  // Reverse-geocode state detection to suggest/auto-detect language
  const detectLanguageFromLocation = useCallback((addressComponents) => {
    if (!config?.autoDetectLanguageFromMap) return null;
    if (!Array.isArray(addressComponents)) return null;

    const stateComp = addressComponents.find(c =>
      c.types?.includes('administrative_area_level_1')
    );
    const stateName = (stateComp?.long_name || '').toLowerCase();

    const stateToLang = {
      'gujarat': 'gu',
      'maharashtra': 'mr',
      'west bengal': 'bn',
      'tamil nadu': 'ta',
      'karnataka': 'kn',
      'telangana': 'te',
      'andhra pradesh': 'te',
      'punjab': 'pa',
      'kerala': 'ml',
      'odisha': 'or',
      'madhya pradesh': 'hi',
      'uttar pradesh': 'hi',
      'bihar': 'hi',
      'rajasthan': 'hi',
      'delhi': 'hi',
      'haryana': 'hi'
    };

    for (const [state, code] of Object.entries(stateToLang)) {
      if (stateName.includes(state)) {
        if (configuredCodes.includes(code)) {
          return code;
        }
        break;
      }
    }
    return null;
  }, [config?.autoDetectLanguageFromMap, configuredCodes]);

  const value = {
    currentLanguage,
    setLanguage,
    supportedLanguages: supportedLanguages.length > 0 ? supportedLanguages : ALL_AVAILABLE_LANGUAGES.slice(0, 2),
    allAvailableLanguages: ALL_AVAILABLE_LANGUAGES,
    mapLanguage,
    t,
    detectLanguageFromLocation,
    autoDetectEnabled: Boolean(config?.autoDetectLanguageFromMap),
    mapLanguageMode: config?.googleMapsLanguage || 'auto'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      currentLanguage: 'en',
      setLanguage: () => {},
      supportedLanguages: ALL_AVAILABLE_LANGUAGES.slice(0, 2),
      allAvailableLanguages: ALL_AVAILABLE_LANGUAGES,
      mapLanguage: 'en',
      t: (key, fallback) => fallback || key,
      detectLanguageFromLocation: () => null,
      autoDetectEnabled: false,
      mapLanguageMode: 'auto'
    };
  }
  return context;
};

export default LanguageContext;

