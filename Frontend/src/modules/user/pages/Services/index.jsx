import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { publicCatalogService } from '../../../../services/catalogService';
import PageHeader from '../../components/layout/PageHeader';
import CategoryTile from '../../components/common/CategoryTile';
import { buildCategorySections, readStoredCoords, toAssetUrl } from '../../utils/categoryTree';

/**
 * /user/services - every visible category grouped under its parent, straight from
 * the admin's category data (order, icons, ETA). Has its own URL so back, refresh
 * and shared links work.
 */
const ServicesPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [etaMap, setEtaMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    publicCatalogService
      .getCategories({ parentId: 'all' })
      .then((res) => {
        if (!cancelled && Array.isArray(res?.categories)) setCategories(res.categories);
      })
      .catch(() => { /* empty state below */ })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const coords = readStoredCoords();
    if (coords) {
      publicCatalogService
        .getCategoriesEta({ lat: coords.lat, lng: coords.lng })
        .then((res) => {
          if (!cancelled && res?.eta) setEtaMap(res.eta);
        })
        .catch(() => { /* badges stay hidden */ });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(() => buildCategorySections(categories), [categories]);

  const openCategory = (cat) => {
    const target = cat?.slug || cat?.id || cat?._id;
    if (!target) return;
    // history state must be structured-cloneable, so pass plain data only
    navigate(`/user/category/${encodeURIComponent(target)}`, { state: { category: JSON.parse(JSON.stringify(cat)) } });
  };

  return (
    <div className="min-h-screen bg-white pb-[max(1.5rem,var(--safe-bottom))]">
      <PageHeader title="All services" onBack={() => navigate('/user')} />

      <div className="max-w-2xl mx-auto px-5 py-5 space-y-7">
        {!loading && sections.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-16">No services available right now.</p>
        )}

        {sections.map((section, idx) => (
          <section key={section.id} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[19px] font-bold text-[#111827] tracking-tight">{section.title}</h2>
              {section.hasChildren && (
                <button
                  type="button"
                  onClick={() => openCategory(section.root)}
                  className="flex items-center gap-0.5 text-[13px] font-semibold text-accent cursor-pointer"
                >
                  View all <FiChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {section.items.map((cat) => {
                const id = String(cat.id || cat._id);
                return (
                  <CategoryTile
                    key={id}
                    title={cat.title}
                    icon={toAssetUrl(cat.homeIconUrl || cat.icon || cat.imageUrl)}
                    etaMinutes={etaMap[id] || cat.etaDefaultMinutes}
                    onClick={() => openCategory(cat)}
                  />
                );
              })}
            </div>

            {idx < sections.length - 1 && <div className="border-b border-gray-100/90 pt-3" />}
          </section>
        ))}
      </div>
    </div>
  );
};

export default ServicesPage;
