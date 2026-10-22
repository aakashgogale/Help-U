import React, { useEffect, useMemo, useState } from "react";
import { FiGrid, FiPlus, FiEdit2, FiTrash2, FiSave, FiChevronUp, FiChevronDown, FiMove, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import CardShell from "../components/CardShell";
import Modal from "../components/Modal";
import ModeSelector from "../components/ModeSelector";
import { ensureIds, saveCatalog, slugify, toAssetUrl } from "../utils";

import { categoryService, serviceService, publicCatalogService } from "../../../../../services/catalogService";
import IconUploadWithPreview from "../../../components/IconUploadWithPreview";
import { z } from "zod";

// Define Zod schema
const categorySchema = z.object({
  title: z.string().min(2, "Category title must be at least 2 characters"),
  slug: z.string().optional(),
  parentId: z.string().optional().nullable(),
  homeIconUrl: z.string().optional(),
  homeBadge: z.string().optional(),
  hasSaleBadge: z.boolean(),
  showOnHome: z.boolean(),
  isEmergencyAvailable: z.boolean(),
  etaDefaultMinutes: z.union([z.number(), z.string()]).optional().nullable(),
  displayRating: z.string().optional(),
  bookingsLabel: z.string().optional(),
  heroTag: z.string().optional(),
  heroTitle: z.string().optional(),
  heroStartingPrice: z.string().optional(),
  heroImageUrl: z.string().optional(),
});

const CategoriesPage = ({ catalog, setCatalog, selectedCity }) => {
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [parentFilter, setParentFilter] = useState("all"); // "all", "root", "subs", or parentId

  const [form, setForm] = useState({
    title: "",
    slug: "",
    parentId: "",
    homeIconUrl: "",
    homeBadge: "",
    hasSaleBadge: false,
    showOnHome: true,
    isEmergencyAvailable: false,
    etaDefaultMinutes: "",
    displayRating: "",
    bookingsLabel: "",
    heroTag: "",
    heroTitle: "",
    heroStartingPrice: "",
    heroImageUrl: "",
  });
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  const categories = (catalog.categories || []).sort((a, b) => (a.homeOrder || 0) - (b.homeOrder || 0));
  const editing = useMemo(() => categories.find((c) => c.id === editingId) || null, [categories, editingId]);

  const rootCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  const getParentTitle = (parentId) => {
    if (!parentId) return null;
    const parent = categories.find((c) => c.id === parentId || c._id === parentId);
    return parent ? parent.title : null;
  };

  const displayedCategories = useMemo(() => {
    if (parentFilter === "all") return categories;
    if (parentFilter === "root") return categories.filter((c) => !c.parentId);
    if (parentFilter === "subs") return categories.filter((c) => !!c.parentId);
    return categories.filter((c) => c.parentId === parentFilter);
  }, [categories, parentFilter]);

  const fetchCategories = async () => {
    try {
      setFetching(true);
      // Query all categories (both root and subcategories)
      const params = { status: 'active', parentId: 'all' };
      if (selectedCity) {
        params.cityId = selectedCity;
      }

      const response = await categoryService.getAll(params);

      if (response.success && response.categories) {
        // Map backend format to frontend format
        const mappedCategories = response.categories.map(cat => ({
          id: cat.id,
          title: cat.title,
          slug: cat.slug,
          parentId: cat.parentId ? (typeof cat.parentId === 'object' ? (cat.parentId._id || cat.parentId.id) : String(cat.parentId)) : null,
          homeIconUrl: cat.homeIconUrl || "",
          homeBadge: cat.homeBadge || "",
          hasSaleBadge: cat.hasSaleBadge || false,
          showOnHome: cat.showOnHome !== false,
          isEmergencyAvailable: cat.isEmergencyAvailable || false,
          etaDefaultMinutes: cat.etaDefaultMinutes ?? null,
          displayRating: cat.displayRating || "",
          bookingsLabel: cat.bookingsLabel || "",
          heroBanner: cat.heroBanner || { tag: '', title: '', startingPrice: '', imageUrl: '' },
          homeOrder: cat.homeOrder || 0,
        }));

        // Update catalog with fetched categories
        const next = { ...catalog, categories: mappedCategories };
        setCatalog(next);
        saveCatalog(next);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories. Using cached data.');
    } finally {
      setFetching(false);
    }
  };

  // Fetch categories from API on mount or city change
  useEffect(() => {
    fetchCategories();
  }, [selectedCity]);

  // Listen for cross-component category creation events (e.g. from ServiceWizard)
  useEffect(() => {
    const handleCategoryCreated = (e) => {
      const newCat = e?.detail;
      if (newCat) {
        const mapped = {
          id: newCat.id || newCat._id,
          title: newCat.title,
          slug: newCat.slug,
          parentId: newCat.parentId ? (typeof newCat.parentId === 'object' ? (newCat.parentId._id || newCat.parentId.id) : String(newCat.parentId)) : null,
          homeIconUrl: newCat.homeIconUrl || "",
          homeBadge: newCat.homeBadge || "",
          hasSaleBadge: newCat.hasSaleBadge || false,
          showOnHome: newCat.showOnHome !== false,
          isEmergencyAvailable: newCat.isEmergencyAvailable || false,
          etaDefaultMinutes: newCat.etaDefaultMinutes ?? null,
          displayRating: newCat.displayRating || "",
          bookingsLabel: newCat.bookingsLabel || "",
          heroBanner: newCat.heroBanner || { tag: '', title: '', startingPrice: '', imageUrl: '' },
          homeOrder: newCat.homeOrder || 0,
        };
        setCatalog((prev) => {
          const exists = (prev.categories || []).some((c) => c.id === mapped.id);
          if (exists) return prev;
          const next = { ...prev, categories: [...(prev.categories || []), mapped] };
          saveCatalog(next);
          return next;
        });
      }
      // Also do a full refetch to keep data fresh
      fetchCategories();
    };
    const handleCatalogUpdated = () => {
      fetchCategories();
    };
    window.addEventListener('categoryCreated', handleCategoryCreated);
    window.addEventListener('adminUserAppCatalogUpdated', handleCatalogUpdated);
    return () => {
      window.removeEventListener('categoryCreated', handleCategoryCreated);
      window.removeEventListener('adminUserAppCatalogUpdated', handleCatalogUpdated);
    };
  }, [selectedCity]);

  useEffect(() => {
    if (!editing) {
      setForm({
        title: "",
        slug: "",
        parentId: "",
        homeIconUrl: "",
        homeBadge: "",
        hasSaleBadge: false,
        showOnHome: true,
        isEmergencyAvailable: false,
        etaDefaultMinutes: "",
        displayRating: "",
        bookingsLabel: "",
        heroTag: "",
        heroTitle: "",
        heroStartingPrice: "",
        heroImageUrl: "",
      });
      return;
    }
    const safe = ensureIds({ ...catalog, categories: [editing] }).categories[0];
    setForm({
      title: safe.title || "",
      slug: safe.slug || "",
      parentId: safe.parentId || "",
      homeIconUrl: safe.homeIconUrl || "",
      homeBadge: safe.homeBadge || "",
      hasSaleBadge: Boolean(safe.hasSaleBadge),
      showOnHome: safe.showOnHome !== false,
      isEmergencyAvailable: Boolean(safe.isEmergencyAvailable),
      etaDefaultMinutes: safe.etaDefaultMinutes != null ? String(safe.etaDefaultMinutes) : "",
      displayRating: safe.displayRating || "",
      bookingsLabel: safe.bookingsLabel || "",
      heroTag: safe.heroBanner?.tag || "",
      heroTitle: safe.heroBanner?.title || "",
      heroStartingPrice: safe.heroBanner?.startingPrice || "",
      heroImageUrl: safe.heroBanner?.imageUrl || "",
    });
  }, [editing]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const reset = () => {
    setEditingId(null);
    setForm({
      title: "",
      slug: "",
      parentId: "",
      homeIconUrl: "",
      homeBadge: "",
      hasSaleBadge: false,
      showOnHome: true,
      isEmergencyAvailable: false,
      etaDefaultMinutes: "",
      displayRating: "",
      bookingsLabel: "",
      heroTag: "",
      heroTitle: "",
      heroStartingPrice: "",
      heroImageUrl: "",
    });
    setIsModalOpen(false);
  };



  const upsert = async () => {
    // Validate form with Zod
    const validationResult = categorySchema.safeParse({
      title: form.title.trim(),
      slug: form.slug ? slugify(form.slug.trim()) : slugify(form.title.trim()),
      parentId: form.parentId ? form.parentId.trim() : null,
      homeIconUrl: form.homeIconUrl.trim(),
      homeBadge: form.homeBadge.trim(),
      hasSaleBadge: Boolean(form.hasSaleBadge),
      showOnHome: Boolean(form.showOnHome),
      isEmergencyAvailable: Boolean(form.isEmergencyAvailable),
      etaDefaultMinutes: form.etaDefaultMinutes,
      displayRating: form.displayRating.trim(),
      bookingsLabel: form.bookingsLabel.trim(),
      heroTag: form.heroTag.trim(),
      heroTitle: form.heroTitle.trim(),
      heroStartingPrice: form.heroStartingPrice.trim(),
      heroImageUrl: form.heroImageUrl.trim()
    });

    if (!validationResult.success) {
      // Show first error in toast
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const { title, slug, parentId, homeIconUrl, homeBadge, hasSaleBadge, showOnHome, isEmergencyAvailable } = validationResult.data;

    try {
      setLoading(true);

      // Determine homeOrder for new categories
      let homeOrder = 0;
      if (editingId && editingId.startsWith('ucat-')) {
        const maxOrder = Math.max(...categories.map(c => c.homeOrder || 0), 0);
        homeOrder = maxOrder + 1;
      } else if (editingId) {
        const existingCategory = categories.find(c => c.id === editingId);
        homeOrder = existingCategory?.homeOrder || 0;
      } else {
        const maxOrder = Math.max(...categories.map(c => c.homeOrder || 0), 0);
        homeOrder = maxOrder + 1;
      }

      const parsedEta = form.etaDefaultMinutes !== "" && !isNaN(Number(form.etaDefaultMinutes))
        ? Number(form.etaDefaultMinutes)
        : null;

      const categoryData = {
        title,
        slug,
        parentId: parentId || null,
        homeIconUrl: homeIconUrl || null,
        homeBadge: homeBadge || null,
        hasSaleBadge,
        showOnHome,
        isEmergencyAvailable,
        homeOrder,
        cityIds: selectedCity ? [selectedCity] : [],
        etaDefaultMinutes: parsedEta,
        displayRating: form.displayRating.trim(),
        bookingsLabel: form.bookingsLabel.trim(),
        heroBanner: {
          tag: form.heroTag.trim(),
          title: form.heroTitle.trim(),
          startingPrice: form.heroStartingPrice.trim(),
          imageUrl: form.heroImageUrl.trim()
        }
      };

      if (editingId && !editingId.startsWith('ucat-')) {
        if (selectedCity) {
          categoryData.cityIds = [selectedCity];
        }
      }

      let savedCategory;
      if (editingId && editingId.startsWith('ucat-')) {
        const response = await categoryService.create(categoryData);
        if (response.success) {
          savedCategory = {
            id: response.category.id,
            title: response.category.title,
            slug: response.category.slug,
            parentId: response.category.parentId ? (typeof response.category.parentId === 'object' ? (response.category.parentId._id || response.category.parentId.id) : String(response.category.parentId)) : (parentId || null),
            homeIconUrl: response.category.homeIconUrl || "",
            homeBadge: response.category.homeBadge || "",
            hasSaleBadge: response.category.hasSaleBadge || false,
            showOnHome: response.category.showOnHome !== false,
            homeOrder: response.category.homeOrder || 0,
            etaDefaultMinutes: response.category.etaDefaultMinutes ?? null,
            displayRating: response.category.displayRating || "",
            bookingsLabel: response.category.bookingsLabel || "",
            heroBanner: response.category.heroBanner || null
          };
        } else {
          throw new Error(response.message || 'Failed to create category');
        }
      } else if (editingId) {
        const response = await categoryService.update(editingId, categoryData);
        if (response.success) {
          savedCategory = {
            id: response.category.id,
            title: response.category.title,
            slug: response.category.slug,
            parentId: response.category.parentId ? (typeof response.category.parentId === 'object' ? (response.category.parentId._id || response.category.parentId.id) : String(response.category.parentId)) : (parentId || null),
            homeIconUrl: response.category.homeIconUrl || "",
            homeBadge: response.category.homeBadge || "",
            hasSaleBadge: response.category.hasSaleBadge || false,
            showOnHome: response.category.showOnHome !== false,
            homeOrder: response.category.homeOrder || 0,
            etaDefaultMinutes: response.category.etaDefaultMinutes ?? null,
            displayRating: response.category.displayRating || "",
            bookingsLabel: response.category.bookingsLabel || "",
            heroBanner: response.category.heroBanner || null
          };
        } else {
          throw new Error(response.message || 'Failed to update category');
        }
      } else {
        const response = await categoryService.create(categoryData);
        if (response.success) {
          savedCategory = {
            id: response.category.id,
            title: response.category.title,
            slug: response.category.slug,
            parentId: response.category.parentId ? (typeof response.category.parentId === 'object' ? (response.category.parentId._id || response.category.parentId.id) : String(response.category.parentId)) : (parentId || null),
            homeIconUrl: response.category.homeIconUrl || "",
            homeBadge: response.category.homeBadge || "",
            hasSaleBadge: response.category.hasSaleBadge || false,
            showOnHome: response.category.showOnHome !== false,
            homeOrder: response.category.homeOrder || 0,
            etaDefaultMinutes: response.category.etaDefaultMinutes ?? null,
            displayRating: response.category.displayRating || "",
            bookingsLabel: response.category.bookingsLabel || "",
            heroBanner: response.category.heroBanner || null
          };
        } else {
          throw new Error(response.message || 'Failed to create category');
        }
      }

      // Update local state
      const next = ensureIds(catalog);
      const exists = next.categories.find((c) => c.id === editingId || c.id === savedCategory.id);

      if (exists && editingId) {
        // Update existing
        next.categories = next.categories.map((c) =>
          (c.id === editingId || c.id === savedCategory.id) ? savedCategory : c
        );
      } else {
        // Add new
        next.categories = [...next.categories, savedCategory];
      }

      setCatalog(next);
      saveCatalog(next);
      publicCatalogService.invalidateCache();
      toast.success(editingId ? "Category updated successfully" : "Category created successfully");
      reset();
      fetchCategories();
    } catch (error) {
      console.error('Upsert category error:', error);
      toast.error(error.message || 'Failed to save category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this category?")) return;

    // If it's a local ID (starts with ucat-), just remove from local state
    if (id.startsWith('ucat-')) {
      const next = { ...catalog, categories: categories.filter((c) => c.id !== id) };
      setCatalog(next);
      saveCatalog(next);
      if (editingId === id) reset();
      return;
    }

    try {
      setLoading(true);
      const response = await categoryService.delete(id);

      if (response.success) {
        // Remove from local state
        const next = { ...catalog, categories: categories.filter((c) => c.id !== id) };
        setCatalog(next);
        saveCatalog(next);
        if (editingId === id) reset();
        toast.success("Category deleted successfully");
      } else {
        throw new Error(response.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Delete category error:', error);
      toast.error(error.message || 'Failed to delete category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const moveCategoryUp = async (categoryId, currentIndex) => {
    if (currentIndex === 0) return; // Already at top

    try {
      setLoading(true);
      const category = categories[currentIndex];
      const previousCategory = categories[currentIndex - 1];

      // Swap orders
      await categoryService.updateOrder(category.id, currentIndex - 1);
      await categoryService.updateOrder(previousCategory.id, currentIndex);

      // Update local state
      const updatedCategories = [...categories];
      [updatedCategories[currentIndex], updatedCategories[currentIndex - 1]] =
        [updatedCategories[currentIndex - 1], updatedCategories[currentIndex]];

      setCatalog(prev => ({ ...prev, categories: updatedCategories }));
      saveCatalog({ ...catalog, categories: updatedCategories });

      toast.success("Category moved up successfully");
    } catch (error) {
      console.error('Move category up error:', error);
      toast.error('Failed to reorder category');
    } finally {
      setLoading(false);
    }
  };

  const moveCategoryDown = async (categoryId, currentIndex) => {
    if (currentIndex === categories.length - 1) return; // Already at bottom

    try {
      setLoading(true);
      const category = categories[currentIndex];
      const nextCategory = categories[currentIndex + 1];

      // Swap orders
      await categoryService.updateOrder(category.id, currentIndex + 1);
      await categoryService.updateOrder(nextCategory.id, currentIndex);

      // Update local state
      const updatedCategories = [...categories];
      [updatedCategories[currentIndex], updatedCategories[currentIndex + 1]] =
        [updatedCategories[currentIndex + 1], updatedCategories[currentIndex]];

      setCatalog(prev => ({ ...prev, categories: updatedCategories }));
      saveCatalog({ ...catalog, categories: updatedCategories });

      toast.success("Category moved down successfully");
    } catch (error) {
      console.error('Move category down error:', error);
      toast.error('Failed to reorder category');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop functions for bulk reordering
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const draggedIndex = draggedItem;

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedItem(null);
      return;
    }

    const newCategories = [...categories];
    const [draggedCategory] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(dropIndex, 0, draggedCategory);

    // Update orders for all categories
    const bulkUpdates = newCategories.map((cat, index) =>
      categoryService.updateOrder(cat.id, index)
    );

    Promise.all(bulkUpdates)
      .then(() => {
        setCatalog(prev => ({ ...prev, categories: newCategories }));
        saveCatalog({ ...catalog, categories: newCategories });
        toast.success("Categories reordered successfully");
      })
      .catch((error) => {
        console.error('Bulk reorder error:', error);
        toast.error('Failed to reorder categories');
      })
      .finally(() => {
        setDraggedItem(null);
      });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  return (
    <div className="space-y-6">
      {/* App Mode selector removed as per request */}

      <CardShell icon={FiGrid}>
        {fetching && (
          <div className="text-center py-4 text-gray-500">Loading categories...</div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-gray-700">
            {categories.length} total categories
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReorderModal(true)}
              disabled={categories.length < 2}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              <FiMove className="w-4 h-4" />
              <span>Reorder</span>
            </button>
            <button
              onClick={() => {
                reset();
                setIsModalOpen(true);
              }}
              className="px-4 py-2 text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-md hover:shadow-lg relative z-10 text-xs sm:text-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#2874F0',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1e5fd4'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2874F0'}
            >
              <FiPlus className="w-4 h-4" style={{ display: 'block', color: '#ffffff' }} />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Hierarchy Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Hierarchy:</span>
          <button
            type="button"
            onClick={() => setParentFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${parentFilter === 'all' ? 'bg-[#2874F0] text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setParentFilter('root')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${parentFilter === 'root' ? 'bg-[#2874F0] text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Top-Level Primary ({rootCategories.length})
          </button>
          <button
            type="button"
            onClick={() => setParentFilter('subs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${parentFilter === 'subs' ? 'bg-[#2874F0] text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Subcategories ({categories.filter(c => c.parentId).length})
          </button>
          {rootCategories.length > 0 && (
            <select
              value={!['all', 'root', 'subs'].includes(parentFilter) ? parentFilter : ''}
              onChange={(e) => setParentFilter(e.target.value ? e.target.value : 'all')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#2874F0]"
            >
              <option value="">Filter by Parent Category...</option>
              {rootCategories.map((r) => (
                <option key={r.id} value={r.id}>
                  Under: {r.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {displayedCategories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No categories found for this filter</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 w-12">#</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 w-20">Icon</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Name & Hierarchy</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Slug</th>
                  <th className="text-center py-3 px-3 text-sm font-bold text-gray-700">ETA</th>
                  <th className="text-center py-3 px-3 text-sm font-bold text-gray-700">Rating</th>
                  <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Badge</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-gray-700 w-20">
                    Order
                    <button
                      onClick={() => setShowReorderModal(true)}
                      className="ml-2 text-purple-600 hover:text-purple-800 text-xs"
                      title="Bulk reorder"
                    >
                      <FiMove className="w-3 h-3 inline" />
                    </button>
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-gray-700 w-28">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-gray-700 w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedCategories.map((c, idx) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 text-sm font-semibold text-gray-600">{idx + 1}</td>
                    <td className="py-4 px-4">
                      {c.homeIconUrl || c.icon || c.iconUrl || c.imageUrl ? (
                        <div className="w-10 h-10 rounded-xl border border-gray-200/80 bg-slate-50 overflow-hidden flex items-center justify-center p-1 shrink-0 shadow-2xs">
                          <img src={toAssetUrl(c.homeIconUrl || c.icon || c.iconUrl || c.imageUrl)} alt={c.title} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                          <span className="text-xs text-gray-400 font-bold">{c.title?.charAt(0) || "—"}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900">{c.title || "Untitled"}</div>
                      {c.parentId ? (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Sub of: {getParentTitle(c.parentId) || "Primary"}
                        </span>
                      ) : (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600">
                          Primary Root
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600 font-mono text-xs">{c.slug || "—"}</div>
                    </td>
                    <td className="py-4 px-3 text-center">
                      {c.etaDefaultMinutes ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          {c.etaDefaultMinutes} mins
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-center">
                      {c.displayRating ? (
                        <span className="text-xs font-bold text-amber-600">★ {c.displayRating}</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                      {c.bookingsLabel && (
                        <div className="text-[11px] text-gray-500 whitespace-nowrap">{c.bookingsLabel}</div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {c.homeBadge ? (
                        <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded">{c.homeBadge}</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => moveCategoryUp(c.id, categories.findIndex(cat => cat.id === c.id))}
                          disabled={categories.findIndex(cat => cat.id === c.id) === 0 || loading}
                          className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move Up"
                        >
                          <FiChevronUp className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-semibold text-gray-600 mx-1">{categories.findIndex(cat => cat.id === c.id) + 1}</span>
                        <button
                          onClick={() => moveCategoryDown(c.id, categories.findIndex(cat => cat.id === c.id))}
                          disabled={categories.findIndex(cat => cat.id === c.id) === categories.length - 1 || loading}
                          className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move Down"
                        >
                          <FiChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-3 py-1 text-xs font-bold rounded ${c.showOnHome !== false ? "bg-green-500 text-white" : "bg-gray-300 text-gray-700"}`}>
                        {c.showOnHome !== false ? "VISIBLE" : "HIDDEN"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setIsModalOpen(true);
                          }}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardShell>

      <Modal
        isOpen={isModalOpen}
        onClose={reset}
        title={editing ? "Edit Category" : "Add Category"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-base font-bold text-gray-900 mb-2">Title</label>
            <input
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((p) => {
                  let newSlug = slugify(title);
                  if (p.parentId) {
                    const pObj = rootCategories.find(r => r.id === p.parentId);
                    if (pObj) newSlug = `${pObj.slug}-${slugify(title)}`;
                  }
                  return { ...p, title, slug: newSlug };
                });
              }}
              placeholder="e.g. Electricity, Spa for Women"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                placeholder="e.g. womens-salon-spa"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Parent Category</label>
              <select
                value={form.parentId}
                onChange={(e) => {
                  const pId = e.target.value;
                  const parentObj = rootCategories.find(r => r.id === pId);
                  setForm((p) => {
                    let newSlug = p.slug;
                    if (parentObj && !newSlug.startsWith(parentObj.slug + '-')) {
                      newSlug = `${parentObj.slug}-${slugify(p.title || '')}`;
                    }
                    return { ...p, parentId: pId, slug: newSlug };
                  });
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">-- None (Top-Level Primary Category) --</option>
                {rootCategories
                  .filter((c) => c.id !== editingId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Select parent if this is a subcategory.</p>
            </div>
          </div>
          <IconUploadWithPreview
            value={form.homeIconUrl}
            onChange={(url) => setForm((p) => ({ ...p, homeIconUrl: url }))}
            folder="categories"
            label="Home Icon (1:1 Squircle)"
            helperText="Upload transparent PNG/SVG icon. Use checkerboard/dark toggle to verify alpha transparency."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-base font-bold text-gray-900 mb-2">Home Badge (optional)</label>
              <input
                value={form.homeBadge}
                onChange={(e) => setForm((p) => ({ ...p, homeBadge: e.target.value }))}
                placeholder="NEW / SALE / etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-3 pt-8">
              <input
                id="hasSaleBadge"
                type="checkbox"
                checked={form.hasSaleBadge}
                onChange={(e) => setForm((p) => ({ ...p, hasSaleBadge: e.target.checked }))}
                className="h-4 w-4"
              />
              <label htmlFor="hasSaleBadge" className="text-base font-semibold text-gray-800">
                Show sale badge on home card
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Default Arrival ETA (Minutes)
              </label>
              <input
                type="number"
                min="0"
                value={form.etaDefaultMinutes}
                onChange={(e) => setForm((p) => ({ ...p, etaDefaultMinutes: e.target.value }))}
                placeholder="e.g. 55"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Shown in green pill badge on Home tile (e.g. 55 mins)</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Display Rating (Optional)
              </label>
              <input
                value={form.displayRating}
                onChange={(e) => setForm((p) => ({ ...p, displayRating: e.target.value }))}
                placeholder="e.g. 4.88"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Shown at top of Service Catalog Modal</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">
              Bookings Count Label (Optional)
            </label>
            <input
              value={form.bookingsLabel}
              onChange={(e) => setForm((p) => ({ ...p, bookingsLabel: e.target.value }))}
              placeholder="e.g. 1.8 M bookings"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Catalog Modal Hero Banner (Optional) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Service Catalog Modal Hero Banner (Optional)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Promo Tag</label>
                <input
                  value={form.heroTag}
                  onChange={(e) => setForm((p) => ({ ...p, heroTag: e.target.value }))}
                  placeholder="e.g. Hospital Grade"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Hero Title</label>
                <input
                  value={form.heroTitle}
                  onChange={(e) => setForm((p) => ({ ...p, heroTitle: e.target.value }))}
                  placeholder="e.g. Deep Home Disinfection"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Starting Price (₹)</label>
                <input
                  value={form.heroStartingPrice}
                  onChange={(e) => setForm((p) => ({ ...p, heroStartingPrice: e.target.value }))}
                  placeholder="e.g. 499"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Hero Image URL</label>
                <input
                  value={form.heroImageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, heroImageUrl: e.target.value }))}
                  placeholder="e.g. /cleaning-essentials/intense-bathroom.jpg"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              id="showOnHome"
              type="checkbox"
              checked={form.showOnHome}
              onChange={(e) => setForm((p) => ({ ...p, showOnHome: e.target.checked }))}
              className="h-4 w-4"
            />
            <label htmlFor="showOnHome" className="text-base font-semibold text-gray-800">
              Show this category on home
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              id="isEmergencyAvailable"
              type="checkbox"
              checked={form.isEmergencyAvailable}
              onChange={(e) => setForm((p) => ({ ...p, isEmergencyAvailable: e.target.checked }))}
              className="h-4 w-4"
            />
            <label htmlFor="isEmergencyAvailable" className="text-base font-semibold text-gray-800">
              Offer emergency booking for this category
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={upsert}
              disabled={loading}
              className="flex-1 py-3.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-5 h-5" />
              {loading ? "Saving..." : (editing ? "Update Category" : "Add Category")}
            </button>
            <button
              onClick={reset}
              className="px-6 py-3.5 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-all border border-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Reorder Categories Modal */}
      <Modal
        isOpen={showReorderModal}
        onClose={() => setShowReorderModal(false)}
        title="Reorder Categories"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Drag and drop categories to reorder them. The new order will be saved automatically.
          </p>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {categories.map((category, index) => (
              <div
                key={category.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-3 p-3 border rounded-lg cursor-move transition-all
                  ${draggedItem === index ? 'opacity-50 bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-blue-300'}
                  ${draggedItem !== null && draggedItem !== index ? 'hover:bg-gray-50' : ''}
                `}
              >
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-semibold text-gray-600">
                  {index + 1}
                </div>

                {category.homeIconUrl ? (
                  <img
                    src={toAssetUrl(category.homeIconUrl)}
                    alt={category.title}
                    className="w-8 h-8 object-contain rounded"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-500">?</span>
                  </div>
                )}

                <div className="flex-1">
                  <div className="font-medium text-gray-900">{category.title}</div>
                  <div className="text-sm text-gray-500">{category.slug}</div>
                </div>

                <FiMove className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setShowReorderModal(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CategoriesPage;

