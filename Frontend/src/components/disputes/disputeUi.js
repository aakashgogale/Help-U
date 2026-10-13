// Labels and badge colours for dispute statuses, shared by every dispute screen.

export const DISPUTE_STATUS_META = {
  open: { label: 'Open', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  under_review: { label: 'Under review', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  awaiting_response: { label: 'Awaiting your reply', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  resolved: { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Closed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600 border-gray-200' }
};

export const ACTIVE_DISPUTE_STATUSES = ['open', 'under_review', 'awaiting_response'];

export const disputeStatusMeta = (status) =>
  DISPUTE_STATUS_META[status] || { label: status || 'Unknown', className: 'bg-gray-100 text-gray-600 border-gray-200' };

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

// Evidence picker items: [{ status: 'uploading' | 'done' | 'error', url }]
export const uploadedUrls = (items) => items.filter((p) => p.status === 'done' && p.url).map((p) => p.url);
export const isUploading = (items) => items.some((p) => p.status === 'uploading');
