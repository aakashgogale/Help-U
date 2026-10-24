import React from 'react';
import LogoLoader from '../../../../../components/common/LogoLoader';

const Block = ({ className = '' }) => <div className={`bg-gray-200/70 animate-pulse ${className}`} />;

/**
 * Loading placeholder that mirrors the Home layout (header, search, banner, category grid,
 * a content row) so the screen looks like the app while the page and its data load.
 */
const HomeSkeleton = () => (
  <div className="relative h-full min-h-full w-full" aria-busy="true" aria-label="Loading">
    {/* Header: logo, location pill, bell */}
    <div className="px-4 pt-3 flex items-center justify-between gap-3">
      <Block className="h-14 w-28 rounded-xl" />
      <div className="flex items-center gap-2 flex-1 justify-end">
        <Block className="h-9 w-40 rounded-full" />
        <Block className="h-11 w-11 rounded-full" />
      </div>
    </div>

    {/* Search */}
    <div className="px-4 pt-2 pb-3">
      <Block className="h-11 w-full rounded-full" />
    </div>

    {/* Banner */}
    <div className="px-4">
      <Block className="w-full aspect-[16/7] rounded-3xl" />
    </div>

    {/* Category grid */}
    <div className="px-4 pt-5 grid grid-cols-3 gap-x-2.5 gap-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <Block className="w-full aspect-[1/0.92] rounded-[18px]" />
          <Block className="h-3 w-4/5 rounded" />
        </div>
      ))}
    </div>

    {/* Content row */}
    <div className="px-4 pt-6">
      <Block className="h-5 w-44 rounded mb-3" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Block key={i} className="h-32 w-40 shrink-0 rounded-2xl" />
        ))}
      </div>
    </div>

    {/* Animated logo, centred over the placeholder */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <LogoLoader inline size="w-20 h-20" />
    </div>
  </div>
);

export default HomeSkeleton;
