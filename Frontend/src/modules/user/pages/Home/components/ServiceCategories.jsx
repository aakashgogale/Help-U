import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicCatalogService } from '../../../../../services/catalogService';
import CategoryTile from '../../../components/common/CategoryTile';
import { getRootCategories, readStoredCoords, toAssetUrl } from '../../../utils/categoryTree';
import scrapBoxImg from '../../../../../assets/images/pages/Home/Scrap/scrap-box.webp';

// Fallbacks only; the admin sets these in Home page > Home Categories
const DEFAULT_TILE_COUNT = 8;
const DEFAULT_ALL_LABEL = 'All services';

const AllServicesTile = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col items-center text-center w-full focus:outline-none group cursor-pointer"
  >
    <div className="relative w-full aspect-square rounded-[18px] sm:rounded-[20px] bg-gradient-to-b from-[#FAFBFD] to-[#F1F3F6] hover:from-[#F4F6F9] hover:to-[#EAECEF] overflow-hidden flex items-center justify-center p-2.5 transition-all duration-200 active:scale-[0.96] group shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-gray-100/90 hover:border-gray-200/90">
      <img
        src="/categories/all-services.svg?v=4"
        alt={label}
        className="w-[44%] h-[44%] object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
        loading="lazy"
        decoding="async"
      />
    </div>
    <div className="min-h-[28px] sm:min-h-[32px] flex items-start justify-center w-full mt-1.5 px-0.5">
      <span className="text-[11.5px] sm:text-[12.5px] font-semibold text-[#1F2937] leading-[1.2] text-center line-clamp-2">
        {label}
      </span>
    </div>
  </button>
);

const ServiceCategories = React.memo(({
  categories = [],
  onCategoryClick,
  limit = DEFAULT_TILE_COUNT,
  showAllServices = true,
  allServicesLabel = DEFAULT_ALL_LABEL,
  showScrapTile = false
}) => {
  const navigate = useNavigate();
  const [etaMap, setEtaMap] = useState({});

  // The Scrap tile takes the last of the category slots, so the grid keeps the same number of tiles
  const slots = Math.max(1, Number(limit) || DEFAULT_TILE_COUNT);
  const tiles = useMemo(
    () => getRootCategories(categories).slice(0, showScrapTile ? Math.max(1, slots - 1) : slots),
    [categories, slots, showScrapTile]
  );

  // Live per-category arrival time once we know the user's coordinates
  useEffect(() => {
    const coords = readStoredCoords();
    if (!coords) return undefined;
    let cancelled = false;
    publicCatalogService
      .getCategoriesEta({ lat: coords.lat, lng: coords.lng })
      .then((res) => {
        if (!cancelled && res?.eta) setEtaMap(res.eta);
      })
      .catch(() => { /* badges stay hidden on failure */ });
    return () => {
      cancelled = true;
    };
  }, [categories?.length]);

  return (
    <div className="px-4 sm:px-5 pt-0.5 pb-1">
      <div className="grid grid-cols-3 lg:grid-cols-9 gap-x-2.5 sm:gap-x-3 gap-y-3 sm:gap-y-3.5">
        {tiles.map((cat) => {
          const id = String(cat.id || cat._id);
          const icon = toAssetUrl(cat.homeIconUrl || cat.icon || cat.imageUrl);
          return (
            <CategoryTile
              key={id}
              title={cat.title}
              icon={icon}
              etaMinutes={etaMap[id] || cat.etaDefaultMinutes || cat.etaMinutes}
              isAvatar={/salon.*\.png/i.test(icon)}
              onClick={() => onCategoryClick?.(cat)}
            />
          );
        })}
        {showScrapTile && (
          <CategoryTile title="Sell Scrap" icon={scrapBoxImg} onClick={() => navigate('/user/scrap')} />
        )}
        {showAllServices && (
          <AllServicesTile label={allServicesLabel || DEFAULT_ALL_LABEL} onClick={() => navigate('/user/services')} />
        )}
      </div>
    </div>
  );
});

ServiceCategories.displayName = 'ServiceCategories';

export default ServiceCategories;
