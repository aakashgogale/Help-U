import React from 'react';
import LogoLoader from '../../../../components/common/LogoLoader';

const Block = ({ className = '' }) => <div className={`bg-gray-200/70 animate-pulse ${className}`} />;

/** Loading placeholder that mirrors the worker dashboard (header, welcome card, stats). */
const DashboardSkeleton = () => (
  <div className="relative h-full min-h-full w-full" aria-busy="true" aria-label="Loading">
    {/* Header */}
    <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-gray-100">
      <Block className="h-11 w-28 rounded-xl" />
      <Block className="h-11 w-11 rounded-full" />
    </div>

    <div className="px-4 pt-4 space-y-4">
      {/* Welcome card */}
      <Block className="h-32 w-full rounded-3xl" />

      {/* Earnings */}
      <div className="grid grid-cols-2 gap-3">
        <Block className="h-28 rounded-2xl" />
        <Block className="h-28 rounded-2xl" />
      </div>

      {/* Rating / completed / pending */}
      <div className="grid grid-cols-3 gap-3">
        <Block className="h-24 rounded-2xl" />
        <Block className="h-24 rounded-2xl" />
        <Block className="h-24 rounded-2xl" />
      </div>

      {/* Performance */}
      <Block className="h-5 w-32 rounded" />
      <div className="grid grid-cols-2 gap-3">
        <Block className="h-36 rounded-2xl" />
        <Block className="h-36 rounded-2xl" />
      </div>
    </div>

    {/* Animated logo, centred over the placeholder */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <LogoLoader inline size="w-20 h-20" />
    </div>
  </div>
);

export default DashboardSkeleton;
