import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiChevronLeft, FiChevronRight, FiImage } from 'react-icons/fi';
import ModalLock from '../../../../components/common/ModalLock';

/**
 * Photos the customer attached at checkout to show the problem.
 * Renders a thumbnail row; tapping one opens a full-screen viewer.
 * Renders nothing when there are no photos.
 */
const IssuePhotosGallery = ({ photos, title = 'Customer Photos', size = 'md', className = '' }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const list = Array.isArray(photos) ? photos.filter(Boolean) : [];
  if (list.length === 0) return null;

  const thumbSize = size === 'sm' ? 'w-12 h-12' : 'w-16 h-16';

  const open = (e, index) => {
    // Cards containing the gallery are often clickable themselves.
    e.stopPropagation();
    setActiveIndex(index);
  };

  const step = (e, delta) => {
    e.stopPropagation();
    setActiveIndex(i => (i + delta + list.length) % list.length);
  };

  return (
    <div className={className} onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <FiImage className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          {title} ({list.length})
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {list.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={e => open(e, index)}
            className={`${thumbSize} shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 active:scale-95 transition-transform`}
          >
            <img src={url} alt={`Customer photo ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      {activeIndex !== null && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center"
          onClick={() => setActiveIndex(null)}
        >
          <ModalLock />
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            aria-label="Close"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white"
          >
            <FiX className="w-6 h-6" />
          </button>

          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={e => step(e, -1)}
                aria-label="Previous photo"
                className="absolute left-2 p-2 rounded-full bg-white/10 text-white"
              >
                <FiChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={e => step(e, 1)}
                aria-label="Next photo"
                className="absolute right-2 p-2 rounded-full bg-white/10 text-white"
              >
                <FiChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <img
            src={list[activeIndex]}
            alt={`Customer photo ${activeIndex + 1}`}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />

          <span className="absolute bottom-6 text-white/80 text-sm font-medium">
            {activeIndex + 1} / {list.length}
          </span>
        </div>,
        document.body
      )}
    </div>
  );
};

export default IssuePhotosGallery;
