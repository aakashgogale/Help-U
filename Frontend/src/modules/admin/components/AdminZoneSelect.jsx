import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FiMapPin, FiChevronDown, FiX, FiCheck, FiZap, FiSearch } from 'react-icons/fi';
import zoneService from '../services/zoneService';

/**
 * AdminZoneSelect
 * Reusable dropdown component for selecting operational zones in admin forms.
 * Supports single-select, multi-select, city filtering, and searching.
 */
const AdminZoneSelect = ({
  value,
  onChange,
  cityId = null,
  isMulti = false,
  placeholder = 'All Zones (Platform-wide)',
  label = 'Target Zone(s)',
  helperText = '',
  required = false,
  disabled = false,
  allowAll = true,
  className = ''
}) => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Fetch zones on mount or when cityId changes
  useEffect(() => {
    let isMounted = true;
    const fetchZones = async () => {
      try {
        setLoading(true);
        const params = { status: 'active' };
        if (cityId) params.cityId = cityId;
        const res = await zoneService.getAll(params);
        if (isMounted && res?.success && Array.isArray(res.zones)) {
          setZones(res.zones);
        }
      } catch (err) {
        console.error('Failed to load zones for AdminZoneSelect:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchZones();
    return () => { isMounted = false; };
  }, [cityId]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered zones by search query
  const filteredZones = useMemo(() => {
    if (!search.trim()) return zones;
    const q = search.toLowerCase();
    return zones.filter(z =>
      z.name.toLowerCase().includes(q) ||
      (z.cityName && z.cityName.toLowerCase().includes(q))
    );
  }, [zones, search]);

  // Selected values handling
  const selectedZoneIds = useMemo(() => {
    if (isMulti) {
      if (Array.isArray(value)) return value.map(String);
      return value ? [String(value)] : [];
    }
    return value ? [String(value)] : [];
  }, [value, isMulti]);

  const handleSelectZone = (zoneId) => {
    if (isMulti) {
      const strId = String(zoneId);
      const exists = selectedZoneIds.includes(strId);
      const updated = exists
        ? selectedZoneIds.filter(id => id !== strId)
        : [...selectedZoneIds, strId];
      onChange(updated);
    } else {
      onChange(zoneId);
      setIsOpen(false);
    }
  };

  const handleSelectAll = () => {
    if (isMulti) {
      onChange([]);
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  // Selected names display
  const displayText = useMemo(() => {
    if (selectedZoneIds.length === 0) {
      return placeholder;
    }
    if (isMulti) {
      if (selectedZoneIds.length === 1) {
        const found = zones.find(z => String(z.id || z._id) === selectedZoneIds[0]);
        return found ? found.name : '1 Zone Selected';
      }
      return `${selectedZoneIds.length} Zones Selected`;
    }
    const found = zones.find(z => String(z.id || z._id) === selectedZoneIds[0]);
    return found ? found.name : placeholder;
  }, [selectedZoneIds, isMulti, zones, placeholder]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FiMapPin className="text-purple-600 w-3.5 h-3.5" />
            {label}
            {required && <span className="text-rose-500">*</span>}
          </span>
          {isMulti && selectedZoneIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-purple-600 hover:text-purple-800 font-normal cursor-pointer"
            >
              Clear all
            </button>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
          isOpen ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-gray-200 bg-gray-50/70 hover:bg-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          <FiMapPin className={`w-4 h-4 shrink-0 ${selectedZoneIds.length > 0 ? 'text-purple-600' : 'text-gray-400'}`} />
          <span className={`text-xs truncate ${selectedZoneIds.length > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
            {loading ? 'Loading operational zones...' : displayText}
          </span>
        </div>
        <FiChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-purple-600' : ''}`} />
      </button>

      {/* Multi-select chips preview */}
      {isMulti && selectedZoneIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedZoneIds.map(id => {
            const z = zones.find(item => String(item.id || item._id) === id);
            if (!z) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-semibold border border-purple-200"
              >
                <span>{z.name}</span>
                <button
                  type="button"
                  onClick={() => handleSelectZone(id)}
                  className="hover:text-purple-900 cursor-pointer"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Search Bar */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search zones..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Zones List */}
          <div className="overflow-y-auto p-1.5 space-y-1">
            {allowAll && (
              <button
                type="button"
                onClick={handleSelectAll}
                className={`w-full px-3 py-2 text-left rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  selectedZoneIds.length === 0 ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{placeholder}</span>
                </div>
                {selectedZoneIds.length === 0 && <FiCheck className="w-3.5 h-3.5 text-purple-600" />}
              </button>
            )}

            {filteredZones.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                {loading ? 'Loading zones...' : 'No operational zones found'}
              </div>
            ) : (
              filteredZones.map(zone => {
                const zId = String(zone.id || zone._id);
                const isSelected = selectedZoneIds.includes(zId);
                return (
                  <button
                    key={zId}
                    type="button"
                    onClick={() => handleSelectZone(zId)}
                    className={`w-full px-3 py-2 text-left rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 text-purple-800 font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-3.5 h-3.5 rounded ${isMulti ? 'border flex items-center justify-center' : 'rounded-full border'} ${
                        isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && <FiCheck className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <span className="truncate">{zone.name}</span>
                        {zone.cityName && (
                          <span className="ml-1.5 text-[10px] text-gray-400 font-normal">
                            ({zone.cityName})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {zone.surgePricing?.enabled && zone.surgePricing?.multiplier > 1 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-extrabold border border-amber-200">
                          <FiZap className="w-2.5 h-2.5" />
                          {zone.surgePricing.multiplier}x
                        </span>
                      )}
                      {zone.workerCount !== undefined && (
                        <span className="text-[10px] text-gray-400">
                          {zone.workerCount} pros
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {helperText && (
        <p className="mt-1 text-[11px] text-gray-500 leading-tight">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default AdminZoneSelect;
