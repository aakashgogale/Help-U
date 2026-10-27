import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiClock, FiLoader, FiImage } from 'react-icons/fi';
import api from '../../../../services/api';
import Modal from '../../components/Modal';
import IconUploadWithPreview from '../../components/IconUploadWithPreview';
import DetailFieldsEditor from '../UserCategories/components/DetailFieldsEditor';
import { toAssetUrl } from '../UserCategories/utils';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-xs font-bold text-gray-700 mb-1';

const emptyForm = () => ({
  name: '', group: '', image: '', info: '',
  pricingMode: 'per_unit', unit: 'kg', ratePerUnit: '', minQuantity: 1, order: 0,
  requiresPhoto: false, isActive: true, detailFields: []
});

const fromType = (t) => ({
  name: t.name, group: t.group || '', image: t.image || '', info: t.info || '',
  pricingMode: t.pricingMode, unit: t.unit, ratePerUnit: t.ratePerUnit ?? '', minQuantity: t.minQuantity ?? 1,
  order: t.order ?? 0, requiresPhoto: !!t.requiresPhoto, isActive: t.isActive !== false,
  // Saved questions keep their keys when renamed
  detailFields: (t.detailFields || []).map((f) => ({ ...f, keyLocked: true }))
});

const Switch = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
  >
    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
  </button>
);

/** Rate cell: edit in place and press Enter or leave the field to save only the rate */
const RateCell = ({ type, onSave }) => {
  const [value, setValue] = useState(String(type.ratePerUnit ?? ''));
  const [busy, setBusy] = useState(false);

  if (type.pricingMode === 'quote') return <span className="text-xs font-semibold text-amber-700">Quoted by admin</span>;

  const commit = async () => {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) {
      setValue(String(type.ratePerUnit));
      return toast.error('Enter a rate above 0');
    }
    if (next === type.ratePerUnit) return undefined;
    setBusy(true);
    const ok = await onSave(type, next);
    if (!ok) setValue(String(type.ratePerUnit));
    setBusy(false);
    return undefined;
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-bold text-gray-500">₹</span>
      <input
        type="number"
        min="0"
        step="0.5"
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        aria-label={`Rate for ${type.name}`}
        className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-xs text-gray-500">/ {type.unit}</span>
    </div>
  );
};

const ScrapTypes = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { id|null, form }
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState(null); // { type, rows }

  const load = useCallback(async () => {
    try {
      const res = await api.get('/scrap/admin/types');
      if (res.data.success) setTypes(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load scrap types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const map = new Map();
    types.forEach((t) => {
      const g = t.group || 'Other';
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(t);
    });
    return [...map.entries()];
  }, [types]);

  const patch = async (type, body, okMessage) => {
    try {
      const res = await api.put(`/scrap/admin/types/${type._id}`, body);
      if (res.data.success) {
        setTypes((prev) => prev.map((t) => (t._id === type._id ? res.data.data : t)));
        if (okMessage) toast.success(okMessage);
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    }
    return false;
  };

  const saveForm = async (e) => {
    e.preventDefault();
    const { form } = editing;
    if (!form.name.trim()) return toast.error('Name is required');
    if (form.pricingMode === 'per_unit' && !(Number(form.ratePerUnit) > 0)) return toast.error('Enter the rate');

    const body = {
      ...form,
      ratePerUnit: form.pricingMode === 'quote' ? 0 : Number(form.ratePerUnit),
      detailFields: form.detailFields.map((f) => {
        const out = { ...f };
        delete out.keyLocked;
        return out;
      })
    };

    setSaving(true);
    try {
      const res = editing.id
        ? await api.put(`/scrap/admin/types/${editing.id}`, body)
        : await api.post('/scrap/admin/types', body);
      if (res.data.success) {
        toast.success(editing.id ? 'Saved' : 'Scrap type added');
        setEditing(null);
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (type) => {
    if (!window.confirm(`Delete "${type.name}"? If customers have already sold it, it is switched off instead.`)) return;
    try {
      const res = await api.delete(`/scrap/admin/types/${type._id}`);
      toast.success(res.data.message || 'Done');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const openHistory = async (type) => {
    setHistory({ type, rows: null });
    try {
      const res = await api.get(`/scrap/admin/types/${type._id}/history`);
      setHistory({ type, rows: res.data.data || [] });
    } catch {
      setHistory(null);
      toast.error('Could not load the rate history');
    }
  };

  const setForm = (patchObj) => setEditing((prev) => ({ ...prev, form: { ...prev.form, ...patchObj } }));

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><FiLoader className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  const form = editing?.form;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-gray-900">Scrap types &amp; rates</h2>
          <p className="text-xs text-gray-500">
            What customers can sell, and what you pay. Edit a rate right in the table; each change is kept in its history.
            Types priced “Quoted by admin” (like old appliances) get a price after you review them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ id: null, form: emptyForm() })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-700"
        >
          <FiPlus /> Add type
        </button>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-gray-800">No scrap types yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Until you add some, customers see the old free-text form. Add types like Iron, Aluminium or Copper with a rate per kg.
          </p>
        </div>
      )}

      {groups.map(([group, rows]) => (
        <div key={group} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-gray-600">{group}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <tbody className="divide-y divide-gray-100">
                {rows.map((t) => (
                  <tr key={t._id} className={t.isActive ? '' : 'bg-gray-50/70 opacity-70'}>
                    <td className="w-14 px-4 py-3">
                      {t.image ? (
                        <img src={toAssetUrl(t.image)} alt="" className="h-10 w-10 rounded-lg border border-gray-200 object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-400"><FiImage /></span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <p className="text-sm font-bold text-gray-900">{t.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {t.pricingMode === 'quote' ? 'Per piece, quoted' : `Min ${t.minQuantity} ${t.unit}`}
                        {t.detailFields?.length ? ` · ${t.detailFields.length} question${t.detailFields.length === 1 ? '' : 's'}` : ''}
                        {t.requiresPhoto ? ' · photo required' : ''}
                      </p>
                    </td>
                    <td className="px-2 py-3"><RateCell type={t} onSave={(type, rate) => patch(type, { ratePerUnit: rate }, 'Rate updated')} /></td>
                    <td className="px-2 py-3">
                      <Switch checked={t.isActive} onChange={(v) => patch(t, { isActive: v })} label={`Show ${t.name} to customers`} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {t.pricingMode === 'per_unit' && (
                          <button type="button" onClick={() => openHistory(t)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Rate history" title="Rate history"><FiClock /></button>
                        )}
                        <button type="button" onClick={() => setEditing({ id: t._id, form: fromType(t) })} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" aria-label="Edit" title="Edit"><FiEdit2 /></button>
                        <button type="button" onClick={() => remove(t)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Delete" title="Delete"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Add / edit */}
      <Modal isOpen={!!editing} onClose={() => !saving && setEditing(null)} title={editing?.id ? 'Edit scrap type' : 'Add scrap type'} size="lg">
        {form && (
          <form onSubmit={saveForm} className="space-y-4 overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Name</label>
                <input className={inputClass} value={form.name} maxLength={80} onChange={(e) => setForm({ name: e.target.value })} placeholder="e.g. Aluminium" required />
              </div>
              <div>
                <label className={labelClass}>Group</label>
                <input
                  className={inputClass}
                  list="scrap-groups"
                  value={form.group}
                  maxLength={60}
                  onChange={(e) => setForm({ group: e.target.value })}
                  placeholder="e.g. Metals"
                />
                <datalist id="scrap-groups">
                  {groups.map(([g]) => <option key={g} value={g} />)}
                </datalist>
              </div>
              <div>
                <label className={labelClass}>How is it priced?</label>
                <select
                  className={inputClass}
                  value={form.pricingMode}
                  onChange={(e) => setForm({ pricingMode: e.target.value, unit: e.target.value === 'quote' ? 'piece' : form.unit })}
                >
                  <option value="per_unit">Posted rate (per kg or per piece)</option>
                  <option value="quote">Quoted by admin after review</option>
                </select>
              </div>
              {form.pricingMode === 'per_unit' && (
                <>
                  <div>
                    <label className={labelClass}>Unit</label>
                    <select className={inputClass} value={form.unit} onChange={(e) => setForm({ unit: e.target.value })}>
                      <option value="kg">Per kg</option>
                      <option value="piece">Per piece</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Rate (₹ per {form.unit})</label>
                    <input type="number" min="0" step="0.5" className={inputClass} value={form.ratePerUnit} onChange={(e) => setForm({ ratePerUnit: e.target.value })} required />
                  </div>
                  <div>
                    <label className={labelClass}>Minimum quantity ({form.unit})</label>
                    <input type="number" min="0" step="0.5" className={inputClass} value={form.minQuantity} onChange={(e) => setForm({ minQuantity: e.target.value })} />
                  </div>
                </>
              )}
              <div>
                <label className={labelClass}>Display order</label>
                <input type="number" min="0" className={inputClass} value={form.order} onChange={(e) => setForm({ order: e.target.value })} />
              </div>
            </div>

            <div>
              <label className={labelClass}>What we accept (optional)</label>
              <textarea
                rows={2}
                maxLength={500}
                className={inputClass}
                value={form.info}
                onChange={(e) => setForm({ info: e.target.value })}
                placeholder="e.g. Clean aluminium sheets, utensils and frames. No painted or rusted pieces."
              />
            </div>

            <IconUploadWithPreview
              value={form.image}
              onChange={(url) => setForm({ image: url })}
              folder="scrap"
              label="Image (optional)"
              helperText="A square picture of this kind of scrap."
              compact
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                <span className="text-sm font-semibold text-gray-800">Photo required<span className="block text-xs font-normal text-gray-500">Customer must add a photo</span></span>
                <Switch checked={form.requiresPhoto} onChange={(v) => setForm({ requiresPhoto: v })} label="Photo required" />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                <span className="text-sm font-semibold text-gray-800">Shown to customers<span className="block text-xs font-normal text-gray-500">Switch off to hide it</span></span>
                <Switch checked={form.isActive} onChange={(v) => setForm({ isActive: v })} label="Shown to customers" />
              </label>
            </div>

            <div>
              <label className={labelClass}>Questions the customer answers (optional)</label>
              <p className="mb-2 text-xs text-gray-500">For example “Clean or mixed?” for metal, or “Brand” and “Working?” for an old appliance.</p>
              <DetailFieldsEditor value={form.detailFields} onChange={(detailFields) => setForm({ detailFields })} />
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setEditing(null)} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Rate history */}
      <Modal isOpen={!!history} onClose={() => setHistory(null)} title={history ? `${history.type.name}: rate history` : ''} size="sm">
        <div className="overflow-y-auto p-5">
          {!history?.rows ? (
            <div className="flex justify-center py-6"><FiLoader className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : history.rows.length === 0 ? (
            <p className="text-sm text-gray-500">No changes recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {history.rows.map((r) => (
                <li key={r._id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-bold text-gray-900">
                    {r.previousRate !== null && r.previousRate !== undefined ? `₹${r.previousRate} → ` : 'Started at '}₹{r.rate}
                  </span>
                  <span className="text-right text-xs text-gray-500">
                    {new Date(r.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    {r.changedBy?.name ? <span className="block">{r.changedBy.name}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ScrapTypes;
