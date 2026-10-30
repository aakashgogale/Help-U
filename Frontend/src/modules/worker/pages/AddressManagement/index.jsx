import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiHome, FiBriefcase, FiTool, FiCheck, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import workerService from '../../../../services/workerService';
import Header from '../../components/layout/Header';
import AddressForm from './components/AddressForm';

const TYPE_META = {
  home: { label: 'Home', Icon: FiHome },
  office: { label: 'Office', Icon: FiBriefcase },
  custom: { label: 'Custom', Icon: FiTool }
};

const MAX_ADDRESSES = 10;

const AddressManagement = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState(null); // null = list, { initial } = add / edit

  // The header shows the base location, so keep it in step with the list
  const syncHeader = useCallback((list) => {
    const base = list.find((a) => a.isActive);
    try {
      if (base) localStorage.setItem('workerLocationLabel', base.fullAddress || base.addressLine1 || base.city || 'Location set');
    } catch { /* ignore */ }
    window.dispatchEvent(new Event('workerAddressUpdated'));
  }, []);

  const applyList = useCallback((list) => {
    setAddresses(list);
    syncHeader(list);
  }, [syncHeader]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await workerService.getAddresses();
        if (active && res.success) setAddresses(res.addresses || []);
      } catch {
        if (active) toast.error('Could not load your addresses');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleBack = () => {
    if (form) {
      setForm(null);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/worker/dashboard');
    }
  };

  const runAction = async (id, action, failMessage) => {
    setBusyId(id);
    try {
      const res = await action();
      if (res.success) {
        applyList(res.addresses || []);
        toast.success(res.message || 'Done');
      } else {
        toast.error(res.message || failMessage);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || failMessage);
    } finally {
      setBusyId(null);
    }
  };

  const handleSetBase = (address) => runAction(address._id, () => workerService.setBaseAddress(address._id), 'Failed to change base location');

  const handleDelete = (address) => {
    if (!window.confirm('Delete this address?')) return;
    runAction(address._id, () => workerService.deleteAddress(address._id), 'Failed to delete address');
  };

  const labelOf = (address) => (address.addressType === 'custom' && address.customName
    ? address.customName
    : TYPE_META[address.addressType]?.label || 'Address');

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <Header
        title={form ? (form.initial ? 'Edit Address' : 'Add Address') : 'Manage Business Address'}
        showBack={true}
        onBack={handleBack}
      />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {form ? (
          <AddressForm
            key={form.initial?._id || 'new'}
            initial={form.initial}
            isFirst={addresses.length === 0}
            onCancel={() => setForm(null)}
            onSaved={(list) => {
              applyList(list);
              setForm(null);
            }}
          />
        ) : (
          <>
            <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-100/80 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                  <FiMapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-0.5">Your Service Locations</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Save every place you work from. Your <span className="font-semibold">base location</span> is the one job alerts and travel distance are calculated from.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200/90 animate-pulse" />)}
              </div>
            ) : addresses.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-dashed border-slate-300 text-center">
                <FiMapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No address saved yet</p>
                <p className="text-xs text-slate-500 mt-0.5">Add your first address to start receiving nearby jobs.</p>
              </div>
            ) : (
              addresses.map((address) => {
                const { Icon } = TYPE_META[address.addressType] || TYPE_META.office;
                const busy = busyId === address._id;
                return (
                  <div
                    key={address._id}
                    className={`bg-white rounded-2xl p-4 shadow-xs border ${address.isActive ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200/90'} ${busy ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${address.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-800">{labelOf(address)}</span>
                          {address.isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase flex items-center gap-1">
                              <FiCheck className="w-3 h-3" /> Base location
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-slate-600 leading-snug mt-1">
                          {[address.addressLine1, address.fullAddress].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
                      {address.isActive ? (
                        <span className="text-[11px] text-slate-400">Jobs are matched near here</span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleSetBase(address)}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        >
                          Make base location
                        </button>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setForm({ initial: address })}
                          className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy || address.isActive}
                          onClick={() => handleDelete(address)}
                          className={`p-2 rounded-lg border border-slate-200 transition-colors ${address.isActive ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'}`}
                          title={address.isActive ? 'Make another address your base before deleting this one' : 'Delete'}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {addresses.length < MAX_ADDRESSES ? (
              <button
                type="button"
                onClick={() => setForm({ initial: null })}
                className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md text-sm"
                style={{ background: '#0F7457', boxShadow: '0 4px 12px rgba(15, 116, 87, 0.25)' }}
              >
                <FiPlus className="w-4 h-4" />
                Add New Address
              </button>
            ) : (
              <p className="text-center text-xs text-slate-500">You can save up to {MAX_ADDRESSES} addresses.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AddressManagement;
