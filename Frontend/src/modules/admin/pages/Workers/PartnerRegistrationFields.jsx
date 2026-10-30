import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText,
  FiUpload,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiSearch,
  FiRefreshCw,
  FiAlertCircle,
  FiArrowUp,
  FiArrowDown,
  FiCheckCircle,
  FiSliders,
  FiList,
  FiEye,
  FiInfo,
  FiHelpCircle
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import {
  getPartnerRegistrationFields,
  createPartnerRegistrationField,
  updatePartnerRegistrationField,
  togglePartnerRegistrationField,
  deletePartnerRegistrationField,
  seedDefaultPartnerRegistrationFields
} from '../../services/workerService';

const PartnerRegistrationFields = () => {
  const [fields, setFields] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'text', 'document'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    label: '',
    fieldKey: '',
    type: 'text',
    section: 'profile',
    placeholder: '',
    helpText: '',
    optionsText: '',
    isRequired: false,
    isActive: true,
    order: 1
  });

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, field: null });

  // Load fields from backend
  const fetchFields = async () => {
    setIsLoading(true);
    try {
      const res = await getPartnerRegistrationFields();
      if (res.success && Array.isArray(res.fields)) {
        setFields(res.fields);
      } else {
        toast.error('Failed to load partner registration fields');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching partner registration fields');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  // Filtered Fields
  const filteredFields = useMemo(() => {
    let list = fields;
    if (activeTab === 'text') {
      list = list.filter(f => f.type !== 'document' && f.section !== 'documents');
    } else if (activeTab === 'document') {
      list = list.filter(f => f.type === 'document' || f.section === 'documents');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(f =>
        f.label?.toLowerCase().includes(q) ||
        f.fieldKey?.toLowerCase().includes(q) ||
        f.placeholder?.toLowerCase().includes(q) ||
        f.helpText?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [fields, activeTab, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const textFields = fields.filter(f => f.type !== 'document' && f.section !== 'documents');
    const docFields = fields.filter(f => f.type === 'document' || f.section === 'documents');
    const activeCount = fields.filter(f => f.isActive).length;
    const requiredCount = fields.filter(f => f.isRequired).length;

    return {
      total: fields.length,
      textActive: textFields.filter(f => f.isActive).length,
      docActive: docFields.filter(f => f.isActive).length,
      activeCount,
      requiredCount
    };
  }, [fields]);

  // Handle open add modal
  const handleOpenAdd = (defaultType = 'text') => {
    setEditingField(null);
    const isDoc = defaultType === 'document';
    const highestOrder = fields.filter(f => isDoc ? (f.type === 'document') : (f.type !== 'document')).length + 1;

    setFormData({
      label: '',
      fieldKey: '',
      type: defaultType,
      section: isDoc ? 'documents' : 'profile',
      placeholder: '',
      helpText: '',
      optionsText: '',
      isRequired: false,
      isActive: true,
      order: highestOrder
    });
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (field) => {
    setEditingField(field);
    setFormData({
      label: field.label || '',
      fieldKey: field.fieldKey || '',
      type: field.type || 'text',
      section: field.section || (field.type === 'document' ? 'documents' : 'profile'),
      placeholder: field.placeholder || '',
      helpText: field.helpText || '',
      optionsText: Array.isArray(field.options) ? field.options.join(', ') : '',
      isRequired: Boolean(field.isRequired),
      isActive: Boolean(field.isActive),
      order: field.order || 1
    });
    setIsModalOpen(true);
  };

  // Toggle active status
  const handleToggle = async (field) => {
    try {
      const res = await togglePartnerRegistrationField(field._id);
      if (res.success) {
        toast.success(`Field "${field.label}" ${res.field.isActive ? 'activated' : 'deactivated'}`);
        setFields(prev => prev.map(f => f._id === field._id ? { ...f, isActive: res.field.isActive } : f));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to toggle status');
    }
  };

  // Save (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.label.trim()) {
      toast.error('Field label is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        label: formData.label.trim(),
        type: formData.type,
        section: formData.type === 'document' ? 'documents' : formData.section,
        placeholder: formData.placeholder.trim(),
        helpText: formData.helpText.trim(),
        isRequired: formData.isRequired,
        isActive: formData.isActive,
        order: Number(formData.order) || 1,
        options: formData.type === 'select'
          ? formData.optionsText.split(',').map(s => s.trim()).filter(Boolean)
          : []
      };

      if (editingField) {
        if (editingField.isCore) {
          delete payload.type;
          delete payload.section;
          delete payload.options;
        }
        const res = await updatePartnerRegistrationField(editingField._id, payload);
        if (res.success) {
          toast.success(`Field "${payload.label}" updated`);
          setIsModalOpen(false);
          fetchFields();
        }
      } else {
        if (formData.fieldKey.trim()) {
          payload.fieldKey = formData.fieldKey.trim();
        }
        const res = await createPartnerRegistrationField(payload);
        if (res.success) {
          toast.success(`New field "${payload.label}" created`);
          setIsModalOpen(false);
          fetchFields();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save field');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reorder single field up / down
  const handleReorder = async (field, direction) => {
    const isDoc = field.type === 'document' || field.section === 'documents';
    const groupFields = fields
      .filter(f => isDoc ? (f.type === 'document' || f.section === 'documents') : (f.type !== 'document' && f.section !== 'documents'))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentIndex = groupFields.findIndex(f => f._id === field._id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= groupFields.length) return;

    const targetField = groupFields[targetIndex];

    try {
      const currentOrder = field.order || (currentIndex + 1);
      const targetOrder = targetField.order || (targetIndex + 1);

      await Promise.all([
        updatePartnerRegistrationField(field._id, { order: targetOrder }),
        updatePartnerRegistrationField(targetField._id, { order: currentOrder })
      ]);

      toast.success('Field order updated');
      fetchFields();
    } catch (err) {
      console.error(err);
      toast.error('Failed to reorder');
    }
  };

  // Confirm delete
  const handleDelete = async () => {
    if (!deleteModal.field) return;
    try {
      const res = await deletePartnerRegistrationField(deleteModal.field._id);
      if (res.success) {
        toast.success(`Field "${deleteModal.field.label}" deleted`);
        setDeleteModal({ isOpen: false, field: null });
        fetchFields();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete field');
    }
  };

  // Seed default fields
  const handleSeedDefaults = async () => {
    try {
      const res = await seedDefaultPartnerRegistrationFields();
      if (res.success) {
        toast.success('Default fields verified & initialized');
        fetchFields();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to seed default fields');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-teal-50 text-[#347989]">
                <FiSliders className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-gray-900">Partner Registration Fields & Documents</h1>
            </div>
            <p className="text-sm text-gray-500 max-w-2xl">
              Control every field of the service partner signup form. Core fields (name, email, Aadhar, PAN, documents, services...) can be renamed, reordered, hidden or made optional; add your own text boxes and document uploads next to them. Changes show on the registration page immediately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSeedDefaults}
              className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Ensure sensible recommended default fields exist"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              <span>Defaults</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAdd('text')}
              className="px-4 py-2 text-xs font-bold text-white bg-[#347989] hover:bg-[#2b6573] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FiPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Text Box</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAdd('document')}
              className="px-4 py-2 text-xs font-bold text-white bg-[#D68F35] hover:bg-[#b87624] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FiUpload className="w-4 h-4 stroke-[2.5]" />
              <span>Add Document Upload</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 block mb-1">Total Dynamic Fields</span>
            <span className="text-xl font-extrabold text-gray-900">{stats.total}</span>
          </div>

          <div className="bg-teal-50/60 p-3.5 rounded-xl border border-teal-100">
            <span className="text-xs text-teal-700 block mb-1">Active Text Inputs</span>
            <span className="text-xl font-extrabold text-teal-800">{stats.textActive}</span>
          </div>

          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100">
            <span className="text-xs text-amber-700 block mb-1">Active Document Uploads</span>
            <span className="text-xl font-extrabold text-amber-800">{stats.docActive}</span>
          </div>

          <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-100">
            <span className="text-xs text-rose-700 block mb-1">Mandatory (Required)</span>
            <span className="text-xl font-extrabold text-rose-800">{stats.requiredCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Fields ({fields.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-teal-700'
            }`}
          >
            <FiFileText className="w-3.5 h-3.5" />
            <span>Text Boxes ({fields.filter(f => f.type !== 'document' && f.section !== 'documents').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('document')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'document'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-amber-700'
            }`}
          >
            <FiUpload className="w-3.5 h-3.5" />
            <span>Document Uploads ({fields.filter(f => f.type === 'document' || f.section === 'documents').length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search fields or identifiers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-teal-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Fields List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="w-7 h-7 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading partner registration fields...</p>
          </div>
        ) : filteredFields.length === 0 ? (
          <div className="py-16 text-center text-gray-400 px-4">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-400 border border-gray-100">
              <FiSliders className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">No registration fields found</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
              {searchQuery ? 'Try matching another keyword or clear search' : 'Add your first dynamic text box or document upload option'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenAdd('text')}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#347989] text-white rounded-lg shadow-xs"
              >
                + Add Text Box
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdd('document')}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#D68F35] text-white rounded-lg shadow-xs"
              >
                + Add Document Upload
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredFields.map((field) => {
              const isDoc = field.type === 'document' || field.section === 'documents';

              return (
                <div
                  key={field._id}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    field.isActive ? 'hover:bg-gray-50/60' : 'bg-gray-50/30 opacity-75'
                  }`}
                >
                  {/* Left Column: Reorder + Icon + Info */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Order controls */}
                    <div className="flex flex-col gap-0.5 items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReorder(field, 'up')}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                        title="Move Up"
                      >
                        <FiArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-bold text-gray-400 font-mono">
                        #{field.order || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReorder(field, 'down')}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                        title="Move Down"
                      >
                        <FiArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isDoc
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-teal-50 text-[#347989] border-teal-200'
                      }`}
                    >
                      {isDoc ? <FiUpload className="w-5 h-5" /> : <FiFileText className="w-5 h-5" />}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 truncate">
                          {field.label}
                        </span>

                        {/* Badges */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                            isDoc
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {isDoc ? 'Doc Upload' : field.type === 'services' ? 'Service Picker' : field.type.toUpperCase()}
                        </span>

                        {field.isCore && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                            title={field.isLocked ? 'Identifies the partner account: always shown and mandatory' : 'Part of the core form: can be hidden or made optional, not deleted'}
                          >
                            {field.isLocked ? 'Core · Locked' : 'Core'}
                          </span>
                        )}

                        {field.isRequired ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Required *
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            Optional
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                          key: {field.fieldKey}
                        </span>
                      </div>

                      {/* Helper / Placeholder info */}
                      <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                        {field.placeholder && (
                          <span className="truncate max-w-xs">
                            <span className="text-gray-400">Placeholder:</span> "{field.placeholder}"
                          </span>
                        )}
                        {field.helpText && (
                          <span className="truncate max-w-sm text-gray-400 italic">
                            <FiInfo className="w-3 h-3 inline mr-1 text-gray-400" />
                            {field.helpText}
                          </span>
                        )}
                        {field.type === 'select' && Array.isArray(field.options) && field.options.length > 0 && (
                          <span className="text-gray-400">
                            Options: {field.options.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Active Toggle + Action Buttons */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {/* Active Toggle Switch */}
                    <div className="flex items-center gap-2 mr-2">
                      <span className={`text-[11px] font-semibold ${field.isActive ? 'text-teal-700' : 'text-gray-400'}`}>
                        {field.isActive ? 'Active' : 'Disabled'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggle(field)}
                        disabled={field.isLocked}
                        title={field.isLocked ? 'This field identifies the partner account and cannot be turned off' : undefined}
                        className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ease-in-out ${
                          field.isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        } ${field.isActive ? 'bg-[#347989]' : 'bg-gray-300'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-xs transition-transform duration-200 ease-in-out ${
                            field.isActive ? 'translate-x-4.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(field)}
                      className="p-2 text-gray-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors cursor-pointer border border-gray-200"
                      title="Edit Field"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>

                    {/* Delete button (core fields are turned off instead) */}
                    <button
                      type="button"
                      onClick={() => setDeleteModal({ isOpen: true, field })}
                      disabled={field.isCore}
                      className={`p-2 rounded-xl transition-colors border border-gray-200 ${
                        field.isCore
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                      }`}
                      title={field.isCore ? 'Core field: turn it off instead of deleting' : 'Delete Field'}
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl ${formData.type === 'document' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-[#347989]'}`}>
                  {formData.type === 'document' ? <FiUpload className="w-5 h-5" /> : <FiFileText className="w-5 h-5" />}
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingField ? `Edit "${editingField.label}"` : (formData.type === 'document' ? 'Add Verification Document' : 'Add Dynamic Text Box')}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {formData.type === 'document' ? 'Partner will be asked to upload an image or PDF' : 'Partner will enter information in a text input'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {editingField?.isCore && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-800">
                  <FiInfo className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    This is part of the core partner form. You can change its title, hint, order{editingField.isLocked ? '' : ', visibility and whether it is mandatory'}.
                    {editingField.isLocked && ' It identifies the partner account, so it is always shown and mandatory.'}
                  </span>
                </div>
              )}

              {/* Field Category & Type */}
              <div className={`grid grid-cols-2 gap-3 ${editingField?.isCore ? 'hidden' : ''}`}>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Field Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type === 'document' ? 'document' : 'text'}
                    onChange={(e) => {
                      const isDoc = e.target.value === 'document';
                      setFormData(prev => ({
                        ...prev,
                        type: isDoc ? 'document' : 'text',
                        section: isDoc ? 'documents' : 'profile'
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:border-teal-500 bg-white"
                  >
                    <option value="text">Profile Text Box</option>
                    <option value="document">Verification Document Upload</option>
                  </select>
                </div>

                {formData.type !== 'document' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Input Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:border-teal-500 bg-white"
                    >
                      <option value="text">Single Line Text</option>
                      <option value="number">Number (Numeric)</option>
                      <option value="textarea">Multi-line Textarea</option>
                      <option value="select">Dropdown Select</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Field Label */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Field Label / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={formData.type === 'document' ? 'e.g. Driving License' : 'e.g. GSTIN Number'}
                  value={formData.label}
                  onChange={(e) => setFormData(p => ({ ...p, label: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              {/* Identifier / Key (Optional custom key) */}
              <div className={editingField?.isCore ? 'hidden' : ''}>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Unique Identifier Key <span className="text-gray-400 font-normal">(optional, auto-generated from label)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. driving_license or gstin"
                  value={formData.fieldKey}
                  onChange={(e) => setFormData(p => ({ ...p, fieldKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-xl outline-none focus:border-teal-500 bg-gray-50/50"
                  disabled={Boolean(editingField)}
                />
                <p className="text-[11px] text-gray-400 mt-0.5">Used as JSON key in database</p>
              </div>

              {/* Placeholder (Only for text inputs) */}
              {formData.type !== 'document' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Placeholder Hint Text
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    value={formData.placeholder}
                    onChange={(e) => setFormData(p => ({ ...p, placeholder: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
              )}

              {/* Dropdown Options if select */}
              {formData.type === 'select' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Dropdown Options <span className="text-gray-400 font-normal">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1 Year, 2-3 Years, 5+ Years"
                    value={formData.optionsText}
                    onChange={(e) => setFormData(p => ({ ...p, optionsText: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:border-teal-500"
                  />
                </div>
              )}

              {/* Helper text */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Helper / Guidance Note <span className="text-gray-400 font-normal">(displayed under the field)</span>
                </label>
                <input
                  type="text"
                  placeholder={formData.type === 'document' ? 'e.g. Upload clear front image of your driving license' : 'e.g. Optional for independent contractors'}
                  value={formData.helpText}
                  onChange={(e) => setFormData(p => ({ ...p, helpText: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Display Order Priority
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.order}
                  onChange={(e) => setFormData(p => ({ ...p, order: e.target.value }))}
                  className="w-24 px-3 py-1.5 text-xs border border-gray-300 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              {/* Toggles */}
              {!editingField?.isLocked && (
              <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200/70">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Mandatory Field</span>
                    <span className="text-[11px] text-gray-500">Require partner to provide this during registration</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isRequired}
                    onChange={(e) => setFormData(p => ({ ...p, isRequired: e.target.checked }))}
                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 cursor-pointer"
                  />
                </label>

                <div className="border-t border-gray-200/60 pt-2.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Active Status</span>
                      <span className="text-[11px] text-gray-500">Immediately show or hide on the partner signup form</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(p => ({ ...p, isActive: e.target.checked }))}
                      className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#347989] hover:bg-[#2b6573] rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingField ? 'Save Changes' : 'Create Field'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <FiTrash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Delete Field?</h3>
            <p className="text-xs text-gray-500 text-center mb-5">
              Are you sure you want to remove <span className="font-semibold text-gray-800">"{deleteModal.field?.label}"</span>? New partners will no longer be asked for this.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, field: null })}
                className="flex-1 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerRegistrationFields;
