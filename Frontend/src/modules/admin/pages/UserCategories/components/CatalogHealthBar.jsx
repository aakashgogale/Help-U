import React from "react";
import { FiBox, FiCheckCircle, FiFileText, FiAlertTriangle } from "react-icons/fi";

/**
 * CatalogHealthBar
 * Displays the 4 catalog metric stat cards fed from GET /api/admin/catalog/health.
 * Clicking a card toggles filtering on the service list.
 */
const CatalogHealthBar = ({
  health = {},
  activeFilter = null,
  onFilterChange = () => {},
  loading = false,
}) => {
  const totals = health.totals || {
    totalServices: health.totalServices || 0,
    activeServices: health.activeServices || 0,
    draftServices: health.draftServices || 0,
    needsAttentionServices: health.needsAttentionServices || (health.needsAttention?.length || 0),
  };

  const cards = [
    {
      id: "all",
      label: "Total Services",
      value: totals.totalServices || 0,
      icon: FiBox,
      color: "text-blue-600 bg-blue-50 border-blue-200 hover:border-blue-400",
      activeRing: "ring-2 ring-blue-500 border-blue-500",
      active: activeFilter === null || activeFilter === "all",
    },
    {
      id: "active",
      label: "Active Services",
      value: totals.activeServices || 0,
      icon: FiCheckCircle,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200 hover:border-emerald-400",
      activeRing: "ring-2 ring-emerald-500 border-emerald-500",
      active: activeFilter === "active",
    },
    {
      id: "draft",
      label: "Drafts",
      value: totals.draftServices || 0,
      icon: FiFileText,
      color: "text-amber-600 bg-amber-50 border-amber-200 hover:border-amber-400",
      activeRing: "ring-2 ring-amber-500 border-amber-500",
      active: activeFilter === "draft",
    },
    {
      id: "needs-attention",
      label: "Needs Attention",
      value: totals.needsAttentionServices || 0,
      icon: FiAlertTriangle,
      color: "text-rose-600 bg-rose-50 border-rose-200 hover:border-rose-400",
      activeRing: "ring-2 ring-rose-500 border-rose-500",
      active: activeFilter === "needs-attention",
      hasAlert: totals.needsAttentionServices > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onFilterChange(card.active && card.id !== "all" ? "all" : card.id)}
            className={`text-left p-4 rounded-xl border bg-white shadow-sm transition-all duration-150 cursor-pointer ${
              card.active ? card.activeRing : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {loading ? "..." : card.value}
              </span>
              {card.hasAlert && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 animate-pulse">
                  Action required
                </span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-gray-400">
              {card.id === "needs-attention"
                ? "Click to filter broken/unmapped rows"
                : card.id === "draft"
                ? "Click to filter draft services"
                : card.id === "active"
                ? "Click to filter active services"
                : "Click to show all services"}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default CatalogHealthBar;
