import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { FiArrowLeft, FiChevronRight } from 'react-icons/fi';
import { useCity } from '../../../../context/CityContext';
import { useZone } from '../../../../context/ZoneContext';
import { publicCatalogService } from '../../../../services/catalogService';
import LogoLoader from '../../../../components/common/LogoLoader';
import ServiceWithRatingCard from '../../components/common/ServiceWithRatingCard';
import { toAssetUrl } from '../../utils/categoryTree';
import { NoteworthyCard } from '../Home/components/NewAndNoteworthy';
import { BookedServiceCard } from '../Home/components/MostBookedServices';
import { ApplianceServiceCard } from '../Home/components/ApplianceRepairSection';

// Same card the row uses, so a service looks identical in the row and in "See all"
const ROW_CARDS = {
  noteworthy: NoteworthyCard,
  booked: BookedServiceCard,
  appliance: ApplianceServiceCard,
};

const slugify = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const titleKey = (service) => String(service?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// A service from the category catalog, shaped like a home row card
const toCard = (service, category) => {
  const price = Number(service.basePrice ?? service.price ?? service.amount);
  const originalPrice = service.originalPrice ? Number(service.originalPrice) : null;
  const rating = service.displayRating || service.rating;
  const options = Array.isArray(service.variants) ? service.variants.length : 0;
  return {
    id: service._id || service.id,
    title: service.title || service.name,
    rating: rating ? String(rating) : '',
    reviews: service.reviewsLabel || (service.reviewsCount ? `${service.reviewsCount} reviews` : ''),
    price: price > 0 ? String(price) : '',
    originalPrice: originalPrice && originalPrice > price ? String(originalPrice) : '',
    discount: service.discountLabel || '',
    optionsCount: options > 1 ? String(options) : '',
    image: toAssetUrl(service.images?.[0] || service.iconUrl || service.icon),
    resolvedCategory: category,
    opensCategory: true,
  };
};

/**
 * /user/see-all/:sectionKey
 *
 * Full list behind a home row's "See all". The row only carries the cards the admin
 * picked, so the services of the row's category are loaded and added after them.
 * The section normally arrives via navigation state; on a refresh or a direct link
 * it is rebuilt from the admin's home sections.
 */
const SeeAllPage = () => {
  const { sectionKey } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCity } = useCity();
  const { zoneId } = useZone();

  const [fallbackSection, setFallbackSection] = useState(null);
  const section = location.state?.section || fallbackSection;
  const [extraServices, setExtraServices] = useState([]);

  const goBack = () => {
    // Back to wherever the user came from; a direct link has nothing to go back to
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/user', { replace: true });
  };

  const openCategory = (category) => {
    const target = category?.slug || category?.id || category?._id;
    if (!target) return;
    navigate(`/user/category/${encodeURIComponent(target)}`, { state: { category } });
  };

  // Refresh / shared link: rebuild the section from the admin's home content
  useEffect(() => {
    if (location.state?.section) return undefined;
    let cancelled = false;
    const cityId = currentCity?._id || currentCity?.id;
    publicCatalogService
      .getHomeData(cityId, zoneId)
      .then((res) => {
        if (cancelled) return;
        const found = (res?.homeContent?.categorySections || []).find((s) => slugify(s.title) === sectionKey);
        if (!found) {
          navigate('/user', { replace: true });
          return;
        }
        const categories = res.allCategories || res.categories || [];
        const linked = categories.find((c) => (c.id || c._id) === found.seeAllTargetCategoryId);
        setFallbackSection({
          title: found.title,
          subtitle: found.subtitle,
          services: (found.cards || []).map((card, i) => ({
            id: card._id || i,
            title: card.title,
            rating: card.rating || '',
            reviews: card.reviews || '10k+',
            price: card.price,
            originalPrice: card.originalPrice,
            discount: card.discount,
            optionsCount: card.optionsCount,
            image: toAssetUrl(card.imageUrl),
            slug: card.slug,
            targetCategoryId: card.targetCategoryId,
          })),
          category: linked ? { id: linked.id || linked._id, slug: linked.slug, title: linked.title } : null,
        });
      })
      .catch(() => {
        if (!cancelled) navigate('/user', { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [sectionKey, location.state?.section, currentCity, zoneId, navigate]);

  // Every service of the row's category, not just the curated cards
  const category = section?.category;
  const categoryTarget = category?.slug || category?.id;
  useEffect(() => {
    if (!categoryTarget) return undefined;
    let cancelled = false;
    const cityId = currentCity?._id || currentCity?.id;
    publicCatalogService
      .getCatalog(categoryTarget, cityId, zoneId)
      .then((res) => {
        if (cancelled || !res?.success) return;
        setExtraServices((res.sections || []).flatMap((s) => s.services || []).map((svc) => toCard(svc, category)));
      })
      .catch(() => { /* the curated cards are still shown */ });
    return () => {
      cancelled = true;
    };
  }, [categoryTarget, category, currentCity, zoneId]);

  const services = useMemo(() => {
    const curated = section?.services || [];
    const seen = new Set(curated.map(titleKey));
    const extras = extraServices.filter((svc) => {
      const key = titleKey(svc);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...curated, ...extras];
  }, [section?.services, extraServices]);

  const handleServiceClick = (service) => {
    const cat = service.resolvedCategory;
    if (!cat) {
      // No category matched: let the catalog resolve the card by its own slug / id
      openCategory({ id: service.id, title: service.title, slug: service.slug || slugify(service.title), image: service.image });
      return;
    }
    // Catalog services open their category as is; curated cards open it under their own name
    if (service.opensCategory) openCategory(cat);
    else openCategory({ ...cat, title: service.title || cat.title, slug: service.slug || cat.slug, image: service.image || cat.image });
  };

  if (!section) return <LogoLoader fullScreen overlay />;

  const { title, subtitle, variant } = section;
  const RowCard = ROW_CARDS[variant];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3 px-4 h-14">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center text-[#111827] hover:bg-gray-100 active:scale-95 transition-all"
          >
            <FiArrowLeft className="w-[22px] h-[22px]" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[17px] font-bold text-[#111827] leading-tight truncate">{title}</h1>
            <p className="text-[12px] text-[#6B7280] leading-tight mt-0.5">
              {services.length} {services.length === 1 ? 'service' : 'services'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 pt-4 pb-10">
        {subtitle && <p className="text-[13px] text-[#6B7280] mb-4">{subtitle}</p>}

        {/* All services of the section */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3.5 gap-y-6 sm:gap-x-5 *:w-full! *:min-w-0">
          {services.map((service, index) => (
            RowCard ? (
              <RowCard
                key={service.id || service._id || index}
                service={service}
                onServiceClick={handleServiceClick}
                onAddClick={handleServiceClick}
              />
            ) : (
              <ServiceWithRatingCard
                key={service.id || service._id || index}
                title={service.title}
                rating={service.rating}
                reviews={service.reviews}
                price={service.price}
                originalPrice={service.originalPrice}
                discount={service.discount}
                optionsCount={service.optionsCount}
                image={service.image}
                fallbackImage={service.fallbackImage}
                onClick={() => handleServiceClick(service)}
                onAddClick={() => handleServiceClick(service)}
              />
            )
          ))}
        </div>

        {/* Full catalogue of the related category */}
        {category && (
          <button
            type="button"
            onClick={() => openCategory(category)}
            className="mt-8 w-full flex items-center justify-between gap-3 rounded-2xl border border-[#E3E3E3] px-4 py-3.5 text-left hover:border-[#6E42E5]/40 hover:bg-[#F9F7FD] active:scale-[0.99] transition-all"
          >
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-[#111827]">Explore all {category.title} services</span>
              <span className="block text-[12px] text-[#6B7280] mt-0.5">Browse brands and every service in this category</span>
            </span>
            <FiChevronRight className="w-5 h-5 text-[#6E42E5] shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SeeAllPage;
