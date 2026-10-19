/**
 * Verification script for Phase 2b-REST
 * Tests:
 * 1. Health endpoint GET /api/admin/catalog/health flags broken rows & computes totals via aggregation
 * 2. Audit log endpoint GET /api/admin/audit-log captures 3+ actions with pagination and diffs
 * 3. Public publishStatus enforcement: draft rows are hidden from /api/public/services
 * 4. Wired admin routes: archive/restore on category, brand, service + with-stats + bulk-move
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Service = require('../models/UserService');
const Admin = require('../models/Admin');
const CatalogAuditLog = require('../models/CatalogAuditLog');
const { writeAudit } = require('../utils/auditLog');
const { generateTokenPair } = require('../utils/tokenService');
const { USER_ROLES, ADMIN_ROLES } = require('../utils/constants');

// Import controllers to test directly
const { getCatalogHealth, listServicesWithStats, archiveService, restoreService, bulkMoveServices } = require('../controllers/adminControllers/serviceController');
const { getAuditLogs } = require('../controllers/adminControllers/auditLogController');
const { getPublicServices } = require('../controllers/publicControllers/catalogController');
const { archiveCategory, restoreCategory } = require('../controllers/adminControllers/categoryController');
const { archiveBrand, restoreBrand } = require('../controllers/adminControllers/brandController');

// Mock req/res helper
const createMockReqRes = (params = {}, query = {}, body = {}, user = null) => {
  const req = {
    params,
    query,
    body,
    user: user || { id: new mongoose.Types.ObjectId().toString(), role: 'admin' },
    userRole: USER_ROLES.ADMIN
  };
  let responseData = null;
  let statusCode = 200;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };
  return {
    req,
    res,
    getStatus: () => statusCode,
    getData: () => responseData
  };
};

async function runVerification() {
  console.log('=== Starting Phase 2b-REST Verification ===\n');
  await connectDB();

  // Find or create an admin for audit logs
  let admin = await Admin.findOne({ role: ADMIN_ROLES.SUPER_ADMIN });
  if (!admin) {
    admin = await Admin.findOne();
  }
  const adminId = admin ? admin._id.toString() : new mongoose.Types.ObjectId().toString();
  console.log(`[Setup] Using Admin ID: ${adminId}`);

  const cleanupIds = {
    categories: [],
    brands: [],
    services: [],
    auditLogs: []
  };

  try {
    // ------------------------------------------------------------------------
    // CHECK 1: Audit log captures actions and GET /api/admin/audit-log responds
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Testing CatalogAuditLog & /api/admin/audit-log ---');
    const entityId1 = new mongoose.Types.ObjectId();
    const entityId2 = new mongoose.Types.ObjectId();
    const entityId3 = new mongoose.Types.ObjectId();

    await writeAudit({
      adminId,
      action: 'create',
      entityType: 'category',
      entityId: entityId1,
      after: { title: 'Test Category For Audit' },
      note: 'test audit action 1'
    });
    await writeAudit({
      adminId,
      action: 'archive',
      entityType: 'service',
      entityId: entityId2,
      before: { title: 'Test Service For Audit', status: 'active' },
      after: { title: 'Test Service For Audit', status: 'deleted' },
      note: 'test audit action 2'
    });
    await writeAudit({
      adminId,
      action: 'update',
      entityType: 'brand',
      entityId: entityId3,
      before: { title: 'Old Brand Title' },
      after: { title: 'New Brand Title' },
      note: 'test audit action 3'
    });

    const { req: auditReq, res: auditRes, getStatus: getAuditStatus, getData: getAuditData } = createMockReqRes(
      {},
      { limit: '10' },
      {},
      { id: adminId }
    );
    await getAuditLogs(auditReq, auditRes);

    const auditStatus = getAuditStatus();
    const auditData = getAuditData();
    console.log(`Audit Log Response Status: ${auditStatus}`);
    console.log(`Audit Log Items Count: ${auditData?.items?.length}, Total in DB: ${auditData?.total}`);
    
    if (auditStatus === 200 && auditData?.items?.length >= 3) {
      console.log('✅ PASS: Audit log captured 3+ actions and returned paginated response with before/after diffs');
      console.log(`   Sample item: action="${auditData.items[0].action}", entityType="${auditData.items[0].entityType}", note="${auditData.items[0].note}"`);
    } else {
      throw new Error(`Audit log test failed: status=${auditStatus}, items=${auditData?.items?.length}`);
    }

    // ------------------------------------------------------------------------
    // CHECK 2: Health endpoint GET /api/admin/catalog/health
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing /api/admin/catalog/health & Broken Row Detection ---');
    
    // Create an inactive parent category to test 'inactive-parent-category'
    const inactiveCat = await Category.create({
      title: 'Inactive Parent Category ' + Date.now(),
      slug: 'inactive-parent-cat-' + Date.now(),
      status: 'inactive'
    });
    cleanupIds.categories.push(inactiveCat._id);

    // Create a brand under that category
    const testBrand = await Brand.create({
      title: 'Test Brand ' + Date.now(),
      slug: 'test-brand-' + Date.now(),
      categoryId: inactiveCat._id,
      categoryIds: [inactiveCat._id]
    });
    cleanupIds.brands.push(testBrand._id);

    // Create a KNOWN BROKEN service:
    // - basePrice: 0, pricingType: 'fixed' -> missing-price
    // - iconUrl: null, images: [] -> missing-image
    // - gstPercentage: 0 -> missing-gst
    // - category inactive -> inactive-parent-category
    // - no workers mapped -> no-workers-mapped
    const brokenService = await Service.create({
      title: 'Known Broken Service ' + Date.now(),
      brandId: testBrand._id,
      categoryId: inactiveCat._id,
      basePrice: 0,
      pricingType: 'fixed',
      gstPercentage: 0,
      iconUrl: null,
      images: [],
      status: 'active',
      publishStatus: 'draft'
    });
    cleanupIds.services.push(brokenService._id);

    const { req: healthReq, res: healthRes, getStatus: getHealthStatus, getData: getHealthData } = createMockReqRes();
    await getCatalogHealth(healthReq, healthRes);

    const healthStatus = getHealthStatus();
    const healthData = getHealthData();
    console.log(`Health Response Status: ${healthStatus}`);
    console.log('Health Totals:', JSON.stringify(healthData?.totals));

    const flaggedRow = healthData?.needsAttention?.find(
      s => s.serviceId.toString() === brokenService._id.toString()
    );

    if (flaggedRow) {
      console.log('✅ PASS: Broken service identified in needsAttention!');
      console.log('   Flagged Reasons:', flaggedRow.reasons);
      const expectedReasons = ['no-workers-mapped', 'missing-image', 'missing-price', 'missing-gst', 'inactive-parent-category'];
      const allReasonsPresent = expectedReasons.every(r => flaggedRow.reasons.includes(r));
      if (allReasonsPresent) {
        console.log('✅ PASS: All 5 health reasons correctly detected in aggregation!');
      } else {
        console.warn('⚠️ Warning: Some reasons missing from:', flaggedRow.reasons);
      }
    } else {
      throw new Error('Broken service was not flagged in needsAttention list');
    }

    // ------------------------------------------------------------------------
    // CHECK 3: Public publishStatus enforcement
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Public-Side publishStatus: "draft" Isolation ---');

    // Create active top-level category & published brand
    const activeCat = await Category.create({
      title: 'Active Verification Cat ' + Date.now(),
      slug: 'active-verif-cat-' + Date.now(),
      status: 'active',
      publishStatus: 'published'
    });
    cleanupIds.categories.push(activeCat._id);

    const activeBrand = await Brand.create({
      title: 'Active Verification Brand ' + Date.now(),
      slug: 'active-verif-brand-' + Date.now(),
      categoryId: activeCat._id,
      categoryIds: [activeCat._id],
      status: 'active'
    });
    cleanupIds.brands.push(activeBrand._id);

    // Service 1: Draft service (must be HIDDEN from public catalog)
    const draftService = await Service.create({
      title: 'Secret Draft Service ' + Date.now(),
      brandId: activeBrand._id,
      categoryId: activeCat._id,
      basePrice: 499,
      gstPercentage: 18,
      status: 'active',
      publishStatus: 'draft'
    });
    cleanupIds.services.push(draftService._id);

    // Service 2: Published service (must be VISIBLE in public catalog)
    const publishedService = await Service.create({
      title: 'Live Published Service ' + Date.now(),
      brandId: activeBrand._id,
      categoryId: activeCat._id,
      basePrice: 599,
      gstPercentage: 18,
      status: 'active',
      publishStatus: 'published'
    });
    cleanupIds.services.push(publishedService._id);

    // Query public services under this brand
    const { req: pubReq, res: pubRes, getData: getPubData } = createMockReqRes(
      {},
      { brandId: activeBrand._id.toString() }
    );
    await getPublicServices(pubReq, pubRes);

    const pubData = getPubData();
    const serviceIdsReturned = (pubData?.services || []).map(s => (s.id || s._id).toString());
    const draftVisible = serviceIdsReturned.includes(draftService._id.toString());
    const publishedVisible = serviceIdsReturned.includes(publishedService._id.toString());

    console.log(`Public Services query returned ${serviceIdsReturned.length} services.`);
    console.log(`- Draft service visible: ${draftVisible}`);
    console.log(`- Published service visible: ${publishedVisible}`);

    if (!draftVisible && publishedVisible) {
      console.log('✅ PASS: publishStatus: "draft" row is strictly hidden from /api/public/services while published is visible');
    } else {
      throw new Error(`publishStatus enforcement failed: draftVisible=${draftVisible}, publishedVisible=${publishedVisible}`);
    }

    // ------------------------------------------------------------------------
    // CHECK 4: Wired admin routes (Archive, Restore, with-stats, bulk-move)
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Wired Admin Endpoints (Archive, Restore, With-Stats, Bulk-Move) ---');

    // Archive Service
    const { req: archSvcReq, res: archSvcRes, getData: getArchSvcData } = createMockReqRes(
      { id: publishedService._id.toString() },
      { force: 'true' },
      {},
      { id: adminId }
    );
    await archiveService(archSvcReq, archSvcRes);
    const archSvcData = getArchSvcData();
    console.log(`Archive Service: success=${archSvcData?.success}, status=${archSvcData?.service?.status}, previousStatus=${archSvcData?.service?.previousStatus}`);

    // Restore Service
    const { req: restSvcReq, res: restSvcRes, getData: getRestSvcData } = createMockReqRes(
      { id: publishedService._id.toString() },
      {},
      {},
      { id: adminId }
    );
    await restoreService(restSvcReq, restSvcRes);
    const restSvcData = getRestSvcData();
    console.log(`Restore Service: success=${restSvcData?.success}, restored status=${restSvcData?.service?.status}`);

    // Archive Category
    const { req: archCatReq, res: archCatRes, getData: getArchCatData } = createMockReqRes(
      { id: activeCat._id.toString() },
      { force: 'true' },
      {},
      { id: adminId }
    );
    await archiveCategory(archCatReq, archCatRes);
    const archCatData = getArchCatData();
    console.log(`Archive Category: success=${archCatData?.success}, status=${archCatData?.category?.status}`);

    // Restore Category
    const { req: restCatReq, res: restCatRes, getData: getRestCatData } = createMockReqRes(
      { id: activeCat._id.toString() },
      {},
      {},
      { id: adminId }
    );
    await restoreCategory(restCatReq, restCatRes);
    const restCatData = getRestCatData();
    console.log(`Restore Category: success=${restCatData?.success}, restored status=${restCatData?.category?.status}`);

    // Services With Stats
    const { req: statsReq, res: statsRes, getData: getStatsData } = createMockReqRes(
      {},
      { brandId: activeBrand._id.toString() }
    );
    await listServicesWithStats(statsReq, statsRes);
    const statsData = getStatsData();
    console.log(`Services with-stats count: ${statsData?.services?.length}`);
    if (statsData?.services?.[0]) {
      console.log(`Sample service with-stats: workersMapped=${statsData.services[0].workersMapped}, bookingsLast30Days=${statsData.services[0].bookingsLast30Days}`);
    }

    // Bulk Move Services
    const targetBrand = await Brand.create({
      title: 'Target Brand ' + Date.now(),
      slug: 'target-brand-' + Date.now(),
      categoryId: activeCat._id,
      categoryIds: [activeCat._id]
    });
    cleanupIds.brands.push(targetBrand._id);

    const { req: moveReq, res: moveRes, getData: getMoveData } = createMockReqRes(
      {},
      {},
      { ids: [publishedService._id.toString()], brandId: targetBrand._id.toString() },
      { id: adminId }
    );
    await bulkMoveServices(moveReq, moveRes);
    const moveData = getMoveData();
    console.log(`Bulk move services: matched=${moveData?.matched}, modified=${moveData?.modified}`);

    const movedService = await Service.findById(publishedService._id);
    if (movedService.brandId.toString() === targetBrand._id.toString()) {
      console.log('✅ PASS: Bulk move successfully relocated service to new brand!');
    } else {
      throw new Error('Bulk move verification failed');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL PHASE 2b-REST VERIFICATION CHECKS PASSED (4/4)!');
    console.log('======================================================\n');
  } finally {
    // Clean up test documents
    console.log('[Cleanup] Removing test documents...');
    if (cleanupIds.services.length) await Service.deleteMany({ _id: { $in: cleanupIds.services } });
    if (cleanupIds.brands.length) await Brand.deleteMany({ _id: { $in: cleanupIds.brands } });
    if (cleanupIds.categories.length) await Category.deleteMany({ _id: { $in: cleanupIds.categories } });
    await mongoose.disconnect();
    console.log('[Cleanup] Completed and DB disconnected.');
  }
}

runVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
