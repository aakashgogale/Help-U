import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiMapPin, FiHome, FiBriefcase, FiCheck, FiCheckCircle } from 'react-icons/fi';
import AddressSelectionModal from '../Checkout/components/AddressSelectionModal';
import { userAuthService } from '../../../../services/authService';

const ManageAddresses = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMenu, setShowMenu] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);
  const [houseNumber, setHouseNumber] = useState('');

  // Fetch addresses on mount
  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await userAuthService.getProfile();
      if (response.success && response.user?.addresses) {
        setAddresses(response.user.addresses);
      }
    } catch (error) {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setHouseNumber('');
    setShowAddModal(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setHouseNumber(address.addressLine2 || '');
    setShowMenu(null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingAddress(null);
    setHouseNumber('');
  };

  const getComponent = (components, type) => {
    return components?.find(c => c.types.includes(type))?.long_name || '';
  };

  const handleSaveAddress = async (savedHouseNumber, locationObj) => {
    try {
      if (!locationObj || !locationObj.address) {
        toast.error('Please select an address on the map');
        return;
      }

      // Extract details
      const components = locationObj.components || locationObj.address_components || [];
      let city = getComponent(components, 'locality') || getComponent(components, 'administrative_area_level_2') || '';
      let state = getComponent(components, 'administrative_area_level_1') || '';
      let pincode = getComponent(components, 'postal_code') || '';

      // Fallbacks if Google Places didn't return discrete components
      const fullText = locationObj.address || '';
      if (!pincode && fullText) {
        const pinMatch = fullText.match(/\b\d{6}\b/);
        if (pinMatch) pincode = pinMatch[0];
      }
      if (!city && fullText) {
        const parts = fullText.split(',').map(p => p.trim());
        city = parts.length > 2 ? parts[parts.length - 3] : (parts.length > 1 ? parts[parts.length - 2] : parts[0]);
      }

      const addressData = {
        addressLine1: fullText,
        addressLine2: savedHouseNumber || '',
        city: city || 'City',
        state: state || 'State',
        pincode: pincode || '000000',
        landmark: locationObj.landmark || ''
      };

      const newAddress = {
        type: locationObj.addressType || (editingAddress ? editingAddress.type : 'home'),
        customName: locationObj.customName || (editingAddress ? editingAddress.customName : ''),
        ...addressData,
        lat: locationObj.lat || null,
        lng: locationObj.lng || null,
        isDefault: editingAddress ? editingAddress.isDefault : addresses.length === 0
      };

      let updatedAddresses;
      if (editingAddress) {
        const editId = editingAddress._id || editingAddress.id;
        updatedAddresses = addresses.map(addr => ((addr._id || addr.id) === editId ? { ...addr, ...newAddress } : addr));
      } else {
        // Append new address - allow multiple addresses
        updatedAddresses = [...addresses, newAddress];
      }

      // Call API
      toast.loading('Saving address...');
      const response = await userAuthService.updateProfile({ addresses: updatedAddresses });
      toast.dismiss();

      if (response.success) {
        setAddresses(response.user?.addresses || updatedAddresses);
        toast.success(editingAddress ? 'Address updated!' : 'Address added!');

        // If this address is default, sync to local state
        if (newAddress.isDefault) {
          localStorage.setItem('currentAddress', newAddress.addressLine1);
          if (newAddress.lat && newAddress.lng) {
            try { localStorage.setItem('userCoords', JSON.stringify({ lat: newAddress.lat, lng: newAddress.lng })); } catch { /* ignore */ }
          }
          if (newAddress.city) {
            localStorage.setItem('currentCity', newAddress.city);
          }
          window.dispatchEvent(new Event('userAddressSelected'));
        }

        handleCloseModal();
      } else {
        toast.error(response.message || 'Failed to save address');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to save address');
    }
  };

  const handleSelectAddress = async (targetAddress) => {
    const targetId = targetAddress._id || targetAddress.id;
    const updated = addresses.map(addr => ({
      ...addr,
      isDefault: (addr._id || addr.id) === targetId
    }));

    setAddresses(updated);

    try {
      await userAuthService.updateProfile({ addresses: updated });
      const fullText = targetAddress.addressLine2
        ? `${targetAddress.addressLine2}, ${targetAddress.addressLine1}`
        : targetAddress.addressLine1;
      
      localStorage.setItem('currentAddress', targetAddress.addressLine1 || fullText);
      if (targetAddress.lat && targetAddress.lng) {
        try { localStorage.setItem('userCoords', JSON.stringify({ lat: targetAddress.lat, lng: targetAddress.lng })); } catch { /* ignore */ }
      }
      if (targetAddress.city) {
        localStorage.setItem('currentCity', targetAddress.city);
      }
      window.dispatchEvent(new Event('userAddressSelected'));
      toast.success('Active address selected!');
    } catch (err) {
      toast.error('Failed to set active address');
    }
  };

  const handleDelete = async (addressId) => {
    try {
      const target = addresses.find(addr => (addr._id || addr.id) === addressId);
      const updatedAddresses = addresses.filter(addr => (addr._id || addr.id) !== addressId);

      // If we deleted the default address and have remaining addresses, set the first one as default
      if (target?.isDefault && updatedAddresses.length > 0) {
        updatedAddresses[0].isDefault = true;
      }

      toast.loading('Deleting address...');
      const response = await userAuthService.updateProfile({ addresses: updatedAddresses });
      toast.dismiss();

      if (response.success) {
        setAddresses(response.user?.addresses || updatedAddresses);
        setShowMenu(null);
        toast.success('Address deleted successfully!');
      } else {
        toast.error('Failed to delete address');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to delete address');
    }
  };

  const handleMenuToggle = (addressId) => {
    setShowMenu(showMenu === addressId ? null : addressId);
  };

  const renderBadge = (address) => {
    const type = (address.type || 'home').toLowerCase();
    if (type === 'home') {
      return (
        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-md text-[11px] font-bold uppercase flex items-center gap-1">
          <FiHome className="w-3 h-3" /> Home
        </span>
      );
    }
    if (type === 'office') {
      return (
        <span className="px-2 py-0.5 bg-blue-50 border border-blue-200/80 text-blue-800 rounded-md text-[11px] font-bold uppercase flex items-center gap-1">
          <FiBriefcase className="w-3 h-3" /> Office
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-purple-50 border border-purple-200/80 text-purple-800 rounded-md text-[11px] font-bold uppercase flex items-center gap-1">
        <FiMapPin className="w-3 h-3" /> {address.customName || 'Other'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-800" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Manage Addresses</h1>
          </div>
          <button
            onClick={handleAddAddress}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-xs"
          >
            <FiPlus className="w-3.5 h-3.5" />
            Add Address
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Saved Addresses Section Heading */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Saved Addresses ({addresses.length})
          </h2>
          <span className="text-xs text-gray-500">Tap address to select as active</span>
        </div>

        {/* Loading State */}
        {loading && addresses.length === 0 && (
          <div className="py-12 text-center bg-white rounded-2xl border border-gray-200 shadow-xs">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-gray-500">Loading your addresses...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && addresses.length === 0 && (
          <div className="py-12 px-6 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-xs">
            <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiMapPin className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">No Saved Addresses</h3>
            <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">
              Add your home, office, or custom locations to book services quickly.
            </p>
            <button
              onClick={handleAddAddress}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <FiPlus className="w-4 h-4" />
              Add Your First Address
            </button>
          </div>
        )}

        {/* Address List */}
        <div className="space-y-3">
          {addresses.map((address) => {
            const addrId = address._id || address.id;
            const isSelected = Boolean(address.isDefault);

            return (
              <div
                key={addrId}
                onClick={() => handleSelectAddress(address)}
                className={`bg-white border rounded-2xl p-4 relative cursor-pointer transition-all shadow-xs ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Menu Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuToggle(addrId);
                  }}
                  className="absolute top-3.5 right-3.5 p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 z-10"
                >
                  <FiMoreVertical className="w-4 h-4" />
                </button>

                {/* Menu Dropdown */}
                {showMenu === addrId && (
                  <div
                    className="absolute top-11 right-3.5 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[130px] py-1 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleEdit(address)}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors text-left text-xs font-semibold text-gray-700"
                    >
                      <FiEdit2 className="w-3.5 h-3.5 text-gray-500" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(addrId)}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 transition-colors text-left text-xs font-semibold text-red-600"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}

                {/* Address Card Content */}
                <div className="pr-10">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {renderBadge(address)}
                    {isSelected ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-bold uppercase flex items-center gap-1">
                        <FiCheck className="w-3 h-3" /> Selected Default
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-gray-400 hover:text-emerald-600">
                        Click to select as default
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-gray-800 leading-snug mb-1">
                    {address.addressLine2 ? `${address.addressLine2}, ` : ''}{address.addressLine1}
                  </p>

                  <p className="text-xs text-gray-500">
                    {[address.city, address.state].filter(Boolean).join(', ')}{address.pincode && ` - ${address.pincode}`}
                  </p>
                  {address.landmark && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Landmark: {address.landmark}
                    </p>
                  )}
                </div>

                {/* Bottom Selection Bar */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <FiCheck className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </div>
                    <span className={`text-xs font-semibold ${isSelected ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                      {isSelected ? 'Active Address for Bookings' : 'Set as Active Address'}
                    </span>
                  </div>

                  {!isSelected && (
                    <span className="text-[11px] font-bold text-emerald-600">
                      Select
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Address Button At Bottom */}
        {addresses.length > 0 && (
          <button
            onClick={handleAddAddress}
            className="w-full py-3.5 border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-gray-600 hover:text-emerald-600 transition-all bg-white hover:bg-emerald-50/20 active:scale-[0.99]"
          >
            <FiPlus className="w-4 h-4" />
            Add Another Address
          </button>
        )}
      </main>

      {/* Address Selection Modal */}
      <AddressSelectionModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        houseNumber={houseNumber}
        onHouseNumberChange={setHouseNumber}
        onSave={handleSaveAddress}
        initialType={editingAddress?.type || 'home'}
        initialCustomName={editingAddress?.customName || ''}
        address={editingAddress?.addressLine1 || ''}
      />

      {/* Close menu when clicking outside */}
      {showMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowMenu(null)}
        />
      )}
    </div>
  );
};

export default ManageAddresses;
