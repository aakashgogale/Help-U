import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useCity } from '../../../../context/CityContext';
import { useZone } from '../../../../context/ZoneContext';
import { publicCatalogService } from '../../../../services/catalogService';
import LogoLoader from '../../../../components/common/LogoLoader';
import ServiceCatalogModal from '../Home/components/ServiceCatalogModal';

/**
 * /user/category/:idOrSlug
 *
 * Gives every category (and sub-category) its own URL so back, refresh and shared
 * links work. The category object normally arrives via navigation state; on a
 * refresh or a direct link it is resolved from the public category list instead.
 */
const CategoryPage = () => {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCity } = useCity();
  const { zoneId } = useZone();

  const stateCategory = location.state?.category;
  const [resolved, setResolved] = useState(null);
  const category = stateCategory || resolved;

  useEffect(() => {
    if (stateCategory) return undefined;
    let cancelled = false;
    const key = String(idOrSlug).toLowerCase();
    publicCatalogService
      .getCategories({ parentId: 'all' })
      .then((res) => {
        if (cancelled) return;
        const found = (res?.categories || []).find(
          (c) => (c.slug || '').toLowerCase() === key || c.id === idOrSlug || c._id === idOrSlug
        );
        // The catalog endpoint accepts an id or slug, so an unknown one still loads
        setResolved(found || { id: idOrSlug, slug: idOrSlug });
      })
      .catch(() => {
        if (!cancelled) setResolved({ id: idOrSlug, slug: idOrSlug });
      });
    return () => {
      cancelled = true;
    };
  }, [idOrSlug, stateCategory]);

  const handleClose = () => {
    // Back to wherever the user came from; a direct link has nothing to go back to
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/user', { replace: true });
  };

  if (!category) return <LogoLoader fullScreen overlay />;

  return (
    <ServiceCatalogModal
      asPage
      isOpen
      onClose={handleClose}
      category={category}
      location={localStorage.getItem('currentAddress') || ''}
      currentCity={currentCity}
      zoneId={zoneId}
    />
  );
};

export default CategoryPage;
