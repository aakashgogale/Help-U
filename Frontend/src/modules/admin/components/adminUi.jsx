import React from 'react';

/**
 * Small building blocks shared by the booking-feature admin pages, styled to
 * match the existing Customization and Settings pages.
 */

export const PageHeader = ({ icon: Icon, title, description, actions }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        {Icon && <Icon className="text-gray-600" />}
        {title}
      </h1>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Card = ({ title, icon: Icon, children, className = '', right }) => (
  <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
    {(title || right) && (
      <div className="mb-4 flex items-center justify-between gap-3">
        {title && (
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {Icon && <Icon className="h-4 w-4" />}
            {title}
          </h2>
        )}
        {right}
      </div>
    )}
    {children}
  </div>
);

export const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
      ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      ${checked ? 'bg-green-500 focus:ring-green-400' : 'bg-gray-300 focus:ring-gray-400'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

export const Field = ({ label, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="text-xs font-semibold text-gray-700">{label}</span>
    <div className="mt-1">{children}</div>
    {hint && <span className="mt-1 block text-[11px] leading-snug text-gray-500">{hint}</span>}
  </label>
);

export const Button = ({ variant = 'primary', className = '', ...props }) => {
  const styles = {
    primary: 'bg-[#163B66] text-white hover:bg-[#0F2B48]',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100'
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
};

export const StatusPill = ({ children, className = 'bg-gray-100 text-gray-700' }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>
);

export const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="py-14 text-center">
    {Icon && <Icon className="mx-auto mb-3 h-10 w-10 text-gray-300" />}
    <p className="font-medium text-gray-700">{title}</p>
    {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
  </div>
);

export const Pagination = ({ page, pages, onChange }) => {
  if (!pages || pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <span className="text-gray-600">Page {page} of {pages}</span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
    </div>
  );
};
