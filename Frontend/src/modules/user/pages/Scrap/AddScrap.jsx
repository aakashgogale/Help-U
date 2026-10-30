import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCamera, FiCheckCircle, FiImage, FiLoader, FiMapPin, FiX } from 'react-icons/fi';
import { FaRecycle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { z } from "zod";

import api from '../../../../services/api';
import AddressSelectionModal from '../Checkout/components/AddressSelectionModal';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';
import flutterBridge from '../../../../utils/flutterBridge';
import { useConfig } from '../../../../context/ConfigContext';
import PageHeader from '../../components/layout/PageHeader';
import ScrapBasket from './ScrapBasket';
import { basketTotals, basketProblem, formatMoney } from './scrapEstimate';
import ModalLock from '../../../../components/common/ModalLock';

// Zod schema for Scrap
const scrapSchema = z.object({
  title: z.string().min(3, "Title too short"),
  description: z.string().optional(),
  address: z.object({
    addressLine1: z.string().min(5, "Address must be selected"),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    lat: z.any().optional(),
    lng: z.any().optional()
  }).refine((data) => data.addressLine1 && data.addressLine1.length > 0, { message: "Pickup address is required" })
});

const AddScrap = () => {
  const navigate = useNavigate();
  const { isScrapEnabled, configLoaded } = useConfig();

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [houseNumber, setHouseNumber] = useState('');
  const [addressDetails, setAddressDetails] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    images: [],
    address: {
      addressLine1: '',
      city: '',
      state: '',
      pincode: ''
    }
  });

  // What can be sold, set by the admin. null while loading; with no types the old free-text form is used.
  const [types, setTypes] = useState(null);
  const [basket, setBasket] = useState({}); // { [typeId]: { quantity, details } }

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isFlutter, setIsFlutter] = useState(flutterBridge.isFlutter);
  const [showSourceSheet, setShowSourceSheet] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/scrap/types')
      .then((res) => { if (active) setTypes(res.data?.success ? res.data.data : []); })
      .catch(() => { if (active) setTypes([]); });
    return () => { active = false; };
  }, []);

  const typesMode = Array.isArray(types) && types.length > 0;
  const chosenTypes = typesMode ? types.filter((t) => basket[t.id]) : [];
  const photoRequired = chosenTypes.some((t) => t.requiresPhoto);
  const totals = typesMode ? basketTotals(types, basket) : { total: 0, hasQuote: false };

  // Sync flutter bridge state
  useEffect(() => {
    flutterBridge.waitForFlutter().then(ready => {
      setIsFlutter(ready);
    });
  }, []);

  const handleNativeCamera = async () => {
    const file = await flutterBridge.openCamera();
    if (file) {
      const newFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'idle'
      };
      setSelectedFiles(prev => [...prev, newFile]);
      flutterBridge.hapticFeedback('success');
    }
  };

  const handlePhotoClick = () => {
    setShowSourceSheet(true);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      return toast.error('Maximum 5 images allowed');
    }

    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'idle'
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeImage = (index) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    // Validation: the basket (picked from the scrap types) or the free-text form
    if (typesMode) {
      const problem = basketProblem(types, basket);
      if (problem) return toast.error(problem);
      if (!formData.address.addressLine1) return toast.error('Pickup address is required');
      if (photoRequired && selectedFiles.length === 0) return toast.error('Please add a photo of your scrap.');
    } else {
      const validationResult = scrapSchema.safeParse(formData);
      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        return;
      }
    }

    try {
      setIsUploading(true);
      toast.loading('Uploading images and listing items...', { id: 'scrap' });

      // 1. Upload images to Cloudinary
      const imageUrls = [];
      const updatedFiles = [...selectedFiles];

      for (let i = 0; i < updatedFiles.length; i++) {
        const item = updatedFiles[i];
        try {
          // Update status to uploading
          setSelectedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));

          const url = await uploadToCloudinary(item.file, 'scrap_items', (pct) => {
            setSelectedFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: pct } : f));
          });

          imageUrls.push(url);
          setSelectedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', progress: 100 } : f));
        } catch (err) {
          console.error('Image upload failed', err);
          setSelectedFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' } : f));
          toast.error(`Failed to upload image ${i + 1}`);
        }
      }

      // Check if we have at least one image if images were selected
      if (selectedFiles.length > 0 && imageUrls.length === 0) {
        setIsUploading(false);
        toast.dismiss('scrap');
        return toast.error('Failed to upload images. Please try again.');
      }

      // 2. Prepare final data
      const finalData = typesMode
        ? {
            description: formData.description,
            address: formData.address,
            images: imageUrls,
            items: chosenTypes.map((t) => ({
              typeId: t.id,
              quantity: Number(basket[t.id].quantity),
              details: basket[t.id].details || {}
            }))
          }
        : { ...formData, images: imageUrls };

      const res = await api.post('/scrap', finalData);
      if (res.data.success) {
        toast.success('Scrap item listed!', { id: 'scrap' });
        navigate(-1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create listing', { id: 'scrap' });
    } finally {
      setIsUploading(false);
    }
  };

  const getAddressComponent = (components, type) => {
    return components?.find(c => c.types.includes(type))?.long_name || '';
  };

  const handleAddressSave = (savedHouseNumber, locationObj) => {
    setHouseNumber(savedHouseNumber);
    setAddressDetails(locationObj);

    // Update form data with detailed address components
    if (locationObj) {
      const components = locationObj.components;
      setFormData(prev => ({
        ...prev,
        address: {
          addressLine1: locationObj.address, // Full address string
          addressLine2: savedHouseNumber,
          city: getAddressComponent(components, 'locality') || getAddressComponent(components, 'administrative_area_level_2') || '',
          state: getAddressComponent(components, 'administrative_area_level_1') || '',
          pincode: getAddressComponent(components, 'postal_code') || '',
          lat: locationObj.lat,
          lng: locationObj.lng
        }
      }));
    }
    setShowAddressModal(false);
  };

  if (!configLoaded) {
    return <div className="min-h-screen bg-canvas" />;
  }

  if (!isScrapEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-canvas">
        <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center mb-5">
          <FaRecycle className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-[18px] font-bold text-ink mb-1.5">Scrap service unavailable</h2>
        <p className="text-[14px] text-gray-500 max-w-xs mb-6 leading-relaxed">
          Scrap selling is currently turned off. Please check back later.
        </p>
        <button
          type="button"
          onClick={() => navigate('/user')}
          className="h-11 px-6 rounded-full bg-accent text-white text-[14px] font-semibold hover:bg-accent-dark active:scale-95 transition-all"
        >
          Back to home
        </button>
      </div>
    );
  }

  const fieldClass = 'w-full px-3.5 py-3 rounded-xl bg-canvas border border-transparent text-[15px] text-ink placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-accent/40 focus:ring-2 focus:ring-accent/15 transition-colors';

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader title="Sell Scrap" showBell={false} />

      <form onSubmit={handleCreate} className="px-4 py-4 max-w-2xl mx-auto space-y-3 pb-32">
        {types === null ? (
          <div className="h-40 animate-pulse rounded-[20px] bg-white" />
        ) : typesMode ? (
          <>
            <ScrapBasket types={types} basket={basket} onChange={setBasket} />
            <section className="bg-white rounded-[20px] border border-gray-100 p-4">
              <label htmlFor="scrap-description" className="block text-[13px] font-semibold text-ink mb-1.5">
                Anything else we should know? <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="scrap-description"
                className={`${fieldClass} resize-none`}
                rows="2"
                placeholder="Floor, access, how it is stored, etc."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </section>
          </>
        ) : (
        <section className="bg-white rounded-[20px] border border-gray-100 p-4 space-y-4">
          <div>
            <label htmlFor="scrap-title" className="block text-[13px] font-semibold text-ink mb-1.5">What are you selling?</label>
            <input
              id="scrap-title"
              type="text"
              className={fieldClass}
              placeholder="e.g. Old LG Split AC, Samsung Fridge"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="scrap-description" className="block text-[13px] font-semibold text-ink mb-1.5">
              Description <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="scrap-description"
              className={`${fieldClass} resize-none`}
              rows="3"
              placeholder="Condition, model year, weight, etc."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </section>
        )}

        {/* Photos */}
        <section className="bg-white rounded-[20px] border border-gray-100 p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-ink">Photos{photoRequired && <span className="text-red-500"> *</span>}</h3>
            <span className="text-[12px] text-gray-400">{selectedFiles.length}/5</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {selectedFiles.map((item, index) => (
              <div key={item.id || index} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50">
                <img src={item.preview} alt={`Scrap photo ${index + 1}`} className="w-full h-full object-cover" />

                {item.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-2">
                    <div className="w-full bg-white/30 rounded-full h-1.5 mb-1">
                      <div className="bg-white h-1.5 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                    </div>
                    <span className="text-[10px] text-white font-bold">{item.progress}%</span>
                  </div>
                )}

                {item.status === 'done' && (
                  <span className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center">
                    <FiCheckCircle size={12} />
                  </span>
                )}

                {item.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/25 flex items-center justify-center">
                    <FiX className="w-6 h-6 text-red-600" />
                  </div>
                )}

                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove photo ${index + 1}`}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
            ))}
            {selectedFiles.length < 5 && !isUploading && (
              <div
                role="button"
                tabIndex={0}
                onClick={handlePhotoClick}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePhotoClick(); }}
                className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-accent/40 hover:bg-accent-soft/40 transition-colors"
              >
                <FiCamera className="w-6 h-6 text-accent" />
                <span className="text-[11px] font-semibold text-gray-500">Add photo</span>
                <input
                  id="add-scrap-photo-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
          <p className="mt-3 text-[12px] text-gray-400">
            {photoRequired ? 'A photo is needed for what you picked.' : 'Clear photos help us send you a better price.'}
          </p>
        </section>

        {/* Pickup address */}
        <section className="bg-white rounded-[20px] border border-gray-100 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[13px] font-semibold text-ink">Pickup address</h3>
            {formData.address.addressLine1 && (
              <button
                type="button"
                onClick={() => setShowAddressModal(true)}
                className="text-[13px] font-semibold text-accent hover:text-accent-dark"
              >
                Change
              </button>
            )}
          </div>

          {formData.address.addressLine1 ? (
            <div className="flex items-start gap-2.5 rounded-2xl bg-canvas px-3.5 py-3">
              <FiMapPin className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{houseNumber ? `${houseNumber}, ` : ''}{formData.address.addressLine1.split(',')[0]}</p>
                <p className="text-[12px] text-gray-500 mt-0.5 truncate">{formData.address.addressLine1}</p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddressModal(true)}
              className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-200 text-[14px] font-semibold text-accent hover:border-accent/40 hover:bg-accent-soft/40 transition-colors inline-flex items-center justify-center gap-2"
            >
              <FiMapPin className="w-4 h-4" /> Select pickup address
            </button>
          )}
        </section>

        {/* Submit */}
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 px-4 pt-3" style={{ paddingBottom: 'max(14px, var(--safe-bottom))' }}>
          <div className="max-w-2xl mx-auto">
            {typesMode && chosenTypes.length > 0 && (
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[13px] font-semibold text-gray-500">Estimated amount</span>
                <span className="text-[18px] font-bold text-ink">
                  {totals.total > 0 ? formatMoney(totals.total) : '—'}
                  {totals.hasQuote && <span className="ml-1 text-[12px] font-medium text-gray-400">+ items we quote</span>}
                </span>
              </div>
            )}
            <button
              type="submit"
              disabled={!formData.address.addressLine1 || isUploading}
              className="w-full h-12 rounded-full bg-accent text-white text-[15px] font-semibold hover:bg-accent-dark active:scale-[0.99] transition-all disabled:opacity-50 disabled:active:scale-100 inline-flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" />
                  Listing item...
                </>
              ) : (
                typesMode ? 'Request pickup' : 'List item for pickup'
              )}
            </button>
            {!formData.address.addressLine1 && (
              <p className="mt-1.5 text-center text-[12px] text-gray-400">Select a pickup address to continue</p>
            )}
          </div>
        </div>
      </form>

      <AddressSelectionModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        address={formData.address.addressLine1 || ''}
        houseNumber={houseNumber}
        onHouseNumberChange={setHouseNumber}
        onSave={handleAddressSave}
      />

      {/* Photo source picker */}
      <AnimatePresence>
        {showSourceSheet && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <ModalLock />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSourceSheet(false)}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative bg-white w-full max-w-2xl rounded-t-[28px] px-5 pt-3 pb-10 z-10"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center mb-5">
                <h4 className="font-bold text-ink text-[17px]">Add a photo</h4>
                <button
                  type="button"
                  onClick={() => setShowSourceSheet(false)}
                  aria-label="Close"
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSourceSheet(false);
                    if (isFlutter) {
                      handleNativeCamera();
                    } else {
                      document.getElementById('add-scrap-photo-upload')?.click();
                    }
                  }}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-accent-soft active:scale-95 transition-all"
                >
                  <span className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center">
                    <FiCamera className="w-6 h-6" />
                  </span>
                  <span className="font-semibold text-ink text-[14px]">Take photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSourceSheet(false);
                    document.getElementById('add-scrap-photo-upload')?.click();
                  }}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-canvas active:scale-95 transition-all"
                >
                  <span className="w-12 h-12 rounded-full bg-white text-accent border border-gray-100 flex items-center justify-center">
                    <FiImage className="w-6 h-6" />
                  </span>
                  <span className="font-semibold text-ink text-[14px]">Gallery</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddScrap;
