import React, { useState } from 'react';
import { FiChevronRight, FiGrid } from 'react-icons/fi';
import CategoryCard from '../../../components/common/CategoryCard';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

// Soft pastel circles, cycled per category
const ICON_BACKGROUNDS = ['#E4EEFB', '#EEEAFB', '#E2F5EE', '#FFF4D6', '#FDE8E8', '#DDF3F1', '#FDECDF'];
const MORE_BG = '#EEF1F4';

// 2 rows of 4 on mobile: 7 categories + "More"
const COLLAPSED_COUNT = 7;

const ServiceCategories = React.memo(({ categories, onCategoryClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!Array.isArray(categories) || categories.length === 0) {
    return null;
  }

  const canCollapse = categories.length > COLLAPSED_COUNT + 1;
  const displayCategories = canCollapse && !isExpanded ? categories.slice(0, COLLAPSED_COUNT) : categories;

  return (
    <div className="px-4 sm:px-5">
      {/* Section Header */}
      <div className="flex items-end justify-between mb-5">
        <div className="flex flex-col min-w-0">
          <h2 className="text-[22px] sm:text-2xl font-extrabold text-ink tracking-tight leading-tight">
            Service Categories
          </h2>
          <p className="text-[14px] sm:text-[15px] text-gray-500 font-semibold mt-0.5">Premium Home Services</p>
        </div>
        {canCollapse && (
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="flex items-center gap-0.5 text-[15px] font-semibold text-accent shrink-0 pb-1 hover:text-accent-dark transition-colors"
          >
            {isExpanded ? 'View Less' : 'View All'}
            <FiChevronRight className={`w-[18px] h-[18px] transition-transform duration-300 ${isExpanded ? '-rotate-90' : ''}`} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-6 gap-x-2 sm:gap-x-4">
        {displayCategories.map((category, index) => {
          const iconSrc = toAssetUrl(category.icon || category.image);
          return (
            <div key={category.id || index} className="flex justify-center">
              <CategoryCard
                title={category.title}
                iconBg={ICON_BACKGROUNDS[index % ICON_BACKGROUNDS.length]}
                icon={
                  iconSrc ? (
                    <img
                      src={iconSrc}
                      alt={category.title}
                      className="w-[82%] h-[82%] object-contain transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null
                }
                onClick={() => onCategoryClick?.(category)}
                hasSaleBadge={category.hasSaleBadge}
                index={index}
              />
            </div>
          );
        })}

        {/* More button */}
        {canCollapse && !isExpanded && (
          <div className="flex justify-center">
            <CategoryCard
              title="More"
              iconBg={MORE_BG}
              icon={<FiGrid className="w-7 h-7 sm:w-8 sm:h-8 text-ink" strokeWidth={1.75} />}
              onClick={() => setIsExpanded(true)}
              index={COLLAPSED_COUNT}
            />
          </div>
        )}
      </div>
    </div>
  );
});

ServiceCategories.displayName = 'ServiceCategories';

export default ServiceCategories;
