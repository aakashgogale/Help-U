import React, { useState, useEffect, useRef } from 'react';
import { FiMapPin, FiSave, FiSearch, FiHome, FiBriefcase, FiTool } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAppGoogleMaps } from '../../../../../hooks/useGoogleMapsConfig';
import workerService from '../../../../../services/workerService';
import LocationPicker from '../../../../user/pages/Checkout/components/LocationPicker';
import flutterBridge from '../../../../../utils/flutterBridge';
import { reverseGeocodeCoords } from '../../../../../utils/reverseGeocode';

const libraries = ['places', 'geometry'];

const TYPES = [
  { key: 'home', label: 'Home', Icon: FiHome },
  { key: 'office', label: 'Office', Icon: FiBriefcase },
  { key: 'custom', label: 'Custom', Icon: FiTool }
];

const inputClass = 'w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all';

// Add a new address, or edit a saved one (`initial`). `isFirst`: the only address, so it is the base location.
const AddressForm = ({ initial = null, isFirst = false, onSaved, onCancel }) => {
  const [address, setAddress] = useState(initial?.fullAddress || '');
  const [searchQuery, setSearchQuery] = useState(initial?.fullAddress || '');
  const [houseNumber, setHouseNumber] = useState(initial?.addressLine1 || '');
  const [addressType, setAddressType] = useState(initial?.addressType || 'office');
  const [customName, setCustomName] = useState(initial?.customName || '');
  const [makeActive, setMakeActive] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(
    initial && Number.isFinite(initial.lat) && Number.isFinite(initial.lng)
      ? { lat: initial.lat, lng: initial.lng, address: initial.fullAddress }
      : null
  );
  const [loading, setLoading] = useState(false);

  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const { isLoaded } = useAppGoogleMaps({ libraries });

  // A new address starts from where the partner is now
  useEffect(() => {
    if (initial) return undefined;
    let active = true;
    (async () => {
      try {
        const pos = await flutterBridge.getCurrentLocation();
        if (!active || !pos?.latitude || !pos?.longitude) return;
        const geocoded = await reverseGeocodeCoords(pos.latitude, pos.longitude);
        if (!active) return;
        const autoAddr = geocoded.formattedAddress || geocoded.shortLabel || '';
        setSelectedLocation({ lat: pos.latitude, lng: pos.longitude, address: autoAddr, components: geocoded.components });
        setAddress(autoAddr);
        setSearchQuery(autoAddr);
        if (geocoded.area) setHouseNumber(geocoded.area);
      } catch (err) {
        console.warn('Auto-detect location failed:', err);
      }
    })();
    return () => { active = false; };
  }, [initial]);

  // Google Places autocomplete on the search box
  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.places || !searchInputRef.current || autocompleteRef.current) return;
    try {
      const ac = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address', 'geometry', 'name', 'address_components']
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place?.geometry?.location) {
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
    const fullText = selectedLocation?.address || address || searchQuery;
    if (!fullText) {
      toast.error('Please select an address');
      return;
    }
    if (!selectedLocation || typeof selectedLocation.lat !== 'number' || typeof selectedLocation.lng !== 'number') {
      toast.error('Please pin your location on the map');
      return;
    }
    if (addressType === 'custom' && !customName.trim()) {
      toast.error('Give this address a name');
      return;
    }

    // Town / state / pincode come from the map; an edit that did not move the pin keeps what was saved
    let city = '';
    let state = '';
    let pincode = '';
    let addressLine2 = '';
    if (Array.isArray(selectedLocation.components)) {
      selectedLocation.components.forEach((comp) => {
        if (comp.types.includes('locality')) city = comp.long_name;
        if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
        if (comp.types.includes('postal_code')) pincode = comp.long_name;
        if (comp.types.includes('sublocality')) addressLine2 = comp.long_name;
      });
    } else if (initial) {
      ({ city = '', state = '', pincode = '', addressLine2 = '' } = initial);
    }
    if (!city && fullText) {
      const parts = fullText.split(',').map((p) => p.trim());
      city = parts.length > 2 ? parts[parts.length - 3] : (parts.length > 1 ? parts[parts.length - 2] : parts[0]);
    }

    const payload = {
      addressType,
      customName: addressType === 'custom' ? customName.trim() : '',
      fullAddress: fullText,
      addressLine1: houseNumber.trim(),
      addressLine2,
      city,
      state,
      pincode,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    };

    setLoading(true);
    try {
      const response = initial
        ? await workerService.updateSavedAddress(initial._id, payload)
        : await workerService.addAddress({ ...payload, makeActive: makeActive || isFirst });
      if (response.success) {
        toast.success(initial ? 'Address updated' : 'Address added');
        onSaved(response.addresses || []);
      } else {
        toast.error(response.message || 'Failed to save address');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const showBaseOption = !initial && !isFirst;

  return (
    <>
      {/* Map */}
      <div className="bg-white rounded-2xl shadow-xs overflow-hidden border border-slate-200/90">
        <div className="px-4 py-2.5 bg-slate-100/60 border-b border-slate-200/70 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>Pin Location on Map</span>
          <span className="text-[11px] text-slate-400">Drag or tap to adjust</span>
        </div>
        <LocationPicker onLocationSelect={handleLocationSelect} initialPosition={selectedLocation} height={260} />
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Search Street / Area Name</label>
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={isLoaded ? 'Type locality, landmark, or street...' : 'Search for area...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Shop / Flat / Building Number</label>
          <div className="relative">
            <FiHome className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="e.g. Shop 104, 2nd Floor, ABC Complex"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Save Address As</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((type) => {
              const TypeIcon = type.Icon;
              return (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => setAddressType(type.key)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    addressType === type.key
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <TypeIcon className="w-3.5 h-3.5" />
                  {type.label}
                </button>
              );
            })}
          </div>
          {addressType === 'custom' && (
            <input
              type="text"
              maxLength={40}
              placeholder="e.g. Workshop, Service Hub, Garage"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="mt-2.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          )}
        </div>

        {selectedLocation && (
          <div className="text-[11px] font-mono text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex items-center justify-between">
            <span>Latitude: {Number(selectedLocation.lat).toFixed(5)}</span>
            <span>Longitude: {Number(selectedLocation.lng).toFixed(5)}</span>
          </div>
        )}

        {showBaseOption && (
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100 cursor-pointer">
            <input
              type="checkbox"
              checked={makeActive}
              onChange={(e) => setMakeActive(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-600"
            />
            <span>
              <span className="block text-xs font-bold text-slate-800">Use as my base location</span>
              <span className="block text-[11px] text-slate-500 leading-snug">Job alerts and travel distance are calculated from your base location.</span>
            </span>
          </label>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={(!searchQuery && !address) || !selectedLocation || loading}
            className="flex-[2] py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm"
            style={{ background: '#0F7457', boxShadow: '0 4px 12px rgba(15, 116, 87, 0.25)' }}
          >
            <FiSave className="w-4 h-4" />
            {loading ? 'Saving...' : (initial ? 'Save Changes' : 'Save Address')}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddressForm;
