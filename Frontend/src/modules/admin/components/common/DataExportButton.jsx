import React, { useState, useRef, useEffect } from 'react';
import { FiDownload, FiChevronDown, FiFileText, FiGrid, FiLoader, FiShield, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';
import { readAdminUser } from '../../utils/adminNav';

/**
 * Download customer or professional data as Excel or PDF, using the filters currently set on the page.
 *   <DataExportButton entity="workers" label="workers" params={{ search, approvalStatus }} filterText="Approved only" />
 *
 * Shown to admins who may export (super admin, admin, worker_manager, or someone given the "Data Export" permission).
 * The server enforces permissions and records every export in the audit log.
 */
const canExportData = (admin = readAdminUser()) => {
  if (!admin) return true;
  const role = String(admin.role || '').toLowerCase();
  if (!role || role === 'super_admin' || role === 'admin' || role === 'worker_manager' || role === 'operations_manager') {
    return true;
  }
  return (admin.permissions || []).some((p) => p === '*' || p === 'data-export' || p === 'data_export');
};

const FORMATS = {
  xlsx: {
    name: 'Excel',
    ext: 'xlsx',
    icon: FiGrid,
    hint: 'Complete spreadsheet with all columns and data (opens in Excel, Sheets)',
    badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-200'
  },
  pdf: {
    name: 'PDF Document',
    ext: 'pdf',
    icon: FiFileText,
    hint: 'Formatted landscape PDF report with core columns (up to 2,000 rows)',
    badgeColor: 'bg-rose-50 text-rose-600 border-rose-200'
  }
};

// A failed download arrives as a Blob; read the server's message out of it
const errorMessage = async (error) => {
  const res = error && error.response;
  let message = null;
  if (res && res.data) {
    try {
      let text = res.data;
      if (text instanceof Blob) {
        text = await text.text();
      } else if (typeof text?.text === 'function') {
        text = await text.text();
      } else if (typeof text !== 'string') {
        text = JSON.stringify(text);
      }
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error;
    } catch { /* not JSON */ }
  }
  if (res && res.status === 403) return message || 'You do not have permission to export data. Ask the Super Admin for the "Data Export" permission.';
  if (res && res.status === 404) return message || 'No records match these filters, so there is nothing to export.';
  if (res && res.status === 429) return message || 'Too many exports in a row. Please wait a few minutes and try again.';
  return message || error?.message || 'The export could not be created. Please try again.';
};

const fileNameFrom = (res, fallback) => {
  const match = /filename="?([^";]+)"?/i.exec((res.headers && res.headers['content-disposition']) || '');
  return match ? match[1] : fallback;
};

const DataExportButton = ({ entity = 'workers', label = 'workers', params = {}, filterText = '', className = '' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busyFormat, setBusyFormat] = useState(null); // 'xlsx' | 'pdf' | null
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  if (!canExportData()) return null;

  const handleDownload = async (format) => {
    setMenuOpen(false);
    setBusyFormat(format);
    const toastId = toast.loading(`Preparing ${FORMATS[format].name} export...`);

    try {
      const query = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      );

      const res = await api.get(`/admin/${entity}/export`, {
        params: { ...query, format },
        responseType: 'blob',
        timeout: 180000
      });

      const mimeType = format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const downloadName = fileNameFrom(res, `helpu_${entity}_export.${format}`);
      link.setAttribute('download', downloadName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Delay URL revocation so the browser download manager can finish reading and saving the blob
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(url);
        } catch { /* ignore */ }
      }, 5000);

      toast.success(`${FORMATS[format].name} downloaded successfully!`, { id: toastId });
    } catch (error) {
      toast.error(await errorMessage(error), { id: toastId });
    } finally {
      setBusyFormat(null);
    }
  };

  const isBusy = !!busyFormat;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => !isBusy && setMenuOpen((o) => !o)}
        disabled={isBusy}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-all disabled:opacity-60 cursor-pointer"
        title="Download workers data as Excel or PDF"
      >
        {isBusy ? (
          <FiLoader className="w-3.5 h-3.5 animate-spin text-blue-600" />
        ) : (
          <FiDownload className="w-3.5 h-3.5 text-gray-600" />
        )}
        <span>{isBusy ? `Exporting ${FORMATS[busyFormat]?.name}…` : 'Export'}</span>
        <FiChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
              Download {label} Data
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {filterText ? (
                <>Filtering by: <span className="font-semibold text-gray-700">{filterText}</span></>
              ) : (
                <>Exporting <span className="font-semibold text-gray-700">all {label}</span></>
              )}
            </p>
          </div>

          <div className="space-y-1">
            {Object.entries(FORMATS).map(([key, f]) => {
              const Icon = f.icon;
              return (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  disabled={isBusy}
                  onClick={() => handleDownload(key)}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-gray-50 transition-colors group cursor-pointer"
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg border ${f.badgeColor} shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {f.name} (.{f.ext})
                    </span>
                    <span className="block text-[11px] leading-tight text-gray-500 mt-0.5">
                      {f.hint}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100 px-2.5 py-1 flex items-start gap-1.5 text-[10px] text-gray-400 leading-tight">
            <FiShield className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
            <span>Identity & banking numbers are masked. Downloads are logged for security.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExportButton;
