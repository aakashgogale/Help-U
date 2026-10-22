import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  DrawingManager,
} from "@react-google-maps/api";
import {
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiMap,
  FiX,
  FiSave,
  FiFilter,
  FiRefreshCw,
  FiZap,
  FiSearch,
  FiUsers,
  FiLayers,
  FiCheck,
  FiAlertCircle,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import zoneService from "../../services/zoneService";
import { cityService } from "../../services/cityService";
import { categoryService } from "../../../../services/catalogService";

const LIBRARIES = ["drawing", "places", "geometry"];

const MAP_CONTAINER = { width: "100%", height: "100%" };
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const DEFAULT_ZOOM = 11;

const ZONE_COLORS = [
  "#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED",
  "#DB2777", "#0D9488", "#EA580C", "#4F46E5", "#65A30D",
];

const SURGE_PRESETS = [1.2, 1.5, 1.8, 2.0, 2.5];

const ZonesPage = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const [zones, setZones] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [form, setForm] = useState({
    name: "",
    cityId: "",
    coordinates: null,
    allowedCategories: [],
    surgePricing: { enabled: false, multiplier: 1 },
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoveredZoneId, setHoveredZoneId] = useState(null);

  const drawingManagerRef = useRef(null);
  const mapRef = useRef(null);
  const editablePolygonRef = useRef(null);
  const pathListenersRef = useRef([]);

  // Fetch initial cities & categories
  useEffect(() => {
    const init = async () => {
      try {
        const [cityRes, catRes] = await Promise.all([
          cityService.getAll(),
          categoryService.getAll({ parentId: null }),
        ]);
        if (cityRes?.success) setCities((cityRes.cities || []).filter((c) => c.isActive !== false));
        if (catRes?.success) setCategories(catRes.categories || []);
      } catch (err) {
        console.error("Init error:", err);
      }
    };
    init();
  }, []);

  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCityId) params.cityId = selectedCityId;
      const res = await zoneService.getAll(params);
      if (res?.success) setZones(res.zones || []);
    } catch (err) {
      console.error("Fetch zones error:", err);
      toast.error("Failed to load zones");
    } finally {
      setLoading(false);
    }
  }, [selectedCityId]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // Center map on selected city
  useEffect(() => {
    if (!selectedCityId || !isLoaded || !window.google?.maps?.Geocoder) return;
    const city = cities.find((c) => (c.id || c._id) === selectedCityId);
    if (city) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: `${city.name}, ${city.state || ""}, ${city.country || "India"}` }, (results, status) => {
        if (status === "OK" && results[0]) {
          const loc = results[0].geometry.location;
          const pos = { lat: loc.lat(), lng: loc.lng() };
          setMapCenter(pos);
          if (mapRef.current) {
            mapRef.current.panTo(pos);
            mapRef.current.setZoom(12);
          }
        }
      });
    }
  }, [selectedCityId, cities, isLoaded]);

  // Center on city when selected in form
  const handleFormCityChange = (cityId) => {
    setForm((p) => ({ ...p, cityId }));
    if (!cityId || !isLoaded || !window.google?.maps?.Geocoder) return;
    const city = cities.find((c) => (c.id || c._id) === cityId);
    if (city) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: `${city.name}, ${city.state || ""}, ${city.country || "India"}` }, (results, status) => {
        if (status === "OK" && results[0]) {
          const loc = results[0].geometry.location;
          const pos = { lat: loc.lat(), lng: loc.lng() };
          setMapCenter(pos);
          if (mapRef.current) {
            mapRef.current.panTo(pos);
            mapRef.current.setZoom(12);
          }
        }
      });
    }
  };

  // Convert GeoJSON [lng, lat] to Google Maps {lat, lng}
  const geoJsonToLatLng = useCallback((coords) => {
    if (!coords || !coords[0]) return [];
    return coords[0].map(([lng, lat]) => ({ lat, lng }));
  }, []);

  // Zoom map to fit a specific zone
  const handleSelectZone = useCallback((zone) => {
    const id = zone.id || zone._id;
    setHoveredZoneId(id);
    if (!mapRef.current || !zone?.coordinates?.coordinates?.[0]?.length) return;
    try {
      const bounds = new window.google.maps.LatLngBounds();
      zone.coordinates.coordinates[0].forEach(([lng, lat]) => {
        bounds.extend({ lat, lng });
      });
      mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    } catch {
      // ignore
    }
  }, []);

  // Drawing complete handler
  const onPolygonComplete = useCallback((polygon) => {
    const path = polygon.getPath();
    const coords = [];
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coords.push([point.lng(), point.lat()]);
    }
    // Ensure ring is closed
    if (coords.length > 0) {
      coords.push([...coords[0]]);
    }

    // Clean up drawing overlay so React <Polygon> takes over cleanly
    polygon.setMap(null);

    setForm((prev) => ({ ...prev, coordinates: [coords] }));
    setIsDrawing(false);
    toast.success("Zone boundary marked! You can drag points to fine-tune.");
  }, []);

  // Listen to vertex drag/edit events on the preview polygon
  const onEditablePolygonLoad = useCallback((polygon) => {
    editablePolygonRef.current = polygon;
    const path = polygon.getPath();

    // Clean previous listeners
    pathListenersRef.current.forEach((l) => window.google?.maps?.event?.removeListener(l));
    pathListenersRef.current = [];

    const syncCoords = () => {
      const p = polygon.getPath();
      const updated = [];
      for (let i = 0; i < p.getLength(); i++) {
        const pt = p.getAt(i);
        updated.push([pt.lng(), pt.lat()]);
      }
      if (updated.length > 0) {
        updated.push([...updated[0]]);
      }
      setForm((prev) => ({ ...prev, coordinates: [updated] }));
    };

    pathListenersRef.current = [
      path.addListener("set_at", syncCoords),
      path.addListener("insert_at", syncCoords),
      path.addListener("remove_at", syncCoords),
    ];
  }, []);

  const handleOpenCreate = () => {
    setEditingZone(null);
    setForm({
      name: "",
      cityId: selectedCityId || "",
      coordinates: null,
      allowedCategories: [],
      surgePricing: { enabled: false, multiplier: 1 },
      status: "active",
    });
    setCategorySearchQuery("");
    setIsDrawing(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (zone) => {
    setEditingZone(zone);
    const cityId = typeof zone.cityId === "object" ? zone.cityId?._id || zone.cityId?.id : zone.cityId;
    setForm({
      name: zone.name || "",
      cityId: cityId || "",
      coordinates: zone.coordinates?.coordinates || null,
      allowedCategories: (zone.allowedCategories || []).map((c) =>
        typeof c === "object" ? c._id || c.id : c
      ),
      surgePricing: zone.surgePricing || { enabled: false, multiplier: 1 },
      status: zone.status || "active",
    });
    setCategorySearchQuery("");
    setIsDrawing(false);
    setIsFormOpen(true);
    handleSelectZone(zone);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingZone(null);
    setIsDrawing(false);
    pathListenersRef.current.forEach((l) => window.google?.maps?.event?.removeListener(l));
    pathListenersRef.current = [];
  };

  const startDrawing = () => {
    if (!form.cityId) {
      toast("Please select a city first to focus the map.", { icon: "ℹ️" });
    }
    setForm((prev) => ({ ...prev, coordinates: null }));
    setIsDrawing(true);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    toast("Drawing cancelled", { icon: "↩️" });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Zone name is required");
    if (!form.cityId) return toast.error("Please select a city");
    if (!form.coordinates || !form.coordinates[0] || form.coordinates[0].length < 4) {
      return toast.error("Please draw a zone boundary on the map (at least 3 vertices)");
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        cityId: form.cityId,
        coordinates: form.coordinates,
        allowedCategories: form.allowedCategories,
        surgePricing: form.surgePricing,
        status: form.status,
      };

      if (editingZone) {
        const id = editingZone.id || editingZone._id;
        const res = await zoneService.update(id, payload);
        if (res?.success) {
          toast.success("Zone updated successfully");
          handleCloseForm();
          fetchZones();
        } else {
          toast.error(res?.message || "Failed to update zone");
        }
      } else {
        const res = await zoneService.create(payload);
        if (res?.success) {
          toast.success("Zone created successfully");
          handleCloseForm();
          fetchZones();
        } else {
          toast.error(res?.message || "Failed to create zone");
        }
      }
    } catch (err) {
      console.error("Save zone error:", err);
      toast.error(err?.response?.data?.message || "Failed to save zone");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zone) => {
    if (!window.confirm(`Delete zone "${zone.name}"? This cannot be undone.`)) return;
    try {
      const id = zone.id || zone._id;
      const res = await zoneService.delete(id);
      if (res?.success) {
        toast.success("Zone deleted");
        fetchZones();
      }
    } catch (err) {
      toast.error("Failed to delete zone");
    }
  };

  const handleToggleStatus = async (zone) => {
    try {
      const id = zone.id || zone._id;
      const res = await zoneService.toggleStatus(id);
      if (res?.success) {
        toast.success(res.message);
        fetchZones();
      }
    } catch (err) {
      toast.error("Failed to toggle zone status");
    }
  };

  const handleCategoryToggle = (catId) => {
    setForm((prev) => {
      const list = prev.allowedCategories.includes(catId)
        ? prev.allowedCategories.filter((c) => c !== catId)
        : [...prev.allowedCategories, catId];
      return { ...prev, allowedCategories: list };
    });
  };

  const handleSelectAllCategories = () => {
    const allIds = filteredCategories.map((c) => c.id || c._id);
    setForm((prev) => ({
      ...prev,
      allowedCategories: Array.from(new Set([...prev.allowedCategories, ...allIds])),
    }));
  };

  const handleClearCategories = () => {
    setForm((prev) => ({ ...prev, allowedCategories: [] }));
  };

  // Filtered categories for the drawer checklist
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    const q = categorySearchQuery.toLowerCase();
    return categories.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [categories, categorySearchQuery]);

  // Filtered zones for the left sidebar
  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return zones;
    const q = searchQuery.toLowerCase();
    return zones.filter((z) => (z.name || "").toLowerCase().includes(q));
  }, [zones, searchQuery]);

  const activeCount = useMemo(() => zones.filter((z) => z.status === "active").length, [zones]);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
        <FiAlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-base font-bold text-gray-900">Google Maps Failed to Load</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-md">
          Please check that VITE_GOOGLE_MAPS_API_KEY is properly configured with Maps JavaScript API and Drawing library enabled.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-sm text-gray-600 font-medium">Loading Google Maps & Drawing Tools...</span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-gray-50">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FiMap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">Admin Zone Management</h1>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {zones.length} {zones.length === 1 ? "Zone" : "Zones"}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {activeCount} Active
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Draw geographic operational zones, configure surge pricing, and map allowed services
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* City Filter */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
            <FiFilter className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city.id || city._id} value={city.id || city._id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchZones}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh zones"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <FiPlus className="w-4 h-4" />
            Add Zone
          </button>
        </div>
      </div>

      {/* Main Container: Left Zone List + Right Fullscreen Map */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Zone List */}
        <div className="w-80 xl:w-96 border-r border-gray-200 bg-white flex flex-col shrink-0">
          {/* Zone Search */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/70">
            <div className="relative">
              <FiSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search zones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Zones Scrollable List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3 mb-3" />
                    <div className="h-5 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredZones.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <FiMap className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">No zones found</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">
                  {selectedCityId ? "No zones created for this city yet." : "Click '+ Add Zone' to draw your first boundary."}
                </p>
                <button
                  onClick={handleOpenCreate}
                  className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold"
                >
                  Create Zone
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredZones.map((zone, idx) => {
                  const id = zone.id || zone._id;
                  const cityName = typeof zone.cityId === "object" ? zone.cityId?.name : "";
                  const catCount = (zone.allowedCategories || []).length;
                  const color = ZONE_COLORS[idx % ZONE_COLORS.length];
                  const isHovered = hoveredZoneId === id;
                  const isEditingThis = editingZone && (editingZone.id || editingZone._id) === id;

                  return (
                    <div
                      key={id}
                      onClick={() => handleSelectZone(zone)}
                      onMouseEnter={() => setHoveredZoneId(id)}
                      onMouseLeave={() => setHoveredZoneId(null)}
                      className={`p-3.5 transition-all cursor-pointer border-l-4 ${
                        isEditingThis
                          ? "bg-blue-50/80 border-blue-600 shadow-sm"
                          : isHovered
                          ? "bg-gray-50 border-gray-400"
                          : "hover:bg-gray-50/60 border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                            <h4 className="text-xs font-bold text-gray-900 truncate">{zone.name}</h4>
                          </div>

                          {cityName && (
                            <p className="text-[11px] text-gray-500 mt-0.5 ml-4 flex items-center gap-1">
                              <span className="truncate">{cityName}</span>
                            </p>
                          )}

                          {/* Badges */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap ml-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                zone.status === "active"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {zone.status === "active" ? "Active" : "Inactive"}
                            </span>

                            <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FiLayers className="w-2.5 h-2.5" />
                              {catCount} {catCount === 1 ? "Service" : "Services"}
                            </span>

                            {zone.workerCount !== undefined && (
                              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-100">
                                <FiUsers className="w-2.5 h-2.5" />
                                {zone.workerCount} {zone.workerCount === 1 ? "Worker" : "Workers"}
                              </span>
                            )}

                            {zone.surgePricing?.enabled && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <FiZap className="w-2.5 h-2.5 text-amber-600" />
                                {zone.surgePricing.multiplier}x
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Toggle status */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(zone);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              zone.status === "active"
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-gray-400 hover:bg-gray-100"
                            }`}
                            title={zone.status === "active" ? "Deactivate" : "Activate"}
                          >
                            <div
                              className={`w-3 h-3 rounded-full border-2 ${
                                zone.status === "active"
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-gray-400"
                              }`}
                            />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(zone);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Zone"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(zone);
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Zone"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Map */}
        <div className="flex-1 relative overflow-hidden bg-slate-100">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER}
            center={mapCenter}
            zoom={DEFAULT_ZOOM}
            onLoad={(map) => {
              mapRef.current = map;
            }}
            options={{
              fullscreenControl: true,
              streetViewControl: false,
              mapTypeControl: true,
              mapTypeControlOptions: { position: 3 },
            }}
          >
            {/* Existing Zone Polygons (hide polygon currently being edited to avoid duplicate rendering) */}
            {zones
              .filter(
                (z) =>
                  !isFormOpen ||
                  !editingZone ||
                  (z.id || z._id) !== (editingZone.id || editingZone._id)
              )
              .map((zone, idx) => {
                const id = zone.id || zone._id;
                if (!zone.coordinates?.coordinates) return null;
                const color = ZONE_COLORS[idx % ZONE_COLORS.length];
                const isHovered = hoveredZoneId === id;

                return (
                  <Polygon
                    key={id}
                    paths={geoJsonToLatLng(zone.coordinates.coordinates)}
                    options={{
                      fillColor: color,
                      fillOpacity: isHovered ? 0.45 : 0.22,
                      strokeColor: color,
                      strokeOpacity: 0.95,
                      strokeWeight: isHovered ? 3.5 : 2,
                      clickable: true,
                    }}
                    onMouseOver={() => setHoveredZoneId(id)}
                    onMouseOut={() => setHoveredZoneId(null)}
                    onClick={() => handleOpenEdit(zone)}
                  />
                );
              })}

            {/* Editable Form Preview Polygon */}
            {isFormOpen && form.coordinates && !isDrawing && (
              <Polygon
                paths={geoJsonToLatLng(form.coordinates)}
                onLoad={onEditablePolygonLoad}
                options={{
                  fillColor: "#2563EB",
                  fillOpacity: 0.35,
                  strokeColor: "#1D4ED8",
                  strokeOpacity: 1,
                  strokeWeight: 3,
                  editable: true,
                  draggable: false,
                  zIndex: 10,
                }}
              />
            )}

            {/* Drawing Manager for marking vertices */}
            {isDrawing && (
              <DrawingManager
                onLoad={(dm) => {
                  drawingManagerRef.current = dm;
                }}
                onPolygonComplete={onPolygonComplete}
                options={{
                  drawingMode:
                    window.google?.maps?.drawing?.OverlayType?.POLYGON || "polygon",
                  drawingControl: false,
                  polygonOptions: {
                    fillColor: "#2563EB",
                    fillOpacity: 0.35,
                    strokeColor: "#1D4ED8",
                    strokeWeight: 2.5,
                    editable: true,
                    zIndex: 20,
                  },
                }}
              />
            )}
          </GoogleMap>

          {/* Floating Drawing Mode Banner */}
          {isDrawing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold z-20 border border-white/10 animate-in fade-in">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
              <span>Click on the map to place vertices. Double-click to close &amp; finish zone.</span>
              <button
                type="button"
                onClick={cancelDrawing}
                className="ml-2 px-2.5 py-1 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-lg text-[11px] font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Floating "Draw Zone" shortcut if form is open and no boundary */}
          {isFormOpen && !form.coordinates && !isDrawing && (
            <button
              onClick={startDrawing}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold z-10 transition-transform active:scale-95"
            >
              <FiMap className="w-4 h-4" />
              Click Here to Start Drawing Boundary
            </button>
          )}
        </div>
      </div>

      {/* Create / Edit Slide-over Drawer */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={handleCloseForm} />
          <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between shrink-0 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FiMap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    {editingZone ? "Edit Zone" : "Create Operational Zone"}
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    {editingZone ? `Editing "${editingZone.name}"` : "Set boundary, city and operational rules"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseForm}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Zone Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Zone Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. South Delhi - Zone A"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* City Selection */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Operating City <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.cityId}
                  onChange={(e) => handleFormCityChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                >
                  <option value="">Select city...</option>
                  {cities.map((city) => (
                    <option key={city.id || city._id} value={city.id || city._id}>
                      {city.name} ({city.state || "India"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Zone Boundary Tool */}
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                    Geographic Boundary <span className="text-red-500">*</span>
                  </label>
                  {form.coordinates && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {form.coordinates[0]?.length - 1} Vertices
                    </span>
                  )}
                </div>

                {form.coordinates ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-gray-600">
                      Boundary set. You can drag vertices directly on the map to adjust boundaries.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={startDrawing}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Redraw Polygon
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, coordinates: null }))}
                        className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] text-gray-500 mb-2.5">
                      Click below to activate the polygon tool. Click on the map to mark boundary corners and double-click to finish.
                    </p>
                    <button
                      type="button"
                      onClick={startDrawing}
                      className="w-full py-2.5 border-2 border-dashed border-blue-400 bg-white hover:bg-blue-50/80 rounded-xl text-xs font-bold text-blue-700 flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <FiMap className="w-4 h-4 text-blue-600" />
                      Draw Zone on Map
                    </button>
                  </div>
                )}
              </div>

              {/* Allowed Categories */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Allowed Services ({form.allowedCategories.length} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllCategories}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearCategories}
                      className="text-[10px] text-gray-500 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Category Search Filter */}
                <input
                  type="text"
                  placeholder="Filter categories..."
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/40">
                  {filteredCategories.length === 0 ? (
                    <div className="p-3 text-xs text-gray-400 text-center">No categories found</div>
                  ) : (
                    filteredCategories.map((cat) => {
                      const catId = cat.id || cat._id;
                      const isChecked = form.allowedCategories.includes(catId);
                      return (
                        <label
                          key={catId}
                          className={`flex items-center gap-2.5 px-3 py-2 hover:bg-white cursor-pointer transition-colors ${
                            isChecked ? "bg-blue-50/40 font-semibold" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCategoryToggle(catId)}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-800">{cat.title}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Surge Pricing Card */}
              <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-3.5 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.surgePricing.enabled}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        surgePricing: { ...p.surgePricing, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      <FiZap className="w-3.5 h-3.5 text-amber-500" />
                      Dynamic Surge Pricing
                    </span>
                    <span className="text-[11px] text-gray-500 block mt-0.5">
                      Automatically apply a price multiplier for high-demand bookings in this zone
                    </span>
                  </div>
                </label>

                {form.surgePricing.enabled && (
                  <div className="pt-2 border-t border-amber-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-gray-700 font-bold">
                        Multiplier: <span className="text-amber-700 text-xs">{form.surgePricing.multiplier}x</span>
                      </label>
                      {/* Presets */}
                      <div className="flex items-center gap-1">
                        {SURGE_PRESETS.map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                surgePricing: { ...p.surgePricing, multiplier: val },
                              }))
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              form.surgePricing.multiplier === val
                                ? "bg-amber-600 text-white"
                                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {val}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="range"
                      min="1.0"
                      max="4.0"
                      step="0.1"
                      value={form.surgePricing.multiplier}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          surgePricing: {
                            ...p.surgePricing,
                            multiplier: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                >
                  <option value="active">Active (Serving Bookings)</option>
                  <option value="inactive">Inactive (Paused)</option>
                </select>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-gray-200 px-5 py-3.5 flex items-center gap-2.5 shrink-0 bg-gray-50/70">
              <button
                type="button"
                onClick={handleCloseForm}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <FiSave className="w-3.5 h-3.5" />
                {saving ? "Saving..." : editingZone ? "Update Zone" : "Create Zone"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZonesPage;
