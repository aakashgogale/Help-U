import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiTrash2, FiPlus, FiMinus, FiShoppingBag, FiArrowRight, FiTag } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useCart } from '../../../../context/CartContext';
import { useZone } from '../../../../context/ZoneContext';
import PageHeader from '../../components/layout/PageHeader';
import { getCategoryIllustration } from '../../utils/categoryIcons';

const formatINR = (value) => `₹${Math.round(value || 0).toLocaleString('en-IN')}`;

// Hourly and inspection items are priced per visit, so their count is not user-editable
const hasQuantity = (item) => item.pricingType !== 'hourly' && item.pricingType !== 'inspection_fee';

const CartItemRow = ({ item, busy, onQuantityChange, onDelete }) => {
  const id = item._id || item.id;
  const count = item.serviceCount || 1;

  return (
    <div className="py-3.5 first:pt-0 last:pb-0 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink leading-snug">{item.title}</p>
          {item.variantSnapshot?.title && (
            <span className="inline-block mt-1 mr-1.5 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200/60 rounded-full px-2 py-0.5">
              {item.variantSnapshot.title}
            </span>
          )}
          {(item.pricingType === 'hourly' && item.hours) && (
            <span className="inline-block mt-1 mr-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
              {item.hours} hr{item.hours === 1 ? '' : 's'}
            </span>
          )}
          {item.pricingType === 'inspection_fee' && (
            <span className="inline-block mt-1 mr-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
              Inspection visit
            </span>
          )}
          {item.description && (
            <p className="mt-1 text-[12px] text-gray-500 line-clamp-2">{item.description}</p>
          )}
        </div>
        <p className="text-[14px] font-bold text-ink shrink-0">{formatINR(item.price)}</p>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        {hasQuantity(item) ? (
          <div className="inline-flex items-center h-8 rounded-lg border border-gray-200 bg-white">
            <button
              type="button"
              aria-label={`Decrease ${item.title}`}
              disabled={busy || count <= 1}
              onClick={() => onQuantityChange(id, -1)}
              className="w-8 h-full flex items-center justify-center text-accent disabled:text-gray-300 transition-colors"
            >
              <FiMinus className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
            <span className="min-w-6 text-center text-[13px] font-bold text-ink">{count}</span>
            <button
              type="button"
              aria-label={`Increase ${item.title}`}
              disabled={busy}
              onClick={() => onQuantityChange(id, 1)}
              className="w-8 h-full flex items-center justify-center text-accent disabled:text-gray-300 transition-colors"
            >
              <FiPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <span className="text-[12px] text-gray-500">Qty {count}</span>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(id)}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-500 hover:text-red-600 disabled:opacity-50 transition-colors"
        >
          <FiTrash2 className="w-3.5 h-3.5" />
          Remove
        </button>
      </div>
    </div>
  );
};

const CartSkeleton = () => (
  <div className="bg-white rounded-[20px] border border-gray-100 p-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-gray-100 rounded" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
      </div>
    </div>
    <div className="mt-4 space-y-3">
      <div className="h-10 bg-gray-50 rounded-lg" />
      <div className="h-10 bg-gray-50 rounded-lg" />
    </div>
    <div className="mt-4 flex gap-2">
      <div className="flex-1 h-11 bg-gray-100 rounded-full" />
      <div className="flex-1 h-11 bg-gray-100 rounded-full" />
    </div>
  </div>
);

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, isLoading: loading, removeItem, removeCategoryItems, updateItem } = useCart();
  const { currentZone, isOutOfZone } = useZone();
  const [busyIds, setBusyIds] = useState(() => new Set());

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      const category = item.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  }, [cartItems]);

  const setBusy = (id, isBusy) => setBusyIds(prev => {
    const next = new Set(prev);
    if (isBusy) next.add(id); else next.delete(id);
    return next;
  });

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Remove all ${category} services from your cart?`)) return;
    try {
      const response = await removeCategoryItems(category);
      if (response.success) {
        toast.success('Category items removed');
      } else {
        toast.error(response.message || 'Failed to remove category items');
      }
    } catch {
      toast.error('Failed to remove category items');
    }
  };

  const handleDelete = async (itemId) => {
    setBusy(itemId, true);
    try {
      const response = await removeItem(itemId);
      if (response.success) {
        toast.success('Item removed from cart');
      } else {
        toast.error(response.message || 'Failed to remove item');
      }
    } catch {
      toast.error('Failed to remove item');
    } finally {
      setBusy(itemId, false);
    }
  };

  const handleQuantityChange = async (itemId, change) => {
    const item = cartItems.find(i => (i._id || i.id) === itemId);
    if (!item) return;
    const newCount = Math.max(1, (item.serviceCount || 1) + change);
    if (newCount === (item.serviceCount || 1)) return;

    setBusy(itemId, true);
    try {
      const response = await updateItem(itemId, newCount);
      if (!response.success) {
        toast.error(response.message || 'Failed to update quantity');
      }
    } catch {
      toast.error('Failed to update quantity');
    } finally {
      setBusy(itemId, false);
    }
  };

  const handleAddServices = (category) => {
    const categoryId = groupedItems[category]?.[0]?.categoryId;
    navigate(`/user/category/${categoryId || encodeURIComponent(category)}`);
  };

  const handleCategoryCheckout = (category) => {
    if (isOutOfZone) {
      toast.error('Services are not available in your area yet.');
      return;
    }
    if (currentZone && Array.isArray(currentZone.allowedCategories) && currentZone.allowedCategories.length > 0) {
      const items = groupedItems[category] || [];
      const categoryId = items[0]?.categoryId;
      if (categoryId) {
        const allowed = currentZone.allowedCategories.some(
          c => String(c._id || c.id || c) === String(categoryId)
        );
        if (!allowed) {
          toast.error(`${category} is not available in ${currentZone.name || 'your zone'}. Please select a different service.`);
          return;
        }
      }
    }
    navigate('/user/checkout', { state: { category } });
  };

  return (
    <div className="min-h-screen pb-28 bg-canvas">
      <PageHeader title="Your Cart" badge={cartItems.length > 0 ? cartItems.length : null} />

      <main className="px-4 py-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <CartSkeleton key={i} />)}
          </div>
        ) : cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-20 h-20 rounded-full bg-accent-soft flex items-center justify-center mb-5">
              <FiShoppingCart className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-ink text-[18px] font-bold mb-1.5">Your cart is empty</h3>
            <p className="text-gray-500 text-[14px] max-w-xs leading-relaxed">
              Add services from any category and book them together.
            </p>
            <button
              type="button"
              onClick={() => navigate('/user')}
              className="mt-6 h-11 px-6 rounded-full bg-accent text-white text-[14px] font-semibold hover:bg-accent-dark active:scale-95 transition-all"
            >
              Explore services
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedItems).map(([category, items]) => {
              const categoryTotal = items.reduce((sum, item) => sum + (item.price || 0), 0);
              const categoryOriginal = items.reduce((sum, item) => {
                const unitOriginal = item.originalPrice || item.unitPrice || ((item.price || 0) / (item.serviceCount || 1));
                return sum + unitOriginal * (item.serviceCount || 1);
              }, 0);
              const savings = Math.max(0, categoryOriginal - categoryTotal);
              const serviceCount = items.reduce((sum, item) => sum + (item.serviceCount || 1), 0);
              const illustration = getCategoryIllustration(category);

              return (
                <section key={category} className="bg-white rounded-[20px] border border-gray-100 p-4">
                  {/* Category header */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
                      {illustration ? (
                        <img src={illustration} alt="" className="w-[80%] h-[80%] object-contain" />
                      ) : (
                        <FiShoppingBag className="w-5 h-5 text-accent" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[16px] font-bold text-ink truncate">{category}</h2>
                      <p className="text-[13px] text-gray-500">
                        {serviceCount} {serviceCount === 1 ? 'service' : 'services'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category)}
                      aria-label={`Remove all ${category} services`}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <FiTrash2 className="w-[18px] h-[18px]" />
                    </button>
                  </div>

                  {/* Items */}
                  <div className="mt-4">
                    {items.map(item => (
                      <CartItemRow
                        key={item._id || item.id}
                        item={item}
                        busy={busyIds.has(item._id || item.id)}
                        onQuantityChange={handleQuantityChange}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>

                  {/* Total */}
                  <div className="mt-4 rounded-2xl bg-canvas px-3.5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[12px] text-gray-500">Total</p>
                      {savings >= 1 && (
                        <p className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent">
                          <FiTag className="w-3 h-3" /> You save {formatINR(savings)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {savings >= 1 && (
                        <p className="text-[12px] text-gray-400 line-through">{formatINR(categoryOriginal)}</p>
                      )}
                      <p className="text-[18px] font-bold text-ink leading-tight">{formatINR(categoryTotal)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddServices(category)}
                      className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-[14px] font-semibold text-ink hover:border-gray-300 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5"
                    >
                      <FiPlus className="w-4 h-4" /> Add more
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCategoryCheckout(category)}
                      className="flex-1 h-11 rounded-full bg-accent text-white text-[14px] font-semibold hover:bg-accent-dark active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5"
                    >
                      Book now <FiArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
