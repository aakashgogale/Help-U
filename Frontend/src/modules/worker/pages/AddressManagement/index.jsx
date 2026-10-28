import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMapPin, FiSave, FiSearch, FiHome, FiBriefcase, FiCheck, FiTool } from 'react-icons/fi';
import { useAppGoogleMaps } from '../../../../hooks/useGoogleMapsConfig';
import { toast } from 'react-hot-toast';
import { workerTheme as themeColors } from '../../../../theme';
import workerService from '../../../../services/workerService';
import Header from '../../components/layout/Header';
import LocationPicker from '../../../user/pages/Checkout/components/LocationPicker';
import flutterBridge from '../../../../utils/flutterBridge';
import { reverseGeocodeCoords } from '../../../../utils/reverseGeocode';

const libraries = ['places', 'geometry'];

const AddressManagement = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState(''); // Display address
  const [houseNumber, setHouseNumber] = useState('');
  const [addressType, setAddressType] = useState('home'); // home, office, custom
  const [customName, setCustomName] = useState('');
  const [savedAddressData, setSavedAddressData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null); // { lat, lng, address, components... }
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const { isLoaded } = useAppGoogleMaps({
    libraries
  });

  // Load saved address from backend
  useEffect(() => {
    let active = true;
    const loadAddress = async () => {
      try {
        setFetchingProfile(true);
        const response = await workerService.getProfile();
        if (!active) return;
        
        if (response.success && response.worker?.address) {
          const addr = response.worker.address;
          setSavedAddressData(addr);

          let displayAddress = '';
          let location = null;
          let houseNum = '';

          if (typeof addr === 'string') {
            displayAddress = addr;
          } else {
            houseNum = addr.addressLine1 || '';
            displayAddress = addr.fullAddress || addr.address || '';

            if (!displayAddress && addr.city) {
              displayAddress = [addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
            }

            if (addr.lat && addr.lng) {
              const latNum = parseFloat(addr.lat);
              const lngNum = parseFloat(addr.lng);
              if (!isNaN(latNum) && !isNaN(lngNum)) {
                location = {
                  lat: latNum,
                  lng: lngNum,
                  address: displayAddress
                };
              }
            }

            if (addr.type) setAddressType(addr.type);
            if (addr.customName) setCustomName(addr.customName);
          }

          setAddress(displayAddress);
          setSearchQuery(displayAddress);
          setHouseNumber(houseNum);
          if (location) {
            setSelectedLocation(location);
          }
        } else {
          // If no address saved in worker profile, auto-detect device location immediately
          try {
            const pos = await flutterBridge.getCurrentLocation();
            if (active && pos?.latitude && pos?.longitude) {
              const geocoded = await reverseGeocodeCoords(pos.latitude, pos.longitude);
              if (active) {
                const autoAddr = geocoded.formattedAddress || geocoded.shortLabel || '';
                const locObj = {
                  lat: pos.latitude,
                  lng: pos.longitude,
                  address: autoAddr,
                  components: geocoded.components
                };
                setSelectedLocation(locObj);
                setAddress(autoAddr);
                setSearchQuery(autoAddr);
                if (geocoded.area) setHouseNumber(geocoded.area);
              }
            }
          } catch (autoLocErr) {
            console.warn('Auto-detect in AddressManagement error:', autoLocErr);
          }
        }
      } catch (error) {
        console.error('Error loading address:', error);
      } finally {
        if (active) setFetchingProfile(false);
      }
    };
    loadAddress();
    return () => { active = false; };
  }, []);

  // Safe Google Places Autocomplete on input element
  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.places || !searchInputRef.current) return;

    try {
      if (!autocompleteRef.current) {
        const ac = new window.google.maps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: 'in' },
          fields: ['formatted_address', 'geometry', 'name', 'address_components']
        });

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
            setAddress(loc.address);
            setSearchQuery(loc.address);
          }
        });

        autocompleteRef.current = ac;
      }
    } catch (err) {
      console.warn('Failed to bind Places autocomplete:', err);
    }
  }, [isLoaded]);

  const handleLocationSelect = (location) => {
    if (!location) return;
    setSelectedLocation(location);
    setSearchQuery(location.address || '');
    setAddress(location.address || '');
  };

  const handleSave = async () => {
    if (!address && !searchQuery) {
      toast.error('Please select an address');
      return;
    }

    if (!selectedLocation || typeof selectedLocation.lat !== 'number' || typeof selectedLocation.lng !== 'number') {
      toast.error('Please pin your location on the map');
      return;
    }

    setLoading(true);

    let city = '';
    let state = '';
    let pincode = '';
    let addressLine2 = '';

    if (selectedLocation.components && Array.isArray(selectedLocation.components)) {
      selectedLocation.components.forEach(comp => {
        if (comp.types.includes('locality')) city = comp.long_name;
        if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
        if (comp.types.includes('postal_code')) pincode = comp.long_name;
        if (comp.types.includes('sublocality')) addressLine2 = comp.long_name;
      });
    }

    // Fallback parsing from address string if needed
    const fullText = selectedLocation.address || address || searchQuery;
    if (!city && fullText) {
      const parts = fullText.split(',').map(p => p.trim());
      city = parts.length > 2 ? parts[parts.length - 3] : (parts.length > 1 ? parts[parts.length - 2] : parts[0]);
    }

    const addrData = {
      type: addressType,
      customName: addressType === 'custom' ? customName.trim() : '',
      fullAddress: fullText,
      addressLine1: houseNumber.trim(),
      addressLine2: addressLine2,
      city: city,
      state: state,
      pincode: pincode,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    };

    try {
      const response = await workerService.updateProfile({
        address: addrData
      });

      if (response.success) {
        toast.success('Address saved successfully!');
        setSavedAddressData(response.worker?.address || addrData);

        // Update local header cache and notify components
        try {
          const label = fullText || houseNumber || city || 'Location set';
          localStorage.setItem('workerLocationLabel', label);
        } catch (e) {
          /* ignore */
        }
        window.dispatchEvent(new Event('workerAddressUpdated'));
      } else {
        toast.error(response.message || 'Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error(error.response?.data?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/worker/dashboard');
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <Header
        title="Manage Business Address"
        showBack={true}
        onBack={handleBack}
      />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Info Card */}
        <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-100/80 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
              <FiMapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-0.5">Set Base Service Location</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Place the pin accurately to define your base location for receiving nearby job alerts and calculating travel distance.
              </p>
            </div>
          </div>
        </div>

        {/* Current Saved Address Display Card */}
        {savedAddressData && (savedAddressData.fullAddress || savedAddressData.addressLine1) && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Current Saved Address</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase flex items-center gap-1">
                <FiCheck className="w-3 h-3" /> Active
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              {[savedAddressData.addressLine1, savedAddressData.fullAddress || savedAddressData.address].filter(Boolean).join(', ')}
            </p>
            {savedAddressData.lat && savedAddressData.lng && (
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                GPS: {Number(savedAddressData.lat).toFixed(4)}, {Number(savedAddressData.lng).toFixed(4)}
              </p>
            )}
          </div>
        )}

        {/* Map Section */}
        <div className="bg-white rounded-2xl shadow-xs overflow-hidden border border-slate-200/90">
          <div className="px-4 py-2.5 bg-slate-100/60 border-b border-slate-200/70 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Pin Location on Map</span>
            <span className="text-[11px] text-slate-400">Drag or tap to adjust</span>
          </div>
          <LocationPicker
            onLocationSelect={handleLocationSelect}
            initialPosition={selectedLocation}
            height={260}
          />
        </div>

        {/* Form Inputs Container */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-4">
          
          {/* Address Autocomplete / Search */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Search Street / Area Name
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={isLoaded ? "Type locality, landmark, or street..." : "Search for area..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* House / Shop / Building Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Shop / Flat / Building Number
            </label>
            <div className="relative">
              <FiHome className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="e.g. Shop 104, 2nd Floor, ABC Complex"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Address Save Name / Tag (Home, Office, Custom) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Save Address As
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAddressType('home')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  addressType === 'home'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FiHome className="w-3.5 h-3.5" />
                Home
              </button>

              <button
                type="button"
                onClick={() => setAddressType('office')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  addressType === 'office'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FiBriefcase className="w-3.5 h-3.5" />
                Office
              </button>

              <button
                type="button"
                onClick={() => setAddressType('custom')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  addressType === 'custom'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FiTool className="w-3.5 h-3.5" />
                Custom
              </button>
            </div>

            {addressType === 'custom' && (
              <div className="mt-2.5">
                <input
                  type="text"
                  placeholder="e.g. Workshop, Service Hub, Garage"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            )}
          </div>

          {/* Coordinates Display */}
          {selectedLocation && (
            <div className="text-[11px] font-mono text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex items-center justify-between">
              <span>Latitude: {Number(selectedLocation.lat)?.toFixed(5)}</span>
              <span>Longitude: {Number(selectedLocation.lng)?.toFixed(5)}</span>
            </div>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={(!searchQuery && !address) || !selectedLocation || loading}
            className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm mt-1"
            style={{
              background: '#0F7457',
              boxShadow: '0 4px 12px rgba(15, 116, 87, 0.25)'
            }}
          >
            <FiSave className="w-4 h-4" />
            {loading ? 'Saving Address...' : 'Save Service Location'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default AddressManagement;
