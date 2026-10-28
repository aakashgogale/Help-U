import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FiArrowLeft, FiX, FiSearch, FiMapPin, FiHome, FiBriefcase, FiTag } from 'react-icons/fi';
import { useAppGoogleMaps } from '../../../../../hooks/useGoogleMapsConfig';
import { themeColors } from '../../../../../theme';
import LocationPicker from './LocationPicker';
import useModalLock from '../../../../../hooks/useModalLock';

const libraries = ['places', 'geometry'];

const AddressSelectionModal = ({
  isOpen,
  onClose,
  address = '',
  houseNumber = '',
  onHouseNumberChange,
  onSave,
  initialType = 'home',
  initialCustomName = ''
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapAddress, setMapAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addressType, setAddressType] = useState(initialType || 'home'); // home, office, custom
  const [customName, setCustomName] = useState(initialCustomName || '');

  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const { isLoaded } = useAppGoogleMaps({
    libraries
  });

  useModalLock(isOpen);

  const [mapHeight, setMapHeight] = useState(180);
  useEffect(() => {
    if (!isOpen) return undefined;
    const update = () => setMapHeight(Math.max(160, Math.min(280, window.innerHeight - 480)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setIsClosing(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setAddressType(initialType || 'home');
      setCustomName(initialCustomName || '');
      if (address) {
        setSearchQuery(address);
        setMapAddress(address);
      }
    }
  }, [isOpen, initialType, initialCustomName, address]);

  // Safe Google Places Autocomplete on input element
  useEffect(() => {
    if (!isOpen || !isLoaded || !window.google?.maps?.places || !searchInputRef.current) return;

    try {
      if (!autocompleteRef.current) {
        const options = {
          componentRestrictions: { country: 'in' },
          types: ['geocode'],
          fields: ['formatted_address', 'geometry', 'name', 'address_components']
        };

        const ac = new window.google.maps.places.Autocomplete(searchInputRef.current, options);

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (place && place.geometry && place.geometry.location) {
            const loc = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              address: place.formatted_address || place.name || '',
              components: place.address_components
            };
            setSelectedLocation(loc);
            setMapAddress(loc.address);
            setSearchQuery(loc.address);
          }
        });

        autocompleteRef.current = ac;
      }
    } catch (e) {
      console.warn('Places Autocomplete initialization error:', e);
    }
  }, [isOpen, isLoaded]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleLocationSelect = (location) => {
    if (!location) return;
    setSelectedLocation(location);
    setMapAddress(location.address || '');
    setSearchQuery(location.address || '');
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
              <h1 className="text-lg font-bold text-black">Confirm Location & Address</h1>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <FiX className="w-5 h-5 text-black" />
            </button>
          </div>

          {/* Scrollable Container */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {/* Map Section */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="rounded-2xl overflow-hidden shadow-xs border border-gray-200">
                <LocationPicker
                  onLocationSelect={handleLocationSelect}
                  initialPosition={selectedLocation}
                  height={mapHeight}
                />
              </div>
            </div>

            {/* Address Details Form */}
            <div className="px-4 pt-1 pb-5 space-y-3">
              {/* Address Search */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-0.5">
                  Pinpoint Area / Street
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search for area, street name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-all"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* House / Flat number */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-0.5">
                  House / Flat / Shop Number *
                </label>
                <div className="relative">
                  <FiHome className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                  <input
                    type="text"
                    placeholder="e.g. H No 12 or Flat 101, Block B"
                    value={houseNumber}
                    onChange={(e) => onHouseNumberChange && onHouseNumberChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* Landmark */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-0.5">
                  Landmark (Optional)
                </label>
                <div className="relative">
                  <FiMapPin className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                  <input
                    type="text"
                    placeholder="e.g. Near City Mall, opposite SBI Bank"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* Save Address As (Home, Office, Custom) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-0.5">
                  Save Address As
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddressType('home')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      addressType === 'home'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <FiHome className="w-3.5 h-3.5" />
                    Home
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddressType('office')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      addressType === 'office'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <FiBriefcase className="w-3.5 h-3.5" />
                    Office
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddressType('custom')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      addressType === 'custom'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <FiTag className="w-3.5 h-3.5" />
                    Custom
                  </button>
                </div>

                {addressType === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="e.g. Mom's House, Shop, Studio, Clinic"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={() =>
                  onSave(houseNumber.trim(), {
                    ...(selectedLocation || { address: mapAddress || searchQuery }),
                    address: selectedLocation?.address || mapAddress || searchQuery,
                    landmark: landmark.trim(),
                    addressType,
                    customName: addressType === 'custom' ? customName.trim() : ''
                  })
                }
                disabled={(!mapAddress && !searchQuery) || !houseNumber.trim()}
                className="w-full py-3.5 rounded-xl font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-xs uppercase tracking-wider mt-2"
                style={{
                  backgroundColor: themeColors.button,
                  boxShadow: `0 6px 14px ${themeColors.button}30`
                }}
              >
                Verify & Save Address
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddressSelectionModal;
