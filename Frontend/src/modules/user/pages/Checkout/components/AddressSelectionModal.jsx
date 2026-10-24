import React, { useState, useEffect, useMemo } from 'react';
import { FiArrowLeft, FiX, FiSearch, FiMapPin, FiHome } from 'react-icons/fi';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { themeColors } from '../../../../../theme';
import LocationPicker from './LocationPicker';
import useModalLock from '../../../../../hooks/useModalLock';

const libraries = ['places', 'geometry'];

const AddressSelectionModal = ({ isOpen, onClose, address = '', houseNumber = '', onHouseNumberChange, onSave }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapAddress, setMapAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });

  // Locks the page behind the sheet (no jump to top like position:fixed caused) and hides the nav
  useModalLock(isOpen);

  // The map takes whatever height is left once the header, the three fields and the button are
  // accounted for (about 430px incl. the dimmed strip above the sheet), so it is as big as the
  // screen allows while the sheet still never scrolls. Clamped for very short / very tall screens.
  const [mapHeight, setMapHeight] = useState(190);
  useEffect(() => {
    if (!isOpen) return undefined;
    const update = () => setMapHeight(Math.max(180, Math.min(360, window.innerHeight - 430)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setIsClosing(false);
  }, [isOpen]);

  // Suggest streets, colonies and areas (not airports/hotels/shops), nudged towards where the
  // pin currently is so "indore" resolves to nearby places first. strictBounds stays off so the
  // customer can still search elsewhere.
  const autocompleteOptions = useMemo(() => {
    const options = {
      componentRestrictions: { country: 'in' },
      types: ['geocode'],
      fields: ['formatted_address', 'geometry', 'name', 'address_components']
    };
    const maps = typeof window !== 'undefined' ? window.google?.maps : null;
    if (maps && selectedLocation?.lat && selectedLocation?.lng) {
      const d = 0.15; // roughly 15 km each way
      options.bounds = new maps.LatLngBounds(
        { lat: selectedLocation.lat - d, lng: selectedLocation.lng - d },
        { lat: selectedLocation.lat + d, lng: selectedLocation.lng + d }
      );
      options.strictBounds = false;
    }
    return options;
  }, [selectedLocation?.lat, selectedLocation?.lng, isLoaded]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setMapAddress(location.address);
    setSearchQuery(location.address);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address,
          components: place.address_components
        };
        setSelectedLocation(location);
        setMapAddress(place.formatted_address);
        setSearchQuery(place.formatted_address);
      }
    }
  };

  const onAutocompleteLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        style={{ touchAction: 'none' }}
        onClick={handleClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div
          className={`bg-white rounded-t-[32px] shadow-2xl safe-area-bottom ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
          style={{
            maxHeight: '94dvh',
            overscrollBehavior: 'contain',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderTop: '1px solid rgba(0,0,0,0.05)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10 shrink-0 flex items-center justify-between" style={{ touchAction: 'none' }}>
            <div className="flex items-center gap-3">
              <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <FiArrowLeft className="w-5 h-5 text-black" />
              </button>
              <h1 className="text-xl font-bold text-black">Confirm Location</h1>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <FiX className="w-5 h-5 text-black" />
            </button>
          </div>

          {/* Map Section */}
          <div className="px-4 pt-3 pb-2 shrink-0">
            <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                initialPosition={selectedLocation}
                height={mapHeight}
              />
            </div>
          </div>

          {/* Address details (fits on screen; the sheet never scrolls) */}
          <div
            className="px-4 pt-1 pb-3 shrink-0"
            style={{ touchAction: 'manipulation', overscrollBehavior: 'contain' }}
          >
            {/* Address Search */}
            <div className="mb-2.5">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                Pinpoint your Address
              </label>
              {isLoaded ? (
                <Autocomplete
                  onLoad={onAutocompleteLoad}
                  onPlaceChanged={onPlaceChanged}
                  options={autocompleteOptions}
                >
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                    <input
                      type="text"
                      placeholder="Search for area, street name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-all"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Autocomplete>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Loading Maps..."
                    disabled
                    className="w-full pl-4 py-3 bg-gray-100 rounded-xl text-sm"
                  />
                </div>
              )}
            </div>

            {/* House / Flat number */}
            <div className="mb-2.5">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                House No. / Flat No.
              </label>
              <div className="relative">
                <FiHome className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                <input
                  type="text"
                  placeholder="e.g. H No 12 or Flat 101"
                  value={houseNumber}
                  onChange={(e) => onHouseNumberChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Landmark */}
            <div className="mb-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                Landmark (Optional)
              </label>
              <div className="relative">
                <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                <input
                  type="text"
                  placeholder="e.g. Near City Mall, opposite SBI Bank"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={() => onSave(houseNumber.trim(), {
                ...selectedLocation,
                landmark: landmark.trim()
              })}
              disabled={!mapAddress || !houseNumber.trim()}
              className="w-full py-3.5 rounded-xl font-black text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl uppercase tracking-wider text-xs"
              style={{
                backgroundColor: themeColors.button,
                boxShadow: `0 8px 16px ${themeColors.button}30`
              }}
            >
              Verify & Save Address
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddressSelectionModal;
