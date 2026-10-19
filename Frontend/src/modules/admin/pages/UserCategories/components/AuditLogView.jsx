import React, { useEffect, useState, useMemo } from "react";
import {
  FiClock,
  FiUser,
  FiTag,
  FiActivity,
  FiRefreshCw,
  FiFilter,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiFileText,
  FiAlertCircle,
  FiX
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { auditLogService } from "../../../../../services/catalogService";
import Modal from "./Modal";

/**
 * AuditLogView
 * Displays catalog audit log events with filters, diff inspection modal, and pagination.
 */
const AuditLogView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(20);

  // Filters
  const [entityType, setEntityType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLogForDiff, setSelectedLogForDiff] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit,
      };
      if (entityType !== "all") params.entityType = entityType;

      const res = await auditLogService.getLogs(params);
      if (res?.success) {
        setLogs(res.logs || []);
        setTotalPages(res.pagination?.pages || 1);
        setTotalCount(res.pagination?.total || (res.logs || []).length);
      } else {
        setLogs([]);
        setError(res?.message || "Failed to fetch audit logs");
      }
    } catch (err) {
      console.error("Audit log fetch error:", err);
      setError(err?.response?.data?.message || err.message || "Failed to load audit logs");
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, entityType]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const q = searchTerm.toLowerCase();
    return logs.filter((log) => {
      const matchAction = (log.action || "").toLowerCase().includes(q);
      const matchEntity = (log.entityType || "").toLowerCase().includes(q);
      const matchId = String(log.entityId || "").toLowerCase().includes(q);
      const matchAdmin = (log.adminName || log.adminEmail || log.adminId || "").toLowerCase().includes(q);
      return matchAction || matchEntity || matchId || matchAdmin;
    });
  }, [logs, searchTerm]);

  const getActionBadgeColor = (action = "") => {
    const act = action.toUpperCase();
    if (act.includes("CREATE")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (act.includes("UPDATE")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (act.includes("DELETE")) return "bg-rose-100 text-rose-800 border-rose-200";
    if (act.includes("ARCHIVE")) return "bg-amber-100 text-amber-800 border-amber-200";
    if (act.includes("RESTORE")) return "bg-teal-100 text-teal-800 border-teal-200";
    if (act.includes("BULK")) return "bg-purple-100 text-purple-800 border-purple-200";
    if (act.includes("REORDER")) return "bg-indigo-100 text-indigo-800 border-indigo-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return String(dateString);
    }
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400 w-4 h-4" />
            <span className="text-xs font-semibold text-gray-600 uppercase">Entity:</span>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Entities</option>
              <option value="service">Services</option>
              <option value="category">Categories</option>
              <option value="brand">Sections & Brands</option>
              <option value="variant">Variants</option>
            </select>
          </div>

          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Filter by admin, action, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 pl-8 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <FiActivity className="absolute left-2.5 top-2 text-gray-400 w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <span className="text-xs text-gray-500">
            Total logs: <strong>{totalCount}</strong>
          </span>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between gap-4 py-3 border-b border-gray-100">
                <div className="w-1/4 h-4 bg-gray-200 rounded" />
                <div className="w-1/4 h-4 bg-gray-200 rounded" />
                <div className="w-1/4 h-4 bg-gray-200 rounded" />
                <div className="w-16 h-6 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <FiAlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-800">Error loading audit logs</h3>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
            <button
              onClick={fetchLogs}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <FiFileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-700">No audit logs found</h3>
            <p className="text-xs text-gray-400 mt-1">
              Actions taken on catalog entities will be permanently recorded here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredLogs.map((log) => {
                  const logId = log.id || log._id;
                  return (
                    <tr key={logId} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-gray-500 font-mono flex items-center gap-1.5">
                        <FiClock className="w-3.5 h-3.5 text-gray-400" />
                        {formatTimestamp(log.createdAt || log.timestamp)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-900 capitalize">
                        {log.entityType || "catalog"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-gray-500">
                        {log.entityId ? String(log.entityId).slice(0, 14) + "..." : "—"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <FiUser className="w-3.5 h-3.5 text-gray-400" />
                          <span>{log.adminName || log.adminEmail || log.adminId || "System Admin"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLogForDiff(log)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          View Diff
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <FiChevronLeft /> Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                Next <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Diff Inspection Modal */}
      {selectedLogForDiff && (
        <Modal
          isOpen={!!selectedLogForDiff}
          onClose={() => setSelectedLogForDiff(null)}
          title={`Audit Event: ${selectedLogForDiff.action} on ${selectedLogForDiff.entityType}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-400 block font-semibold uppercase">Action</span>
                <span className="font-bold text-gray-800">{selectedLogForDiff.action}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold uppercase">Entity Type</span>
                <span className="font-bold text-gray-800 capitalize">{selectedLogForDiff.entityType}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold uppercase">Admin</span>
                <span className="font-bold text-gray-800">
                  {selectedLogForDiff.adminName || selectedLogForDiff.adminEmail || "Admin"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold uppercase">Time</span>
                <span className="font-bold text-gray-800">
                  {formatTimestamp(selectedLogForDiff.createdAt || selectedLogForDiff.timestamp)}
                </span>
              </div>
            </div>

            {/* Changed Fields / Diff */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Payload / Change Snapshot
              </h4>
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-96">
                <pre>
                  {JSON.stringify(
                    selectedLogForDiff.diff ||
                      selectedLogForDiff.changes ||
                      selectedLogForDiff.meta ||
                      selectedLogForDiff.details ||
                      selectedLogForDiff,
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogForDiff(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLogView;
