import React, { useState, useRef, useEffect } from 'react';
import { FiDownload, FiChevronDown, FiFileText, FiGrid, FiLoader, FiShield } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';
import Modal from '../Modal';
import { readAdminUser } from '../../utils/adminNav';

/**
 * Download customer or professional data as Excel or PDF, using the filters currently set on the page.
 *   <DataExportButton entity="users" label="customers" params={{ search, isActive }} filterText="Blocked only" />
 *
 * Shown only to admins who may export (the super admin, or someone given the "Data Export" permission).
 * The server enforces the same rule and records every export in the audit log.
 */
export const canExportData = (admin = readAdminUser()) =>
  admin.role === 'super_admin' || (admin.permissions || []).some((p) => p === '*' || p === 'data-export' || p === 'data_export');

const FORMATS = {
  xlsx: { name: 'Excel', ext: 'xlsx', icon: FiGrid, hint: 'Every row and column (opens in Excel or Google Sheets)' },
  pdf: { name: 'PDF', ext: 'pdf', icon: FiFileText, hint: 'A readable report of the main columns, up to 2,000 rows' }
};

// A failed download arrives as a Blob; read the server's message out of it
const errorMessage = async (error) => {
  const res = error && error.response;
  let message = null;
  if (res && res.data) {
    try {
      const text = typeof res.data.text === 'function' ? await res.data.text() : JSON.stringify(res.data);
      message = JSON.parse(text).message;
    } catch (e) { /* not JSON */ }
  }
  if (res && res.status === 403) return message || 'You do not have permission to export data. Ask the Super Admin for the "Data Export" permission.';
  if (res && res.status === 404) return message || 'Nothing matches these filters, so there is nothing to export.';
  if (res && res.status === 429) return message || 'Too many exports in a row. Please wait a few minutes.';
  return message || 'The export could not be created. Please try again.';
};

const fileNameFrom = (res, fallback) => {
  const match = /filename="?([^";]+)"?/i.exec((res.headers && res.headers['content-disposition']) || '');
  return match ? match[1] : fallback;
};

const DataExportButton = ({ entity, label, params = {}, filterText = '' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [format, setFormat] = useState(null); // the format waiting for confirmation
  const [busy, setBusy] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); };
  }, [menuOpen]);

  if (!canExportData()) return null;

  const download = async () => {
    setBusy(true);
    try {
      const query = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
      const res = await api.get(`/admin/${entity}/export`, { params: { ...query, format }, responseType: 'blob', timeout: 180000 });
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileNameFrom(res, `helpu_${entity}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${FORMATS[format].name} file downloaded`);
      setFormat(null);
    } catch (error) {
      toast.error(await errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <FiDownload className="w-3.5 h-3.5" /> Export <FiChevronDown className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <div role="menu" className="absolute right-0 z-30 mt-1.5 w-64 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
            {Object.entries(FORMATS).map(([key, f]) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setFormat(key); }}
                className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50"
              >
                <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">{f.name} (.{f.ext})</span>
                  <span className="block text-[11px] leading-snug text-gray-500">{f.hint}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!format} onClose={() => !busy && setFormat(null)} title={`Export ${label} as ${format ? FORMATS[format].name : ''}`} size="sm">
        <div className="space-y-4 p-5">
          <div className="text-sm text-gray-700">
            <p>
              This will download <span className="font-semibold">{filterText ? `the ${label} matching: ${filterText}` : `all ${label}`}</span>
              {format === 'pdf' ? ' (the newest 2,000 at most).' : '.'}
            </p>
          </div>
          <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <FiShield className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The file contains personal data. Keep it safe and delete it when you no longer need it. Passwords and document images are never included, and identity and bank numbers are shown only as their last 4 characters. <b>Every export is recorded with your name and the time.</b>
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => setFormat(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="button" disabled={busy} onClick={download} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
              {busy ? <><FiLoader className="h-4 w-4 animate-spin" /> Preparing…</> : <><FiDownload className="h-4 w-4" /> Download</>}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DataExportButton;
