import React, { useRef } from 'react';
import { FiCamera, FiX, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import bookingFeaturesService from '../../services/bookingFeaturesService';
import { compressImage, fileToBase64 } from '../../utils/imageCompression';

/**
 * Photo evidence for a dispute or a dispute reply. Each photo uploads as soon
 * as it is picked; the parent sends the finished URLs.
 *
 * items: [{ id, preview, url, status: 'uploading' | 'done' | 'error' }]
 */
const EvidencePicker = ({ role, items, setItems, max = 5 }) => {
  const inputRef = useRef(null);
  if (max <= 0) return null;

  const update = (id, changes) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));

  const upload = async (id, file) => {
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8, mimeType: 'image/jpeg' });
      const dataUrl = await fileToBase64(compressed);
      const res = await bookingFeaturesService.uploadDisputeEvidence(role, dataUrl);
      if (!res?.success || !res.url) throw new Error(res?.message || 'Upload failed');
      update(id, { url: res.url, status: 'done' });
    } catch (error) {
      update(id, { status: 'error' });
      toast.error(error.response?.data?.message || 'Photo upload failed');
    }
  };

  const addFiles = (files) => {
    const images = files.filter((f) => f?.type?.startsWith('image/'));
    const room = max - items.length;
    if (images.length > room) toast.error(`You can add up to ${max} photos`);
    const accepted = images.slice(0, Math.max(0, room));
    const entries = accepted.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      preview: URL.createObjectURL(file),
      url: null,
      status: 'uploading'
    }));
    setItems((prev) => [...prev, ...entries]);
    entries.forEach((entry, i) => upload(entry.id, accepted[i]));
  };

  const remove = (id) => setItems((prev) => {
    const target = prev.find((p) => p.id === id);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    return prev.filter((p) => p.id !== id);
  });

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
            <img src={p.preview || p.url} alt="Evidence" className="w-full h-full object-cover" />
            {p.status === 'uploading' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {p.status === 'error' && (
              <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                <FiAlertCircle className="w-5 h-5 text-white" />
              </div>
            )}
            <button type="button" onClick={() => remove(p.id)} aria-label="Remove photo"
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
              <FiX className="w-3 h-3" />
            </button>
          </div>
        ))}
        {items.length < max && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 flex flex-col items-center justify-center">
            <FiCamera className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Add</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
    </div>
  );
};

export default EvidencePicker;
