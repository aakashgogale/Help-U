import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { cityService } from '../../services/cityService';
import { HiPlus, HiPencil, HiTrash, HiCheck, HiX } from 'react-icons/hi';
import { FiMapPin, FiTrash2, FiPlus, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const CityManagement = () => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);

  // Area & Pincode state
  const [selectedCityForAreas, setSelectedCityForAreas] = useState(null);
  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [newArea, setNewArea] = useState({ name: '', pincode: '', serviceAvailable: true });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    country: 'India',
    isActive: true,
    isDefault: false
  });

  const fetchCities = async () => {
    try {
      setLoading(true);
      const response = await cityService.getAll();
      if (response.success) {
        setCities(response.cities);
      }
    } catch (error) {
      toast.error('Failed to load cities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCity) {
        await cityService.update(editingCity._id, formData);
        toast.success('City updated successfully');
      } else {
        await cityService.create(formData);
        toast.success('City created successfully');
      }
      setIsModalOpen(false);
      setEditingCity(null);
      resetForm();
      fetchCities();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this city?')) return;
    try {
      await cityService.delete(id);
      toast.success('City deleted successfully');
      fetchCities();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await cityService.toggleStatus(id);
      toast.success('Status updated');
      fetchCities();
    } catch (error) {
      toast.error('Status update failed');
    }
  };

  const openEditModal = (city) => {
    setEditingCity(city);
    setFormData({
      name: city.name,
      state: city.state,
      country: city.country,
      isActive: city.isActive,
      isDefault: city.isDefault
    });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingCity(null);
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      state: '',
      country: 'India',
      isActive: true,
      isDefault: false
    });
  };

  const openAreasModal = async (city) => {
    setSelectedCityForAreas(city);
    setNewArea({ name: '', pincode: '', serviceAvailable: true });
    try {
      setAreasLoading(true);
      const res = await cityService.getAreas(city._id);
      if (res.success) {
        setAreas(res.areas || []);
      }
    } catch (err) {
      toast.error('Failed to load areas');
    } finally {
      setAreasLoading(false);
    }
  };

  const handleCreateArea = async (e) => {
    e.preventDefault();
    if (!newArea.name.trim() || !newArea.pincode.trim()) {
      toast.error('Area name and pincode are required');
      return;
    }
    try {
      const res = await cityService.createArea(selectedCityForAreas._id, newArea);
      if (res.success) {
        toast.success('Area added successfully');
        setAreas(prev => [...prev, res.area]);
        setNewArea({ name: '', pincode: '', serviceAvailable: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add area');
    }
  };

  const handleToggleArea = async (area) => {
    try {
      const updated = !area.serviceAvailable;
      const res = await cityService.updateArea(selectedCityForAreas._id, area._id, { serviceAvailable: updated });
      if (res.success) {
        toast.success(`Service ${updated ? 'enabled' : 'disabled'} for ${area.name}`);
        setAreas(prev => prev.map(a => a._id === area._id ? { ...a, serviceAvailable: updated } : a));
      }
    } catch (err) {
      toast.error('Failed to update area');
    }
  };

  const handleDeleteArea = async (areaId) => {
    if (!window.confirm('Delete this area?')) return;
    try {
      const res = await cityService.deleteArea(selectedCityForAreas._id, areaId);
      if (res.success) {
        toast.success('Area deleted');
        setAreas(prev => prev.filter(a => a._id !== areaId));
      }
    } catch (err) {
      toast.error('Failed to delete area');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">City Management</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <HiPlus /> Add City
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Name</th>
              <th className="p-4 font-semibold text-gray-600">State</th>
              <th className="p-4 font-semibold text-gray-600">Slug</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600">Default</th>
              <th className="p-4 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cities.map((city) => (
              <tr key={city._id} className="hover:bg-gray-50/50">
                <td className="p-4 font-medium text-gray-900">{city.name}</td>
                <td className="p-4 text-gray-600">{city.state}</td>
                <td className="p-4 text-gray-500 text-sm">{city.slug}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleToggleStatus(city._id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${city.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                      }`}
                  >
                    {city.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="p-4">
                  {city.isDefault ? (
                    <span className="flex items-center gap-1 text-teal-600 text-sm font-medium">
                      <HiCheck /> Default
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAreasModal(city)}
                      className="px-2.5 py-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                      title="Manage Areas & Pincodes"
                    >
                      <FiMapPin className="w-3.5 h-3.5" /> Areas
                    </button>
                    <button
                      onClick={() => openEditModal(city)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <HiPencil className="w-5 h-5" />
                    </button>
                    {!city.isDefault && (
                      <button
                        onClick={() => handleDelete(city._id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <HiTrash className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {cities.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400">
                  No cities found. Add your first city!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal - Inline Implementation for simplicity if common modal not found easily */}
      {/* Assuming we might want a simple overlay here if we don't use the common Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-lg">{editingCity ? 'Edit City' : 'Add City'}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:bg-gray-200 rounded-full p-1"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Mumbai"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Maharashtra"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    disabled={editingCity?.isDefault} // Cannot unset default directly, must set another
                  />
                  <span className="text-sm text-gray-700">Default City</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                >
                  {editingCity ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Areas & Pincodes Hierarchy Modal */}
      {selectedCityForAreas && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
                  <FiMapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base">Areas & Pincodes — {selectedCityForAreas.name}</h2>
                  <p className="text-xs text-slate-300">{selectedCityForAreas.state || 'India'} · Configure serviceable localities</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCityForAreas(null)}
                className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-colors"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Add New Area Form */}
              <form onSubmit={handleCreateArea} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Add New Locality / Pincode</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Area / Locality Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vijay Nagar"
                      value={newArea.name}
                      onChange={e => setNewArea({ ...newArea, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Pincode (6 digits)</label>
                    <input
                      type="text"
                      required
                      maxLength="6"
                      placeholder="e.g. 452010"
                      value={newArea.pincode}
                      onChange={e => setNewArea({ ...newArea, pincode: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <FiPlus className="w-4 h-4" /> Add Area
                    </button>
                  </div>
                </div>
              </form>

              {/* Area List Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Configured Areas ({areas.length})
                  </h3>
                  <span className="text-xs text-slate-500">Click badge to toggle service availability</span>
                </div>

                {areasLoading ? (
                  <div className="text-center py-8 text-xs text-gray-400">Loading areas...</div>
                ) : areas.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No localities added for {selectedCityForAreas.name} yet. Add one above!
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Area Name</th>
                          <th className="p-3">Pincode</th>
                          <th className="p-3">Service Availability</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {areas.map(area => (
                          <tr key={area._id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-900">{area.name}</td>
                            <td className="p-3 font-mono text-slate-600">{area.pincode}</td>
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => handleToggleArea(area)}
                                className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all ${
                                  area.serviceAvailable
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              >
                                {area.serviceAvailable ? <FiCheckCircle className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
                                {area.serviceAvailable ? 'Serviceable' : 'Unavailable'}
                              </button>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteArea(area._id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Area"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityManagement;
