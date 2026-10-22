import React, { useEffect, useMemo, useState } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiImage,
  FiX,
  FiEye,
  FiEyeOff,
  FiLayers,
  FiStar,
  FiZap,
  FiPackage,
  FiFilm,
  FiImage as FiImageIcon,
  FiBookmark,
  FiChevronRight,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import {
  homeContentService,
  categoryService,
  brandService,
  serviceService,
} from "../../../../../services/catalogService";
import AdminZoneSelect from "../../../components/AdminZoneSelect";

/**
 * Home Sections Manager
 *
 * One page, one place. Admin picks a section tab (Spotlight / New & Noteworthy /
 * Cleaning Essentials / Most Booked / Curated / Banners / Promos) and manages
 * the items inside it with Add / Edit / Delete and an image uploader.
 *
 * Backs onto homeContentService.update() so this is zero new backend code.
 * The HomeContent document is the single source of truth for every section
 * rendered on the user homepage.
 */

// ────────────────────────────────────────────────────────────────────────────
// Section definitions: schema, fields, and defaults.
//
// `key`         — property name on the HomeContent document
// `visibilityKey` — the matching isXxxVisible boolean (optional)
// `fields`      — array of {name, label, type, placeholder, help, required}
//                 Types: text, textarea, image, color, number, select
//                 'category' and 'service' types render a redirect selector.
// `idPrefix`    — new-item id prefix for sanitation on backend
// `defaultItem` — blank item for Add
// ────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    key: "spotlight",
    visibilityKey: "isSpotlightVisible",
    label: "In the Spotlight",
    tag: "Hero banners",
    icon: FiZap,
    idPrefix: "hspl",
    tint: "#F59E0B",
    fields: [
      { name: "imageUrl", label: "Portrait Image (right side)", type: "image", folder: "spotlight", help: "Transparent PNG works best." },
      { name: "badge", label: "Badge (top-left pill)", type: "text", placeholder: "New launch" },
      { name: "title", label: "Title", type: "text", placeholder: "Japanese glow rituals", required: true },
      { name: "subtitle", label: "Subtitle", type: "text", placeholder: "Starting", default: "Starting" },
      { name: "startingPrice", label: "Starting Price", type: "text", placeholder: "1,399" },
      { name: "buttonText", label: "Button Text", type: "text", placeholder: "Book now", default: "Book now" },
      { name: "backgroundColor", label: "Background", type: "color", default: "#B4C2A8" },
      { name: "textColor", label: "Text Color", type: "color", default: "#1A1A1A" },
      { name: "badgeColor", label: "Badge Color", type: "color", default: "#7A2149" },
      { name: "redirect", label: "On click, open", type: "redirect" },
      { name: "zoneId", label: "Operating Zone (optional)", type: "zone" },
    ],
    defaultItem: {
      badge: "", title: "", subtitle: "Starting", startingPrice: "",
      buttonText: "Book now", imageUrl: "", backgroundColor: "#B4C2A8",
      textColor: "#1A1A1A", badgeColor: "#7A2149", targetCategoryId: "",
      slug: "", targetServiceId: "", zoneId: "",
    },
    columns: [
      { label: "Image", render: (i) => i.imageUrl && <img src={i.imageUrl} alt="" className="h-10 w-10 rounded object-cover border" style={{ backgroundColor: i.backgroundColor }} /> },
      { label: "Badge", get: (i) => i.badge },
      { label: "Title", get: (i) => i.title, bold: true },
      { label: "Price", get: (i) => i.startingPrice ? `${i.subtitle || "Starting"} ${i.startingPrice}` : "" },
    ],
  },
  {
    key: "noteworthy",
    visibilityKey: "isNoteworthyVisible",
    label: "New & Noteworthy",
    tag: "Image + title + ETA row",
    icon: FiStar,
    idPrefix: "hnnw",
    tint: "#8B5CF6",
    fields: [
      { name: "imageUrl", label: "Image", type: "image", folder: "noteworthy" },
      { name: "title", label: "Title", type: "text", placeholder: "Salon Luxe", required: true },
      { name: "badge", label: "Badge (top-left, e.g. NEW)", type: "text", placeholder: "NEW" },
      { name: "duration", label: "Arrival Time (minutes)", type: "number", placeholder: "55", help: "Shown as ⚡ In X mins. Leave empty to hide." },
      { name: "subtitle", label: "Subtitle (optional)", type: "text" },
      { name: "redirect", label: "On click, open", type: "redirect" },
    ],
    defaultItem: {
      title: "", badge: "", duration: "", subtitle: "", imageUrl: "",
      targetCategoryId: "", slug: "", targetServiceId: "",
    },
    columns: [
      { label: "Image", render: (i) => i.imageUrl && <img src={i.imageUrl} alt="" className="h-10 w-10 rounded object-cover border" /> },
      { label: "Title", get: (i) => i.title, bold: true },
      { label: "Badge", get: (i) => i.badge },
      { label: "ETA", get: (i) => i.duration ? `${i.duration} mins` : "" },
    ],
  },
  {
    key: "booked",
    visibilityKey: "isBookedVisible",
    label: "Most Booked",
    tag: "Rating + price + Add button cards",
    icon: FiBookmark,
    idPrefix: "hmb",
    tint: "#10B981",
    fields: [
      { name: "imageUrl", label: "Image", type: "image", folder: "booked" },
      { name: "title", label: "Title", type: "text", placeholder: "Washing machine repair", required: true },
      { name: "rating", label: "Rating", type: "text", placeholder: "4.79" },
      { name: "reviews", label: "Reviews count", type: "text", placeholder: "3.7M" },
      { name: "price", label: "Price (₹)", type: "text", placeholder: "950" },
      { name: "originalPrice", label: "Original Price (₹)", type: "text", placeholder: "1038" },
      { name: "discount", label: "Discount label", type: "text", placeholder: "8% OFF" },
      { name: "redirect", label: "On click, open", type: "redirect" },
    ],
    defaultItem: {
      title: "", rating: "", reviews: "", price: "", originalPrice: "",
      discount: "", imageUrl: "", targetCategoryId: "", slug: "", targetServiceId: "",
    },
    columns: [
      { label: "Image", render: (i) => i.imageUrl && <img src={i.imageUrl} alt="" className="h-10 w-10 rounded object-cover border" /> },
      { label: "Title", get: (i) => i.title, bold: true },
      { label: "★", get: (i) => i.rating },
      { label: "Price", get: (i) => i.price ? `₹${i.price}` : "" },
    ],
  },
  {
    key: "curatedServices",
    visibilityKey: "isCuratedVisible",
    label: "Curated",
    tag: "GIF/video rail",
    icon: FiFilm,
    idPrefix: "hcur",
    tint: "#EC4899",
    fields: [
      { name: "gifUrl", label: "GIF or Image", type: "image", folder: "curated" },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "youtubeUrl", label: "YouTube URL (optional)", type: "text", placeholder: "https://youtube.com/..." },
      { name: "redirect", label: "On click, open", type: "redirect" },
    ],
    defaultItem: { title: "", gifUrl: "", youtubeUrl: "", targetCategoryId: "", slug: "", targetServiceId: "" },
    columns: [
      { label: "Image", render: (i) => i.gifUrl && <img src={i.gifUrl} alt="" className="h-10 w-10 rounded object-cover border" /> },
      { label: "Title", get: (i) => i.title, bold: true },
      { label: "Video", get: (i) => i.youtubeUrl ? "Yes" : "" },
    ],
  },
  {
    key: "banners",
    visibilityKey: "isBannersVisible",
    label: "Banners",
    tag: "Full-width promo images",
    icon: FiImageIcon,
    idPrefix: "hbnr",
    tint: "#2874F0",
    fields: [
      { name: "imageUrl", label: "Banner Image (3:1 ratio recommended)", type: "image", folder: "banners" },
      { name: "text", label: "Alt text / caption", type: "text" },
      { name: "redirect", label: "On click, open", type: "redirect" },
      { name: "zoneId", label: "Operating Zone (optional)", type: "zone" },
    ],
    defaultItem: { imageUrl: "", text: "", targetCategoryId: "", slug: "", targetServiceId: "", scrollToSection: "", zoneId: "" },
    columns: [
      { label: "Image", render: (i) => i.imageUrl && <img src={i.imageUrl} alt="" className="h-10 w-20 rounded object-cover border" /> },
      { label: "Text", get: (i) => i.text },
    ],
  },
  {
    key: "promoCarousel",
    visibilityKey: "isPromosVisible",
    label: "Promo Carousel",
    tag: "Horizontal promo cards",
    icon: FiPackage,
    idPrefix: "hprm",
    tint: "#F97316",
    fields: [
      { name: "imageUrl", label: "Image", type: "image", folder: "promos" },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "subtitle", label: "Subtitle", type: "text" },
      { name: "buttonText", label: "Button Text", type: "text", default: "Explore" },
      { name: "gradientClass", label: "Gradient (Tailwind class)", type: "text", default: "from-blue-600 to-blue-800" },
      { name: "redirect", label: "On click, open", type: "redirect" },
      { name: "zoneId", label: "Operating Zone (optional)", type: "zone" },
    ],
    defaultItem: {
      title: "", subtitle: "", buttonText: "Explore",
      gradientClass: "from-blue-600 to-blue-800", imageUrl: "",
      targetCategoryId: "", slug: "", targetServiceId: "", scrollToSection: "", zoneId: "",
    },
    columns: [
      { label: "Image", render: (i) => i.imageUrl && <img src={i.imageUrl} alt="" className="h-10 w-10 rounded object-cover border" /> },
      { label: "Title", get: (i) => i.title, bold: true },
      { label: "Subtitle", get: (i) => i.subtitle },
    ],
  },
  {
    key: "categorySections",
    visibilityKey: "isCategorySectionsVisible",
    label: "Themed Rows",
    tag: "Cleaning Essentials, Winter, etc.",
    icon: FiLayers,
    idPrefix: "hsec",
    tint: "#6366F1",
    isNested: true, // Nested cards per section — handled with sub-editor
    fields: [
      { name: "title", label: "Row Title", type: "text", placeholder: "Cleaning Essentials", required: true },
      { name: "subtitle", label: "Subtitle", type: "text", placeholder: "Monthly cleaning essential services" },
      { name: "seeAllRedirect", label: "'See all' opens", type: "redirect", redirectFields: { category: "seeAllTargetCategoryId", slug: "seeAllSlug", service: "seeAllTargetServiceId" } },
    ],
    defaultItem: {
      title: "", subtitle: "", seeAllTargetCategoryId: "", seeAllSlug: "",
      seeAllTargetServiceId: "", cards: [],
    },
    columns: [
      { label: "Title", get: (i) => i.title, bold: true },
      { label: "Subtitle", get: (i) => i.subtitle },
      { label: "Cards", get: (i) => `${(i.cards || []).length}` },
    ],
    cardFields: [
      { name: "imageUrl", label: "Card Image", type: "image", folder: "categorySection" },
      { name: "title", label: "Card Title", type: "text", required: true },
      { name: "rating", label: "Rating", type: "text", placeholder: "4.8" },
      { name: "reviews", label: "Reviews", type: "text", placeholder: "10k+" },
      { name: "price", label: "Price (₹)", type: "text" },
      { name: "originalPrice", label: "Original Price (₹)", type: "text" },
      { name: "discount", label: "Discount", type: "text" },
      { name: "optionsCount", label: "Options count", type: "number" },
      { name: "redirect", label: "On click, open", type: "redirect" },
    ],
    cardDefault: {
      title: "", rating: "", reviews: "", price: "", originalPrice: "",
      discount: "", optionsCount: "", imageUrl: "", targetCategoryId: "",
      slug: "", targetServiceId: "",
    },
  },
];

const sectionByKey = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));

// ────────────────────────────────────────────────────────────────────────────
// Field renderer
// ────────────────────────────────────────────────────────────────────────────

const FieldRow = ({ field, form, setForm, categories, services, uploading, setUploading }) => {
  const value = form[field.name] ?? "";

  const upload = async (file, folder) => {
    setUploading(true);
    try {
      const response = await serviceService.uploadImage(file, folder, () => {});
      if (response?.success) {
        setForm((p) => ({ ...p, [field.name]: response.imageUrl }));
        toast.success("Image uploaded");
      } else {
        toast.error(response?.message || "Upload failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (field.type === "text" || field.type === "number") {
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          {field.label}{field.required && <span className="text-rose-500">*</span>}
        </label>
        <input
          type={field.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => setForm((p) => ({ ...p, [field.name]: e.target.value }))}
          placeholder={field.placeholder}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {field.help && <p className="text-[11px] text-gray-500 mt-1">{field.help}</p>}
      </div>
    );
  }

  if (field.type === "color") {
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">{field.label}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || field.default || "#000000"}
            onChange={(e) => setForm((p) => ({ ...p, [field.name]: e.target.value }))}
            className="w-12 h-10 rounded border border-gray-300 bg-white cursor-pointer"
          />
          <input
            type="text"
            value={value || field.default || ""}
            onChange={(e) => setForm((p) => ({ ...p, [field.name]: e.target.value }))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-mono"
          />
        </div>
      </div>
    );
  }

  if (field.type === "image") {
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          {field.label}{field.required && <span className="text-rose-500">*</span>}
        </label>
        {field.help && <p className="text-[11px] text-gray-500 mb-2">{field.help}</p>}
        <div className="flex items-start gap-3">
          {value ? (
            <div className="relative">
              <img src={value} alt="" className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, [field.name]: "" }))}
                className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow hover:bg-rose-600"
                title="Remove image"
              >
                <FiX className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
              <FiImage className="w-8 h-8" />
            </div>
          )}
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], field.folder || "home")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            {uploading && <div className="mt-2 text-xs text-blue-600">Uploading...</div>}
          </div>
        </div>
      </div>
    );
  }

  if (field.type === "redirect") {
    // Returns a composite control that writes targetCategoryId + slug + targetServiceId
    // (or custom field names if field.redirectFields overrides them)
    const map = field.redirectFields || { category: "targetCategoryId", slug: "slug", service: "targetServiceId" };
    const catId = form[map.category] || "";
    const svcId = form[map.service] || "";
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">{field.label}</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={catId}
            onChange={(e) => setForm((p) => ({ ...p, [map.category]: e.target.value, [map.service]: "" }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">— Category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <select
            value={svcId}
            onChange={(e) => setForm((p) => ({ ...p, [map.service]: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
            disabled={!catId}
          >
            <option value="">— Service (optional) —</option>
            {services.filter((s) => {
              const sCat = typeof s.categoryId === "object" ? (s.categoryId?.id || s.categoryId?._id) : s.categoryId;
              return String(sCat) === String(catId);
            }).map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          Leave both empty if this item isn't clickable. Pick a category to open its booking modal; optionally pick a specific service.
        </p>
      </div>
    );
  }

  if (field.type === "zone") {
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">{field.label}</label>
        <AdminZoneSelect
          value={form[field.name] || ""}
          onChange={(val) => setForm((p) => ({ ...p, [field.name]: val }))}
          isMulti={false}
          placeholder="All Zones (Global)"
        />
      </div>
    );
  }

  return null;
};

// ────────────────────────────────────────────────────────────────────────────
// Item Modal (Add/Edit for any section)
// ────────────────────────────────────────────────────────────────────────────

const ItemModal = ({ open, section, initialForm, onClose, onSave, categories, services, saving, onCreateCategory }) => {
  const [form, setForm] = useState(initialForm);
  const [uploading, setUploading] = useState(false);
  const [cardsEditing, setCardsEditing] = useState(null); // for nested categorySections: {index, form} or 'new'
  const [cardFormData, setCardFormData] = useState(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState("");

  useEffect(() => { setForm(initialForm); setCardsEditing(null); setCardFormData(null); setPresetOpen(false); setPresetSearch(""); }, [initialForm, open]);

  if (!open || !section) return null;

  // Pick a service as preset — autofills title + redirect + (image if available)
  const applyServicePreset = (service) => {
    const cat = categories.find((c) => {
      const sCat = typeof service.categoryId === "object" ? (service.categoryId?.id || service.categoryId?._id) : service.categoryId;
      return String(c.id) === String(sCat);
    });
    setForm((p) => ({
      ...p,
      title: service.title || p.title,
      imageUrl: service.iconUrl || p.imageUrl || "",
      gifUrl: section.key === "curatedServices" ? (service.iconUrl || p.gifUrl || "") : p.gifUrl,
      price: service.basePrice ? String(service.basePrice) : (p.price || ""),
      targetCategoryId: cat?.id || "",
      targetServiceId: service.id || "",
      slug: service.slug || p.slug || "",
    }));
    setPresetOpen(false);
    toast.success(`Preset: ${service.title}`);
  };

  // Pick a category as preset — autofills title + category redirect
  const applyCategoryPreset = (cat) => {
    setForm((p) => ({
      ...p,
      title: cat.title || p.title,
      imageUrl: cat.homeIconUrl || p.imageUrl || "",
      gifUrl: section.key === "curatedServices" ? (cat.homeIconUrl || p.gifUrl || "") : p.gifUrl,
      targetCategoryId: cat.id || "",
      targetServiceId: "",
      slug: cat.slug || p.slug || "",
    }));
    setPresetOpen(false);
    toast.success(`Preset: ${cat.title}`);
  };

  const filteredPresetCats = categories.filter((c) => (c.title || "").toLowerCase().includes(presetSearch.toLowerCase()));
  const filteredPresetSvcs = services.filter((s) => (s.title || "").toLowerCase().includes(presetSearch.toLowerCase())).slice(0, 50);

  const handleSave = () => {
    const required = section.fields.filter((f) => f.required);
    for (const f of required) {
      if (!form[f.name] || String(form[f.name]).trim() === "") {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    onSave(form);
  };

  // Nested card editor (categorySections only)
  const openCardEditor = (index) => {
    if (index === null) {
      setCardsEditing("new");
      setCardFormData({ ...section.cardDefault });
    } else {
      const existing = (form.cards || [])[index];
      setCardsEditing(index);
      setCardFormData({ ...existing });
    }
  };

  const saveCard = () => {
    const required = (section.cardFields || []).filter((f) => f.required);
    for (const f of required) {
      if (!cardFormData[f.name] || String(cardFormData[f.name]).trim() === "") {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    const newCards = [...(form.cards || [])];
    if (cardsEditing === "new") {
      newCards.push({ ...cardFormData, id: `hcard-${Date.now()}` });
    } else {
      newCards[cardsEditing] = { ...newCards[cardsEditing], ...cardFormData };
    }
    setForm((p) => ({ ...p, cards: newCards }));
    setCardsEditing(null);
    setCardFormData(null);
  };

  const removeCard = (index) => {
    if (!window.confirm("Delete this card?")) return;
    const newCards = [...(form.cards || [])];
    newCards.splice(index, 1);
    setForm((p) => ({ ...p, cards: newCards }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-gray-900">
            {initialForm.id ? "Edit" : "Add"} {section.label}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <FiX className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Preset picker — browse existing services from the catalog */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-blue-900">Quick-fill from existing catalog</div>
                <div className="text-[11px] text-blue-700 mt-0.5">Pick a service you already offer — title, image, price, and redirect auto-fill.</div>
              </div>
              <button
                type="button"
                onClick={() => setPresetOpen((v) => !v)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                {presetOpen ? "Hide" : "Browse"}
              </button>
            </div>
            {presetOpen && (
              <div className="mt-3 bg-white rounded-lg border border-blue-100 p-3 space-y-3">
                <input
                  autoFocus
                  type="text"
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  placeholder="Search categories or services..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Categories */}
                {filteredPresetCats.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Categories ({filteredPresetCats.length})</div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {filteredPresetCats.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => applyCategoryPreset(c)}
                          className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-100 text-xs font-semibold text-gray-700 border border-gray-200"
                        >
                          {c.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Services */}
                {filteredPresetSvcs.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Services ({filteredPresetSvcs.length})</div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                      {filteredPresetSvcs.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => applyServicePreset(s)}
                          className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-700 border border-emerald-200"
                          title={s.basePrice ? `₹${s.basePrice}` : ""}
                        >
                          {s.title}{s.basePrice ? ` · ₹${s.basePrice}` : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {filteredPresetCats.length === 0 && filteredPresetSvcs.length === 0 && (
                  <div className="text-xs text-gray-500 text-center py-3">No matches</div>
                )}
                {onCreateCategory && (
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Not in the catalog yet?</span>
                    <button
                      type="button"
                      onClick={() => onCreateCategory()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <FiPlus className="w-3 h-3" /> Create new category / service
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {section.fields.map((f) => (
            <FieldRow
              key={f.name}
              field={f}
              form={form}
              setForm={setForm}
              categories={categories}
              services={services}
              uploading={uploading}
              setUploading={setUploading}
            />
          ))}

          {/* Nested cards editor (categorySections) */}
          {section.isNested && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-bold text-gray-900">Cards in this row</h4>
                  <p className="text-xs text-gray-500">Each card appears as one tile in the row.</p>
                </div>
                <button
                  type="button"
                  onClick={() => openCardEditor(null)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <FiPlus className="w-4 h-4" /> Add Card
                </button>
              </div>
              {(form.cards || []).length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-lg py-6 text-center">
                  No cards yet. Add at least one.
                </div>
              ) : (
                <div className="space-y-2">
                  {form.cards.map((card, idx) => (
                    <div key={card.id || idx} className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                      {card.imageUrl ? (
                        <img src={card.imageUrl} alt="" className="w-10 h-10 rounded object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 border flex items-center justify-center">
                          <FiImage className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{card.title || "(untitled)"}</div>
                        <div className="text-xs text-gray-500">
                          {card.price && `₹${card.price}`}
                          {card.rating && ` · ★ ${card.rating}`}
                        </div>
                      </div>
                      <button onClick={() => openCardEditor(idx)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Edit">
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeCard(idx)} className="p-1.5 rounded hover:bg-rose-50 text-rose-600" title="Delete">
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FiSave className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>

      {/* Nested card modal (card editor inside categorySections) */}
      {cardsEditing !== null && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">
                {cardsEditing === "new" ? "Add Card" : "Edit Card"}
              </h3>
              <button onClick={() => { setCardsEditing(null); setCardFormData(null); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <FiX className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {(section.cardFields || []).map((f) => (
                <FieldRow
                  key={f.name}
                  field={f}
                  form={cardFormData}
                  setForm={setCardFormData}
                  categories={categories}
                  services={services}
                  uploading={uploading}
                  setUploading={setUploading}
                />
              ))}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button onClick={saveCard} disabled={uploading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                Save Card
              </button>
              <button onClick={() => { setCardsEditing(null); setCardFormData(null); }} className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Quick-create modal: brand-new Category + Brand + Service in one shot.
// Writes directly to the catalog via existing admin endpoints.
// ────────────────────────────────────────────────────────────────────────────

const slugify = (s) => (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const QuickCreateCatalogModal = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState({
    categoryTitle: "",
    categorySlug: "",
    brandTitle: "",
    serviceTitle: "",
    servicePrice: "",
    serviceDuration: "60",
    iconUrl: "",
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) setForm({ categoryTitle: "", categorySlug: "", brandTitle: "", serviceTitle: "", servicePrice: "", serviceDuration: "60", iconUrl: "" });
  }, [open]);

  if (!open) return null;

  const upload = async (file) => {
    setUploading(true);
    try {
      const res = await serviceService.uploadImage(file, "categories", () => {});
      if (res?.success) {
        setForm((p) => ({ ...p, iconUrl: res.imageUrl }));
        toast.success("Image uploaded");
      } else toast.error(res?.message || "Upload failed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    const catTitle = form.categoryTitle.trim();
    if (!catTitle) { toast.error("Category title required"); return; }
    const catSlug = (form.categorySlug.trim() || slugify(catTitle));
    const brandTitle = (form.brandTitle || catTitle).trim();
    const brandSlug = slugify(brandTitle);
    const svcTitle = form.serviceTitle.trim();

    setBusy(true);
    try {
      // 1. Create category
      const catRes = await categoryService.create({
        title: catTitle,
        slug: catSlug,
        homeIconUrl: form.iconUrl,
        showOnHome: true,
        status: "active",
      });
      if (!catRes?.success) {
        toast.error(catRes?.message || "Failed to create category");
        setBusy(false);
        return;
      }
      const category = catRes.category;

      // 2. Create brand under it
      const brandRes = await brandService.create({
        title: brandTitle,
        slug: brandSlug,
        categoryIds: [category.id],
        categoryId: category.id,
        iconUrl: form.iconUrl,
        status: "active",
      });
      if (!brandRes?.success) {
        toast.error(brandRes?.message || "Category created but brand failed");
        onCreated?.({ category });
        onClose();
        setBusy(false);
        return;
      }
      const brand = brandRes.brand;

      // 3. Create service under brand (optional — only if title provided)
      let service = null;
      if (svcTitle) {
        const svcSlug = slugify(svcTitle);
        const svcRes = await serviceService.create({
          brandId: brand.id,
          title: svcTitle,
          slug: svcSlug,
          basePrice: form.servicePrice ? Number(form.servicePrice) : 0,
          duration: form.serviceDuration ? Number(form.serviceDuration) : 60,
          iconUrl: form.iconUrl,
          status: "active",
        });
        if (svcRes?.success) service = svcRes.service;
      }

      toast.success(`Created ${svcTitle ? "category + brand + service" : "category + brand"}`);
      onCreated?.({ category, brand, service });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Create New Category + Service</h3>
            <p className="text-xs text-gray-500 mt-0.5">Adds to Service Catalog immediately. Can be picked as preset after.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <FiX className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Icon */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Category Icon (optional)</label>
            <div className="flex items-start gap-3">
              {form.iconUrl ? (
                <div className="relative">
                  <img src={form.iconUrl} alt="" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                  <button type="button" onClick={() => setForm((p) => ({ ...p, iconUrl: "" }))} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow"><FiX className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
                  <FiImage className="w-6 h-6" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Category Title *</label>
              <input
                value={form.categoryTitle}
                onChange={(e) => setForm((p) => ({ ...p, categoryTitle: e.target.value, categorySlug: p.categorySlug || slugify(e.target.value) }))}
                placeholder="Pest Control"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">Slug</label>
              <input
                value={form.categorySlug}
                onChange={(e) => setForm((p) => ({ ...p, categorySlug: slugify(e.target.value) }))}
                placeholder="pest-control"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white font-mono"
              />
            </div>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Brand Title (defaults to category name)</label>
            <input
              value={form.brandTitle}
              onChange={(e) => setForm((p) => ({ ...p, brandTitle: e.target.value }))}
              placeholder="Pest Control Pro"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
            />
            <p className="text-[11px] text-gray-500 mt-1">A brand is required under every category. Leave blank to auto-create one with the category name.</p>
          </div>

          {/* Service (optional) */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm font-bold text-gray-900 mb-2">First service (optional)</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Service Title</label>
                <input
                  value={form.serviceTitle}
                  onChange={(e) => setForm((p) => ({ ...p, serviceTitle: e.target.value }))}
                  placeholder="Cockroach treatment"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  value={form.servicePrice}
                  onChange={(e) => setForm((p) => ({ ...p, servicePrice: e.target.value }))}
                  placeholder="999"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={form.serviceDuration}
                  onChange={(e) => setForm((p) => ({ ...p, serviceDuration: e.target.value }))}
                  placeholder="60"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">You can also create more services later in Service Catalog.</p>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={submit}
            disabled={busy || uploading}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FiPlus className="w-4 h-4" /> {busy ? "Creating..." : "Create"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────

const HomeSectionsManagerPage = ({ selectedCity }) => {
  const [activeKey, setActiveKey] = useState(SECTIONS[0].key);
  const [homeContent, setHomeContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // the item under edit or null for Add
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const activeSection = sectionByKey[activeKey];
  const items = (homeContent?.[activeKey] || []).slice();

  // Load homeContent + categories + services once
  const loadAll = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCity) params.cityId = selectedCity;
      const [hcRes, catRes, svcRes] = await Promise.all([
        homeContentService.get(params),
        categoryService.getAll({ status: "active", ...(selectedCity ? { cityId: selectedCity } : {}) }),
        serviceService.getAll({}),
      ]);
      if (hcRes?.success) setHomeContent(hcRes.homeContent);
      if (catRes?.success) setCategories(catRes.categories || []);
      if (svcRes?.success) setServices(svcRes.services || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selectedCity]);

  // Save: compose the full PUT payload (one field at a time to minimize risk)
  const sync = async (updates) => {
    setSaving(true);
    try {
      // Build payload only for the key being changed. Backend accepts partial updates.
      await homeContentService.update(updates, { cityId: selectedCity });
      toast.success("Saved");
      // Reload from server to get normalized ids
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    setEditingItem({ ...activeSection.defaultItem });
    setModalOpen(true);
  };

  const editItem = (item) => {
    setEditingItem({ ...activeSection.defaultItem, ...item });
    setModalOpen(true);
  };

  const saveItem = async (form) => {
    const currentList = (homeContent?.[activeKey] || []).slice();
    const payloadKey = activeKey === "promoCarousel" ? "promos"
      : activeKey === "noteworthy" ? "noteworthy"
      : activeKey === "booked" ? "booked"
      : activeKey === "spotlight" ? "spotlight"
      : activeKey === "curatedServices" ? "curated"
      : activeKey === "banners" ? "banners"
      : "categorySections";

    let newList;
    if (form.id) {
      newList = currentList.map((it) => (it.id === form.id || it._id === form.id ? { ...it, ...form } : it));
    } else {
      newList = [...currentList, { id: `${activeSection.idPrefix}-${Date.now()}`, order: currentList.length, ...form }];
    }
    await sync({ [payloadKey]: newList });
    setModalOpen(false);
    setEditingItem(null);
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.title || "this item"}"?`)) return;
    const currentList = (homeContent?.[activeKey] || []).slice();
    const newList = currentList.filter((it) => (it.id || it._id) !== (item.id || item._id));
    const payloadKey = activeKey === "promoCarousel" ? "promos"
      : activeKey === "noteworthy" ? "noteworthy"
      : activeKey === "booked" ? "booked"
      : activeKey === "spotlight" ? "spotlight"
      : activeKey === "curatedServices" ? "curated"
      : activeKey === "banners" ? "banners"
      : "categorySections";
    await sync({ [payloadKey]: newList });
  };

  const toggleVisibility = async () => {
    if (!activeSection.visibilityKey) return;
    const next = !(homeContent?.[activeSection.visibilityKey] ?? true);
    await sync({ [activeSection.visibilityKey]: next });
  };

  const sectionVisible = homeContent?.[activeSection.visibilityKey] ?? true;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Home Sections</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pick a section tab, then add / edit / delete the items the user sees in that row on the home screen.
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = s.key === activeKey;
          const count = (homeContent?.[s.key] || []).length;
          return (
            <button
              key={s.key}
              onClick={() => setActiveKey(s.key)}
              className={`shrink-0 px-4 py-2.5 rounded-xl border font-semibold text-sm flex items-center gap-2 transition ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600"
              }`}
              style={isActive ? {} : { color: s.tint }}
            >
              <Icon className="w-4 h-4" />
              <span>{s.label}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? "bg-white/20" : "bg-gray-100 text-gray-600"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active section card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{activeSection.label}</h2>
              <span className="text-xs text-gray-500">· {activeSection.tag}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {activeSection.visibilityKey && (
                <button
                  type="button"
                  onClick={toggleVisibility}
                  disabled={saving}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                    sectionVisible ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                  }`}
                  title="Click to toggle visibility on user homepage"
                >
                  {sectionVisible ? <FiEye className="w-3 h-3" /> : <FiEyeOff className="w-3 h-3" />}
                  {sectionVisible ? "Visible" : "Hidden"}
                </button>
              )}
              <span className="text-xs text-gray-500">{items.length} item{items.length === 1 ? "" : "s"}</span>
            </div>
          </div>
          <button
            onClick={addItem}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 shadow-sm shrink-0"
          >
            <FiPlus className="w-4 h-4" /> Add {activeSection.label}
          </button>
        </div>

        {/* Items table */}
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <activeSection.icon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="text-sm text-gray-500">No {activeSection.label.toLowerCase()} items yet.</div>
            <button onClick={addItem} className="mt-3 text-sm font-semibold text-blue-600 hover:underline">
              Add your first one →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  <th className="text-left py-3 px-5 text-xs font-bold text-gray-600 uppercase tracking-wider w-10">#</th>
                  {activeSection.columns.map((c) => (
                    <th key={c.label} className="text-left py-3 px-3 text-xs font-bold text-gray-600 uppercase tracking-wider">{c.label}</th>
                  ))}
                  <th className="text-right py-3 px-5 text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5 text-sm text-gray-500">{idx + 1}</td>
                    {activeSection.columns.map((c) => (
                      <td key={c.label} className="py-3 px-3 text-sm text-gray-700">
                        {c.render ? c.render(item) : (c.bold
                          ? <span className="font-semibold text-gray-900">{c.get(item) || "—"}</span>
                          : (c.get(item) || "—"))}
                      </td>
                    ))}
                    <td className="py-3 px-5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => editItem(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Edit">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteItem(item)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600" title="Delete">
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
      </div>

      {/* Add/Edit Modal */}
      <ItemModal
        open={modalOpen}
        section={activeSection}
        initialForm={editingItem || activeSection.defaultItem}
        onClose={() => { setModalOpen(false); setEditingItem(null); }}
        onSave={saveItem}
        categories={categories}
        services={services}
        saving={saving}
        onCreateCategory={() => setQuickCreateOpen(true)}
      />

      {/* Quick-create Category + Brand + Service */}
      <QuickCreateCatalogModal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onCreated={async ({ category, brand, service }) => {
          // Refresh presets so the new entry is immediately pickable
          try {
            const [catRes, svcRes] = await Promise.all([
              categoryService.getAll({ status: "active", ...(selectedCity ? { cityId: selectedCity } : {}) }),
              serviceService.getAll({}),
            ]);
            if (catRes?.success) setCategories(catRes.categories || []);
            if (svcRes?.success) setServices(svcRes.services || []);
          } catch { /* ignore */ }
          // Autofill the open item modal with the newly-created category/service
          if (modalOpen && category) {
            setEditingItem((prev) => ({
              ...prev,
              title: service?.title || category.title,
              imageUrl: service?.iconUrl || category.homeIconUrl || prev?.imageUrl || "",
              gifUrl: activeSection.key === "curatedServices" ? (service?.iconUrl || category.homeIconUrl || "") : (prev?.gifUrl || ""),
              targetCategoryId: category.id,
              targetServiceId: service?.id || "",
              slug: category.slug,
              price: service?.basePrice ? String(service.basePrice) : (prev?.price || ""),
            }));
          }
        }}
      />
    </div>
  );
};

export default HomeSectionsManagerPage;
