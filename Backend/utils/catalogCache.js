/**
 * Catalog cache invalidation helpers.
 *
 * Any admin write to Category / Brand / UserService / HomeContent must call
 * one of the functions below so stale copies in Redis (and the frontend
 * apiCache behind VITE's revalidation) do not keep serving the pre-change
 * payload to users.
 *
 * The frontend's apiCache already uses the key prefix `public:` for
 * categories, services, brands, home content and the (Phase-4) catalog
 * endpoint. Keeping the server-side invalidation prefix identical means a
 * single pattern-delete clears both the backend Redis mirror and anything a
 * future server-side cache layer stores under the same keys.
 *
 * All helpers are no-ops when Redis is disabled or disconnected, so the
 * admin write path never fails because of a cache miss.
 */

const { getRedis, isRedisConnected } = require('../services/redisService');

const log = (...args) => console.log('[CatalogCache]', ...args);

/**
 * Delete every key under one or more Redis key patterns. Uses SCAN + DEL in
 * small batches so we never block the Redis event loop on large keyspaces.
 */
const deleteKeyPatterns = async (patterns) => {
  if (!isRedisConnected()) return { deleted: 0, skipped: true };
  const redis = getRedis();
  if (!redis) return { deleted: 0, skipped: true };

  let totalDeleted = 0;
  for (const pattern of patterns) {
    try {
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = next;
        if (keys.length > 0) {
          await redis.del(...keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');
    } catch (err) {
      // Never fail an admin write because of cache ops — just log it.
      console.error('[CatalogCache] delete pattern failed:', pattern, err.message);
    }
  }
  return { deleted: totalDeleted, skipped: false };
};

/**
 * Blow away every public catalog cache key: categories, brands, services,
 * home-content, home-data, and the Phase-4 /catalog/:slug payload. Called
 * from every admin write that touches Category/Brand/UserService/HomeContent.
 *
 * The patterns intentionally over-match (`public:*`) rather than trying to
 * pinpoint only the affected ids — a category rename, for example, cascades
 * through home-data, categories list and every brand/service response that
 * embedded its title.
 */
const invalidatePublicCatalogKeys = async () => {
  const result = await deleteKeyPatterns([
    'public:categories:*',
    'public:brands:*',
    'public:brand:*',
    'public:services:*',
    'public:homeContent:*',
    'public:homeData:*',
    'public:catalog:*',
    'public:categoriesEta:*'
  ]);
  if (!result.skipped) log(`invalidated ${result.deleted} public catalog key(s)`);
  return result;
};

module.exports = {
  deleteKeyPatterns,
  invalidatePublicCatalogKeys
};
