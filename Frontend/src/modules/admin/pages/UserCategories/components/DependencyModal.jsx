import React from "react";
import { FiAlertTriangle, FiTrash2, FiArchive, FiX, FiCheckCircle } from "react-icons/fi";
import Modal from "./Modal";

/**
 * DependencyModal
 * Displays dependency warnings before deleting or archiving an entity.
 * Shows active bookings, carts, child categories/services, coupons, and home references.
 */
const DependencyModal = ({
  isOpen,
  onClose,
  report,
  entityName = "Item",
  entityType = "service",
  onConfirmArchive,
  onConfirmForceDelete,
  loading = false,
}) => {
  if (!isOpen) return null;

  const hasDeps = report?.hasDependencies || false;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Dependencies Check: ${entityName}`} size="md">
      <div className="space-y-5">
        {hasDeps ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <FiAlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                This {entityType} is currently in use!
              </h4>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Direct deletion may cause broken references in user carts or active bookings. Review the active references below or archive it instead (which safely hides it without breaking data).
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <FiCheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-900">
                Safe to delete
              </h4>
              <p className="text-xs text-emerald-700 mt-1">
                No active bookings, carts, or child references are currently attached to this {entityType}.
              </p>
            </div>
          </div>
        )}

        {/* Breakdown of dependencies */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-gray-500 block">Active Bookings</span>
            <span className={`text-lg font-bold ${report?.activeBookings > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {report?.activeBookings || 0}
            </span>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-gray-500 block">Active Carts</span>
            <span className={`text-lg font-bold ${report?.activeCarts > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {report?.activeCarts || 0}
            </span>
          </div>

          {report?.childCategories !== undefined && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-gray-500 block">Sub-categories</span>
              <span className={`text-lg font-bold ${report?.childCategories > 0 ? "text-amber-600" : "text-gray-900"}`}>
                {report?.childCategories || 0}
              </span>
            </div>
          )}

          {report?.brands !== undefined && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-gray-500 block">Brands / Sections</span>
              <span className={`text-lg font-bold ${report?.brands > 0 ? "text-amber-600" : "text-gray-900"}`}>
                {report?.brands || 0}
              </span>
            </div>
          )}

          {report?.services !== undefined && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-gray-500 block">Services</span>
              <span className={`text-lg font-bold ${report?.services > 0 ? "text-amber-600" : "text-gray-900"}`}>
                {report?.services || 0}
              </span>
            </div>
          )}

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-gray-500 block">Home Content References</span>
            <span className={`text-lg font-bold ${report?.homeContentReferences > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {report?.homeContentReferences || 0}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {onConfirmArchive && (
              <button
                type="button"
                onClick={onConfirmArchive}
                disabled={loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <FiArchive className="w-4 h-4" />
                Archive Safely
              </button>
            )}

            <button
              type="button"
              onClick={onConfirmForceDelete}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 text-white shadow-sm transition-colors ${
                hasDeps ? "bg-red-700 hover:bg-red-800" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              <FiTrash2 className="w-4 h-4" />
              {hasDeps ? "Force Delete" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DependencyModal;
