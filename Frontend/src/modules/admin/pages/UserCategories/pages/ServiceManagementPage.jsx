import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiChevronRight,
  FiChevronDown,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiFolder,
  FiTag,
  FiBox,
  FiExternalLink,
  FiAlertTriangle,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import {
  categoryService,
  brandService,
  serviceService,
} from "../../../../../services/catalogService";

/**
 * Unified Service Management
 * One page that shows the FULL catalog tree pulled from the DB:
 *   Category  ─▶  Brand(s)  ─▶  Service(s)
 *
 * All data is read via existing admin APIs. Edits for individual records
 * are delegated to the existing dedicated pages so there is one source of
 * truth per entity (no duplicate forms). This page gives admins the
 * bird's-eye view and quick-visibility / quick-delete controls across the
 * whole catalog.
 */

const StatCard = ({ icon: Icon, label, value, tint }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: tint + "22", color: tint }}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  </div>
);

const StatusPill = ({ active }) => (
  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
    {active ? "ACTIVE" : "INACTIVE"}
  </span>
);

const ServiceManagementPage = ({ selectedCity }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [services, setServices] = useState([]);
  const [expanded, setExpanded] = useState({}); // { [categoryId]: true }
  const [expandedBrand, setExpandedBrand] = useState({}); // { [brandId]: true }
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  // Fetch the whole catalog (3 collections) in parallel.
  const loadAll = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCity) params.cityId = selectedCity;
      const [catRes, brandRes, svcRes] = await Promise.all([
        categoryService.getAll(params),
        brandService.getAll(params),
        serviceService.getAll({}),
      ]);
      if (catRes?.success) setCategories(catRes.categories || []);
      if (brandRes?.success) setBrands(brandRes.brands || []);
      if (svcRes?.success) setServices(svcRes.services || []);
    } catch (err) {
      console.error("Service Management load error:", err);
      toast.error("Failed to load catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  // Group brands/services by their parent for O(1) lookup.
  const brandsByCategory = useMemo(() => {
    const map = {};
    brands.forEach((b) => {
      const parents = Array.isArray(b.categoryIds) && b.categoryIds.length > 0
        ? b.categoryIds.map((c) => (typeof c === "object" ? c.id || c._id : c))
        : (b.categoryId ? [typeof b.categoryId === "object" ? b.categoryId.id || b.categoryId._id : b.categoryId] : []);
      parents.forEach((pid) => {
        const key = String(pid);
        (map[key] = map[key] || []).push(b);
      });
    });
    return map;
  }, [brands]);

  const servicesByBrand = useMemo(() => {
    const map = {};
    services.forEach((s) => {
      const bid = typeof s.brandId === "object" ? (s.brandId?.id || s.brandId?._id) : s.brandId;
      if (!bid) return;
      const key = String(bid);
      (map[key] = map[key] || []).push(s);
    });
    return map;
  }, [services]);

  // Full-text filter (categories, brands, services). Hits are expanded
  // automatically so the matching row is visible.
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => {
      if ((c.title || "").toLowerCase().includes(q)) return true;
      const bList = brandsByCategory[String(c.id)] || [];
      if (bList.some((b) => (b.title || "").toLowerCase().includes(q))) return true;
      return bList.some((b) => (servicesByBrand[String(b.id)] || []).some((s) => (s.title || "").toLowerCase().includes(q)));
    });
  }, [categories, brandsByCategory, servicesByBrand, search]);

  // Auto-expand matching rows on search change
  useEffect(() => {
    if (!search.trim()) return;
    const q = search.trim().toLowerCase();
    const nextCat = {};
    const nextBrand = {};
    categories.forEach((c) => {
      const cHit = (c.title || "").toLowerCase().includes(q);
      const bList = brandsByCategory[String(c.id)] || [];
      bList.forEach((b) => {
        const bHit = (b.title || "").toLowerCase().includes(q);
        const sList = servicesByBrand[String(b.id)] || [];
        const sHit = sList.some((s) => (s.title || "").toLowerCase().includes(q));
        if (bHit || sHit) {
          nextCat[String(c.id)] = true;
          nextBrand[String(b.id)] = true;
        }
      });
      if (cHit) nextCat[String(c.id)] = true;
    });
    setExpanded((prev) => ({ ...prev, ...nextCat }));
    setExpandedBrand((prev) => ({ ...prev, ...nextBrand }));
  }, [search, categories, brandsByCategory, servicesByBrand]);

  // Flip category.status between 'active' and 'inactive' (soft hide).
  const toggleCategoryActive = async (cat) => {
    const next = cat.status === "active" ? "inactive" : "active";
    try {
      setBusyId(cat.id);
      const res = await categoryService.update(cat.id, { status: next });
      if (res?.success) {
        setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, status: next } : c)));
        toast.success(`Category ${next === "active" ? "activated" : "hidden"}`);
      } else {
        toast.error(res?.message || "Update failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const toggleBrandActive = async (brand) => {
    const next = brand.status === "active" ? "inactive" : "active";
    try {
      setBusyId(brand.id);
      const res = await brandService.update(brand.id, { status: next });
      if (res?.success) {
        setBrands((prev) => prev.map((b) => (b.id === brand.id ? { ...b, status: next } : b)));
        toast.success(`Brand ${next === "active" ? "activated" : "hidden"}`);
      } else {
        toast.error(res?.message || "Update failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const toggleServiceActive = async (svc) => {
    const next = svc.status === "active" ? "inactive" : "active";
    try {
      setBusyId(svc.id);
      const res = await serviceService.update(svc.id, { status: next });
      if (res?.success) {
        setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, status: next } : s)));
        toast.success(`Service ${next === "active" ? "activated" : "hidden"}`);
      } else {
        toast.error(res?.message || "Update failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const confirmAndDelete = async (kind, entity) => {
    const label = `${kind} "${entity.title}"`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    try {
      setBusyId(entity.id);
      let res;
      if (kind === "category") res = await categoryService.delete(entity.id);
      else if (kind === "brand") res = await brandService.delete(entity.id);
      else res = await serviceService.delete(entity.id);
      if (res?.success) {
        toast.success(`${label} deleted`);
        if (kind === "category") setCategories((prev) => prev.filter((c) => c.id !== entity.id));
        else if (kind === "brand") setBrands((prev) => prev.filter((b) => b.id !== entity.id));
        else setServices((prev) => prev.filter((s) => s.id !== entity.id));
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  // Totals for the header stat cards
  const totals = useMemo(() => ({
    categories: categories.length,
    activeCategories: categories.filter((c) => c.status === "active").length,
    brands: brands.length,
    services: services.length,
    orphans: brands.filter((b) => {
      const parents = Array.isArray(b.categoryIds) && b.categoryIds.length > 0
        ? b.categoryIds
        : (b.categoryId ? [b.categoryId] : []);
      return parents.length === 0;
    }).length,
  }), [categories, brands, services]);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            One dashboard for your entire catalog: categories, brands, and services pulled live from the database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            to="/admin/user-categories/categories"
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 shadow-sm"
          >
            <FiPlus className="w-4 h-4" />
            Add Category
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={FiFolder} label="Categories" value={totals.categories} tint="#2874F0" />
        <StatCard icon={FiTag} label="Brands" value={totals.brands} tint="#8E42E5" />
        <StatCard icon={FiBox} label="Services" value={totals.services} tint="#10B981" />
        <StatCard icon={FiAlertTriangle} label="Brands w/o Category" value={totals.orphans} tint="#F59E0B" />
      </div>

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories, brands, or services..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Catalog tree */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">Loading catalog...</div>
      ) : filteredCategories.length === 0 ? (
        <div className="py-20 text-center">
          <FiFolder className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <div className="text-sm text-gray-500">
            {search ? "No matches." : "No categories yet."}{" "}
            <Link to="/admin/user-categories/categories" className="text-blue-600 font-semibold hover:underline">
              Create one →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((cat) => {
            const bList = brandsByCategory[String(cat.id)] || [];
            const isOpen = !!expanded[String(cat.id)];
            const svcCountForCat = bList.reduce((n, b) => n + ((servicesByBrand[String(b.id)] || []).length), 0);
            return (
              <div key={cat.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Category row */}
                <div className="flex items-center gap-3 p-4 hover:bg-gray-50">
                  <button
                    onClick={() => setExpanded((prev) => ({ ...prev, [String(cat.id)]: !isOpen }))}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    aria-label={isOpen ? "Collapse" : "Expand"}
                  >
                    {isOpen ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
                  </button>
                  {cat.homeIconUrl ? (
                    <img src={cat.homeIconUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-gray-50" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FiFolder className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-gray-900 truncate">{cat.title}</div>
                      <StatusPill active={cat.status === "active"} />
                      {cat.hasSaleBadge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">SALE</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {bList.length} brand{bList.length === 1 ? "" : "s"} · {svcCountForCat} service{svcCountForCat === 1 ? "" : "s"}
                      {cat.slug && <span className="ml-2 text-gray-400">/{cat.slug}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleCategoryActive(cat)}
                      disabled={busyId === cat.id}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                      title={cat.status === "active" ? "Hide from user app" : "Show in user app"}
                    >
                      {cat.status === "active" ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                    </button>
                    <Link
                      to="/admin/user-categories/categories"
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                      title="Edit in Categories page"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => confirmAndDelete("category", cat)}
                      disabled={busyId === cat.id}
                      className="p-2 rounded-lg hover:bg-rose-50 text-rose-600 disabled:opacity-50"
                      title="Delete category"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Brands under this category */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/40">
                    {bList.length === 0 ? (
                      <div className="px-6 py-5 text-sm text-gray-500 flex items-center justify-between">
                        <span>No brands in this category yet.</span>
                        <Link
                          to="/admin/user-categories/brands"
                          className="text-blue-600 font-semibold text-xs flex items-center gap-1 hover:underline"
                        >
                          <FiPlus className="w-3.5 h-3.5" /> Add brand
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {bList.map((brand) => {
                          const sList = servicesByBrand[String(brand.id)] || [];
                          const brandOpen = !!expandedBrand[String(brand.id)];
                          return (
                            <div key={brand.id}>
                              {/* Brand row */}
                              <div className="flex items-center gap-3 pl-10 pr-4 py-3 hover:bg-white">
                                <button
                                  onClick={() => setExpandedBrand((prev) => ({ ...prev, [String(brand.id)]: !brandOpen }))}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                                  aria-label={brandOpen ? "Collapse" : "Expand"}
                                >
                                  {brandOpen ? <FiChevronDown className="w-3.5 h-3.5" /> : <FiChevronRight className="w-3.5 h-3.5" />}
                                </button>
                                {brand.iconUrl ? (
                                  <img src={brand.iconUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-200 bg-white" />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <FiTag className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium text-gray-900 truncate text-sm">{brand.title}</div>
                                    <StatusPill active={brand.status === "active"} />
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    {sList.length} service{sList.length === 1 ? "" : "s"}
                                    {brand.basePrice ? ` · from ₹${brand.basePrice}` : ""}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => toggleBrandActive(brand)}
                                    disabled={busyId === brand.id}
                                    className="p-1.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                                    title={brand.status === "active" ? "Hide" : "Show"}
                                  >
                                    {brand.status === "active" ? <FiEye className="w-3.5 h-3.5" /> : <FiEyeOff className="w-3.5 h-3.5" />}
                                  </button>
                                  <Link
                                    to="/admin/user-categories/brands"
                                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                                    title="Edit in Brands page"
                                  >
                                    <FiEdit2 className="w-3.5 h-3.5" />
                                  </Link>
                                  <button
                                    onClick={() => confirmAndDelete("brand", brand)}
                                    disabled={busyId === brand.id}
                                    className="p-1.5 rounded hover:bg-rose-50 text-rose-600 disabled:opacity-50"
                                    title="Delete brand"
                                  >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Services under this brand */}
                              {brandOpen && (
                                <div className="pl-20 pr-4 pb-3 bg-white">
                                  {sList.length === 0 ? (
                                    <div className="py-3 text-xs text-gray-500 flex items-center justify-between">
                                      <span>No services yet.</span>
                                      <Link
                                        to="/admin/user-categories/sections"
                                        className="text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                                      >
                                        <FiPlus className="w-3 h-3" /> Add service
                                      </Link>
                                    </div>
                                  ) : (
                                    <div className="divide-y divide-gray-100">
                                      {sList.map((svc) => (
                                        <div key={svc.id} className="flex items-center gap-3 py-2.5">
                                          {svc.iconUrl ? (
                                            <img src={svc.iconUrl} alt="" className="w-7 h-7 rounded-md object-cover border border-gray-200" />
                                          ) : (
                                            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                              <FiBox className="w-3.5 h-3.5" />
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <div className="text-sm text-gray-800 truncate">{svc.title}</div>
                                              <StatusPill active={svc.status === "active"} />
                                            </div>
                                            {(svc.basePrice || svc.price) && (
                                              <div className="text-[11px] text-gray-500 mt-0.5">
                                                ₹{svc.basePrice || svc.price}
                                                {svc.discountPrice && <span className="ml-1 line-through text-gray-400">₹{svc.discountPrice}</span>}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              onClick={() => toggleServiceActive(svc)}
                                              disabled={busyId === svc.id}
                                              className="p-1.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                                              title={svc.status === "active" ? "Hide" : "Show"}
                                            >
                                              {svc.status === "active" ? <FiEye className="w-3.5 h-3.5" /> : <FiEyeOff className="w-3.5 h-3.5" />}
                                            </button>
                                            <Link
                                              to="/admin/user-categories/sections"
                                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                                              title="Edit in Services page"
                                            >
                                              <FiEdit2 className="w-3.5 h-3.5" />
                                            </Link>
                                            <button
                                              onClick={() => confirmAndDelete("service", svc)}
                                              disabled={busyId === svc.id}
                                              className="p-1.5 rounded hover:bg-rose-50 text-rose-600 disabled:opacity-50"
                                              title="Delete service"
                                            >
                                              <FiTrash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Deep-link footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap items-center gap-4">
        <span className="font-semibold text-gray-700">Dedicated editors:</span>
        <Link to="/admin/user-categories/categories" className="text-blue-600 hover:underline flex items-center gap-1">
          Categories <FiExternalLink className="w-3 h-3" />
        </Link>
        <Link to="/admin/user-categories/brands" className="text-blue-600 hover:underline flex items-center gap-1">
          Brands <FiExternalLink className="w-3 h-3" />
        </Link>
        <Link to="/admin/user-categories/sections" className="text-blue-600 hover:underline flex items-center gap-1">
          Services <FiExternalLink className="w-3 h-3" />
        </Link>
        <Link to="/admin/user-categories/home" className="text-blue-600 hover:underline flex items-center gap-1">
          Homepage sections <FiExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};

export default ServiceManagementPage;
