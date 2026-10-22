import React from 'react';
import { FiMapPin, FiRefreshCw } from 'react-icons/fi';
import { useZone } from '../../context/ZoneContext';

const OutOfZoneScreen = ({ onChangeLocation }) => {
  const { detectFromBrowser, zoneLoading } = useZone();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-6">
      <div className="max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-6">
          <FiMapPin className="w-10 h-10 text-orange-500" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          We're not in your area yet
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Our services are currently not available at your current location.
          We're expanding quickly — check back soon or select a different address.
        </p>

        <div className="flex flex-col gap-3">
          {onChangeLocation && (
            <button
              onClick={onChangeLocation}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all active:scale-95 shadow-sm"
            >
              <FiMapPin className="w-4 h-4" />
              Change Location / Address
            </button>
          )}

          <button
            onClick={detectFromBrowser}
            disabled={zoneLoading}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all active:scale-95 ${
              onChangeLocation
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            <FiRefreshCw className={`w-4 h-4 ${zoneLoading ? 'animate-spin' : ''}`} />
            {zoneLoading ? 'Detecting...' : 'Retry Location Detection'}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Make sure location services are enabled on your device.
        </p>
      </div>
    </div>
  );
};

export default OutOfZoneScreen;
