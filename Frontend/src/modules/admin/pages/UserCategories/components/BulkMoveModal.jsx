import React, { useState } from "react";
import { FiFolder, FiTag, FiMove, FiX } from "react-icons/fi";
import Modal from "./Modal";

/**
 * BulkMoveModal
 * Lets admins relocate selected services to another brand and category.
 */
const BulkMoveModal = ({
  isOpen,
  onClose,
  selectedCount,
  brands = [],
  categories = [],
  onConfirmMove,
  loading = false,
}) => {
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  if (!isOpen) return null;

  const handleBrandChange = (e) => {
    const bId = e.target.value;
    setSelectedBrandId(bId);
    // Auto-select category if brand defines a single parent
    const found = brands.find((b) => (b.id || b._id) === bId);
    if (found?.categoryId) {
      const cId = typeof found.categoryId === "object" ? found.categoryId._id || found.categoryId.id : found.categoryId;
      if (cId) setSelectedCategoryId(cId);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBrandId) return;
    onConfirmMove({
      brandId: selectedBrandId,
      categoryId: selectedCategoryId || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Move ${selectedCount} Service${selectedCount > 1 ? "s" : ""}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Select the destination Brand and Category. All {selectedCount} selected services will be remapped.
        </p>

        {/* Brand selection (required) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Destination Brand / Provider <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedBrandId}
            onChange={handleBrandChange}
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Choose Target Brand --</option>
            {brands.map((b) => {
              const bId = b.id || b._id;
              return (
                <option key={bId} value={bId}>
                  {b.title || "Untitled Brand"}
                </option>
              );
            })}
          </select>
        </div>

        {/* Category selection (optional / fallback) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Destination Category (Optional)
          </label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Auto-infer from Brand --</option>
            {categories.map((c) => {
              const cId = c.id || c._id;
              return (
                <option key={cId} value={cId}>
                  {c.title || "Untitled Category"}
                </option>
              );
            })}
          </select>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedBrandId}
            className="px-5 py-2 bg-[#2874F0] hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <FiMove className="w-4 h-4" />
            {loading ? "Moving..." : "Move Services"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BulkMoveModal;
