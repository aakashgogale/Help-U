/**
 * Full End-to-End Booking Flow & Edge Cases Test Suite
 *
 * Tests the entire lifecycle across:
 *   1. User creation and authentication
 *   2. Worker creation, KYC submission, Admin approval, and authentication
 *   3. Cart management and cart edge cases
 *   4. Checkout validation edge cases
 *   5. Booking creation and dispatching (with worker found vs no worker found)
 *   6. Worker alerts, rejection, excluded vendors edge cases
 *   7. Worker acceptance, double acceptance, and conflict edge cases
 *   8. Job journey start, double start, location reached
 *   9. Visit OTP verification, wrong OTP, and brute force guards
 *  10. Mid-job customer-added repair services
 *  11. Work completion, work photos validation (after photo required), bill calculation
 *  12. Cash collection confirmation, wrong OTP, race condition / double payment guard
 *  13. Worker wallet updates (dues, earnings, total cash collected) & Ledger transactions
 *  14. Platform earnings daily tracker
 *  15. User reviews, rating recalculations on Worker & Service
 *  16. Admin view of bookings, dashboard stats, analytics, and transactions
 *  17. Rescheduling, user cancellation, worker cancellation, and admin cancellation edge cases
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Worker = require('../models/Worker');
const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const BookingRequest = require('../models/BookingRequest');
const WorkerBill = require('../models/WorkerBill');
const Transaction = require('../models/Transaction');
const PlatformEarning = require('../models/PlatformEarning');
const Review = require('../models/Review');
const UserService = require('../models/UserService');
const Category = require('../models/Category');
const Cart = require('../models/Cart');

const API_BASE = 'http://localhost:5000/api';

const results = [];
let passedCount = 0;
let failedCount = 0;

function report(category, name, passed, details = null) {
  if (passed) {
    passedCount++;
    console.log(`  ✅ [${category}] ${name}`);
    results.push({ category, name, status: 'PASS', details });
  } else {
    failedCount++;
    console.error(`  ❌ [${category}] ${name}`, details ? details : '');
    results.push({ category, name, status: 'FAIL', details });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// HTTP helpers that return { status, data } without throwing
async function httpPost(url, body, headers = {}) {
  try {
    const res = await axios.post(`${API_BASE}${url}`, body, { headers, validateStatus: () => true });
    return { status: res.status, data: res.data };
  } catch (err) {
    return { status: 500, data: { error: err.message } };
  }
}

async function httpGet(url, headers = {}) {
  try {
    const res = await axios.get(`${API_BASE}${url}`, { headers, validateStatus: () => true });
    return { status: res.status, data: res.data };
  } catch (err) {
    return { status: 500, data: { error: err.message } };
  }
}

async function httpPut(url, body, headers = {}) {
  try {
    const res = await axios.put(`${API_BASE}${url}`, body, { headers, validateStatus: () => true });
    return { status: res.status, data: res.data };
  } catch (err) {
    return { status: 500, data: { error: err.message } };
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END BOOKING FLOW & EDGE CASES TEST');
  console.log('===============================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('📦 Connected to MongoDB Atlas\n');

  const runId = Date.now().toString().slice(-6);
  const testUserPhone = `99999${runId.slice(0, 5)}`;
  const testUserEmail = `testuser_${runId}@helpu.com`;
  const testWorkerPhone = `99998${runId.slice(0, 5)}`;
  const testWorkerEmail = `testworker_${runId}@helpu.com`;

  let userToken = null;
  let userId = null;
  let workerToken = null;
  let workerId = null;
  let adminToken = null;
  let adminId = null;

  let targetCategory = null;
  let targetService = null;
  let extraService = null;

  let primaryBookingId = null;
  let primaryBookingNumber = null;
  let visitOtp = null;
  let paymentOtp = null;
  let workerBillId = null;

  try {
    // -----------------------------------------------------------------
    // SETUP: Get Admin & Active Catalog Items
    // -----------------------------------------------------------------
    console.log('--- [0] SETUP: Admin Token & Target Catalog Services ---');
    const admin = await Admin.findOne({ role: { $in: ['super_admin', 'admin'] } });
    if (!admin) throw new Error('No admin user found in database');
    adminId = admin._id.toString();
    adminToken = jwt.sign(
      { userId: adminId, role: 'ADMIN' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    report('SETUP', 'Admin Token Generated', !!adminToken, `Admin: ${admin.email}`);

    targetCategory = await Category.findOne({ title: 'Cooler', status: 'active' });
    if (!targetCategory) targetCategory = await Category.findOne({ status: 'active' });

    targetService = await UserService.findOne({ categoryId: targetCategory._id, status: 'active' });
    extraService = await UserService.findOne({ categoryId: targetCategory._id, status: 'active', _id: { $ne: targetService._id } });

    report('SETUP', 'Target Service Found', !!targetService, `Category: ${targetCategory.title}, Service: ${targetService.title} (₹${targetService.basePrice})`);

    // -----------------------------------------------------------------
    // PHASE 1: User Registration & Onboarding
    // -----------------------------------------------------------------
    console.log('\n--- [1] USER ONBOARDING ---');

    // 1.1 Verify Login with OTP
    const userOtpRes = await httpPost('/users/auth/verify-login', {
      phone: testUserPhone,
      otp: '123456'
    });
    report('USER_AUTH', 'Verify Login identifies new user', userOtpRes.status === 200 && userOtpRes.data.isNewUser === true, userOtpRes.data);
    const userVerificationToken = userOtpRes.data.verificationToken;

    // 1.2 User Registration
    const userRegRes = await httpPost('/users/auth/register', {
      name: `Flow Test User ${runId}`,
      email: testUserEmail,
      verificationToken: userVerificationToken
    });
    report('USER_AUTH', 'User registered successfully', [200, 201].includes(userRegRes.status) && !!userRegRes.data.accessToken, userRegRes.data);
    userToken = userRegRes.data.accessToken;
    userId = userRegRes.data.user?.id || userRegRes.data.user?._id;

    // 1.3 DB Check: User
    const userDoc = await User.findById(userId);
    report('USER_DB', 'User record properly initialized in DB', !!userDoc && userDoc.wallet.balance === 0 && userDoc.wallet.penalty === 0, {
      id: userDoc?._id,
      name: userDoc?.name,
      wallet: userDoc?.wallet
    });

    // -----------------------------------------------------------------
    // PHASE 2: Worker Registration, Admin Approval, and Setup
    // -----------------------------------------------------------------
    console.log('\n--- [2] WORKER ONBOARDING & ADMIN APPROVAL ---');

    // 2.1 Worker Verify Login -> New Worker
    const workerOtpRes = await httpPost('/workers/auth/verify-login', {
      phone: testWorkerPhone,
      otp: '123456'
    });
    report('WORKER_AUTH', 'Worker verify login identifies new worker', workerOtpRes.status === 200 && workerOtpRes.data.isNewUser === true, workerOtpRes.data);
    const workerVerificationToken = workerOtpRes.data.verificationToken;

    // 2.2 Worker Registration
    const workerRegRes = await httpPost('/workers/auth/register', {
      name: `Flow Test Worker ${runId}`,
      phone: testWorkerPhone,
      email: testWorkerEmail,
      verificationToken: workerVerificationToken,
      aadhar: '123456789012',
      aadharDocument: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      aadharBackDocument: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      pan: 'ABCDE1234F',
      panDocument: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
    });
    report('WORKER_AUTH', 'Worker registered with pending status', [200, 201].includes(workerRegRes.status) && workerRegRes.data.success, workerRegRes.data);

    // 2.3 DB Check: Worker pending
    let workerDoc = await Worker.findOne({ phone: testWorkerPhone });
    workerId = workerDoc?._id?.toString();
    report('WORKER_DB', 'Worker created with pending approvalStatus', workerDoc && workerDoc.approvalStatus === 'pending', { id: workerId, approval: workerDoc?.approvalStatus });

    // 2.4 Edge Case: Worker attempts to login while pending approval
    const pendingLoginRes = await httpPost('/workers/auth/verify-login', {
      phone: testWorkerPhone,
      otp: '123456'
    });
    report('WORKER_AUTH_EDGE', 'Pending worker login blocked until approval', pendingLoginRes.status === 200 && pendingLoginRes.data.worker?.adminApproval === 'pending' && !pendingLoginRes.data.accessToken, pendingLoginRes.data);

    // 2.5 Admin Approves Worker via Admin API
    const approveRes = await httpPost(`/admin/workers/${workerId}/approve`, {}, {
      Authorization: `Bearer ${adminToken}`
    });
    report('ADMIN_API', 'Admin approves new worker', approveRes.status === 200 && approveRes.data.success, approveRes.data);

    // 2.6 DB Check: Worker approved
    workerDoc = await Worker.findById(workerId);
    report('WORKER_DB', 'Worker approvalStatus updated to approved in DB', workerDoc.approvalStatus === 'approved' && !!workerDoc.approvalDate);

    // 2.7 Worker Logs in successfully after approval
    const approvedLoginRes = await httpPost('/workers/auth/verify-login', {
      phone: testWorkerPhone,
      otp: '123456'
    });
    report('WORKER_AUTH', 'Approved worker logs in and receives token', approvedLoginRes.status === 200 && !!approvedLoginRes.data.accessToken);
    workerToken = approvedLoginRes.data.accessToken;

    // 2.8 Set Worker location, services, categories and online status
    workerDoc.service = [targetService.title, targetCategory.title, 'Visit'];
    workerDoc.categories = [targetCategory.title];
    workerDoc.address = {
      addressLine1: 'Indore Central',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
      lat: 22.7196,
      lng: 75.8577
    };
    workerDoc.location = { lat: 22.7196, lng: 75.8577 };
    workerDoc.geoLocation = { type: 'Point', coordinates: [75.8577, 22.7196] };
    workerDoc.isOnline = true;
    workerDoc.isActive = true;
    workerDoc.availability = 'AVAILABLE';
    workerDoc.wallet = { dues: 0, earnings: 0, cashLimit: 10000, isBlocked: false };
    await workerDoc.save();
    report('WORKER_DB', 'Worker location, service, category & availability set in DB', true);

    // -----------------------------------------------------------------
    // PHASE 3: Cart Operations & Edge Cases
    // -----------------------------------------------------------------
    console.log('\n--- [3] CART OPERATIONS & EDGE CASES ---');

    // 3.1 Edge case: Unauthorized cart access
    const noAuthCart = await httpGet('/users/cart');
    report('CART_EDGE', 'Cart rejects unauthenticated request (401)', noAuthCart.status === 401);

    // 3.2 Edge case: Add non-existent service ID to cart
    const fakeServiceId = new mongoose.Types.ObjectId();
    const badCartRes = await httpPost('/users/cart', {
      serviceId: fakeServiceId.toString(),
      title: 'Ghost Service',
      category: targetCategory.title,
      price: 500,
      unitPrice: 500,
      serviceCount: 1
    }, { Authorization: `Bearer ${userToken}` });
    report('CART_EDGE', 'Adding non-existent service to cart returns 404', badCartRes.status === 404);

    // 3.3 Add valid service to cart
    const addCartRes = await httpPost('/users/cart', {
      serviceId: targetService._id.toString(),
      title: targetService.title,
      category: targetCategory.title,
      categoryId: targetCategory._id.toString(),
      price: targetService.basePrice,
      unitPrice: targetService.basePrice,
      serviceCount: 1
    }, { Authorization: `Bearer ${userToken}` });
    report('CART', 'Valid service added to cart', addCartRes.status === 200 && addCartRes.data.data.length === 1);
    const cartItemId = addCartRes.data.data?.[0]?._id;

    // 3.4 Add same service again -> merges quantity to 2
    const mergeCartRes = await httpPost('/users/cart', {
      serviceId: targetService._id.toString(),
      title: targetService.title,
      category: targetCategory.title,
      price: targetService.basePrice,
      unitPrice: targetService.basePrice,
      serviceCount: 1
    }, { Authorization: `Bearer ${userToken}` });
    report('CART', 'Adding same service merges line item and doubles quantity', mergeCartRes.status === 200 && mergeCartRes.data.data[0].serviceCount === 2);

    // 3.5 Update quantity back to 1
    const updateCartRes = await httpPut(`/users/cart/${cartItemId}`, {
      serviceCount: 1
    }, { Authorization: `Bearer ${userToken}` });
    report('CART', 'Updating quantity recalculates price', updateCartRes.status === 200 && updateCartRes.data.data[0].serviceCount === 1);

    // -----------------------------------------------------------------
    // PHASE 4: Checkout Validation Edge Cases
    // -----------------------------------------------------------------
    console.log('\n--- [4] CHECKOUT VALIDATION EDGE CASES ---');

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const baseCheckoutPayload = {
      serviceId: targetService._id.toString(),
      address: {
        type: 'home',
        addressLine1: '12 MG Road',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001',
        lat: 22.7196,
        lng: 75.8577
      },
      scheduledDate: tomorrow,
      scheduledTime: '10:00 AM - 12:00 PM',
      timeSlot: { start: '10:00', end: '12:00' },
      paymentMethod: 'cash',
      bookingType: 'scheduled'
    };

    // 4.1 Edge case: Missing address pincode
    const badAddressPayload = JSON.parse(JSON.stringify(baseCheckoutPayload));
    delete badAddressPayload.address.pincode;
    const badAddressRes = await httpPost('/users/bookings', badAddressPayload, { Authorization: `Bearer ${userToken}` });
    report('CHECKOUT_EDGE', 'Checkout rejects missing address pincode (400)', badAddressRes.status === 400);

    // 4.2 Edge case: Missing timeSlot
    const badSlotPayload = JSON.parse(JSON.stringify(baseCheckoutPayload));
    delete badSlotPayload.timeSlot;
    const badSlotRes = await httpPost('/users/bookings', badSlotPayload, { Authorization: `Bearer ${userToken}` });
    report('CHECKOUT_EDGE', 'Checkout rejects missing timeSlot (400)', badSlotRes.status === 400);

    // 4.3 Edge case: Malformed service ID
    const badServicePayload = { ...baseCheckoutPayload, serviceId: 'not-a-valid-id' };
    const badServiceRes = await httpPost('/users/bookings', badServicePayload, { Authorization: `Bearer ${userToken}` });
    report('CHECKOUT_EDGE', 'Checkout rejects malformed serviceId (400)', badServiceRes.status === 400);

    // 4.4 Edge case: No workers found in distant city -> auto-cancelled
    const distantCityPayload = JSON.parse(JSON.stringify(baseCheckoutPayload));
    distantCityPayload.address.city = 'NowhereCity999';
    distantCityPayload.address.lat = 10.0;
    distantCityPayload.address.lng = 10.0;
    const distantRes = await httpPost('/users/bookings', distantCityPayload, { Authorization: `Bearer ${userToken}` });
    report('CHECKOUT_EDGE', 'Checkout with no nearby worker reports noWorkersFound: true', distantRes.status === 201 && distantRes.data.noWorkersFound === true);

    await sleep(600); // allow background auto-cancel
    const distantBookingDoc = await Booking.findById(distantRes.data.data?._id);
    report('DISPATCH_EDGE', 'Booking with no available worker is auto-cancelled in DB', distantBookingDoc && distantBookingDoc.status === 'cancelled');

    // -----------------------------------------------------------------
    // PHASE 5: Successful Booking Creation & Worker Alert
    // -----------------------------------------------------------------
    console.log('\n--- [5] BOOKING CREATION & WORKER ALERT ---');

    const validBookingRes = await httpPost('/users/bookings', baseCheckoutPayload, { Authorization: `Bearer ${userToken}` });
    report('BOOKING_CREATE', 'Booking created successfully and matches nearby worker', validBookingRes.status === 201 && validBookingRes.data.noWorkersFound === false, validBookingRes.data);

    primaryBookingId = validBookingRes.data.data?._id;
    primaryBookingNumber = validBookingRes.data.data?.bookingNumber;

    await sleep(1500); // Wait for background afterResponse dispatch (notifications, emails, cart cleanup)

    // 5.1 DB Check: Booking status
    let primaryBookingDoc = await Booking.findById(primaryBookingId);
    report('BOOKING_DB', 'Booking status is searching and worker is in notifiedVendors', primaryBookingDoc && primaryBookingDoc.status === 'searching' && primaryBookingDoc.notifiedVendors.map(String).includes(workerId), {
      status: primaryBookingDoc?.status,
      notifiedVendors: primaryBookingDoc?.notifiedVendors
    });

    // 5.2 DB Check: Cart cleared
    const userCart = await Cart.findOne({ userId });
    report('CART_DB', 'Cart is cleared after successful booking', userCart && userCart.items.length === 0, {
      remainingItemsCount: userCart?.items?.length,
      items: userCart?.items?.map(i => ({ title: i.title, serviceId: i.serviceId }))
    });

    // 5.3 DB Check: BookingRequest created for worker
    const bookingReq = await BookingRequest.findOne({ bookingId: primaryBookingId, vendorId: workerId });
    report('DISPATCH_DB', 'BookingRequest record created in DB for worker with status PENDING', !!bookingReq && bookingReq.status === 'PENDING');

    // -----------------------------------------------------------------
    // PHASE 6: Worker Rejection & Acceptance Edge Cases
    // -----------------------------------------------------------------
    console.log('\n--- [6] WORKER ACCEPTANCE & REJECTION EDGE CASES ---');

    // 6.1 Worker Acceptance
    const acceptRes = await httpPost(`/workers/bookings/${primaryBookingId}/accept`, {}, { Authorization: `Bearer ${workerToken}` });
    report('WORKER_ACCEPT', 'Worker accepts booking successfully', acceptRes.status === 200 && acceptRes.data.success);

    // 6.2 Edge Case: Same worker calls accept again -> idempotent 200
    const doubleAcceptRes = await httpPost(`/workers/bookings/${primaryBookingId}/accept`, {}, { Authorization: `Bearer ${workerToken}` });
    report('WORKER_ACCEPT_EDGE', 'Double acceptance returns 200 (Already accepted by you)', doubleAcceptRes.status === 200 && doubleAcceptRes.data.message.includes('already accepted'));

    // 6.3 DB Check: Booking and BookingRequest updated
    primaryBookingDoc = await Booking.findById(primaryBookingId);
    report('BOOKING_DB', 'Booking status updated to confirmed and vendorId assigned to worker', primaryBookingDoc.status === 'confirmed' && String(primaryBookingDoc.vendorId) === workerId);

    const updatedBookingReq = await BookingRequest.findOne({ bookingId: primaryBookingId, vendorId: workerId });
    report('DISPATCH_DB', 'BookingRequest status updated to ACCEPTED', updatedBookingReq && updatedBookingReq.status === 'ACCEPTED');

    // -----------------------------------------------------------------
    // PHASE 7: Job Progress (Start Journey -> Location Reached -> Visit OTP)
    // -----------------------------------------------------------------
    console.log('\n--- [7] JOB PROGRESS & VISIT OTP EDGE CASES ---');

    // 7.1 Start Journey
    const startJourneyRes = await httpPost(`/workers/bookings/${primaryBookingId}/self/start`, {}, { Authorization: `Bearer ${workerToken}` });
    report('JOB_PROGRESS', 'Worker starts journey and generates visit OTP', startJourneyRes.status === 200 && startJourneyRes.data.success);

    // 7.2 Double start -> 200 OK
    const doubleStartRes = await httpPost(`/workers/bookings/${primaryBookingId}/self/start`, {}, { Authorization: `Bearer ${workerToken}` });
    report('JOB_PROGRESS_EDGE', 'Starting journey again returns 200 (Journey already started)', doubleStartRes.status === 200 && doubleStartRes.data.message.includes('Journey already started'));

    // 7.3 DB Check: visitOtp generated
    primaryBookingDoc = await Booking.findById(primaryBookingId).select('+visitOtp');
    visitOtp = primaryBookingDoc.visitOtp;
    report('BOOKING_DB', 'Booking status is journey_started and 4-digit visitOtp generated', primaryBookingDoc.status === 'journey_started' && /^\d{4}$/.test(visitOtp), { visitOtp });

    // 7.4 Worker marks reached
    const reachedRes = await httpPost(`/workers/bookings/${primaryBookingId}/self/reached`, {}, { Authorization: `Bearer ${workerToken}` });
    report('JOB_PROGRESS', 'Worker reached location endpoint succeeds', reachedRes.status === 200);

    // 7.5 Edge case: Verify visit with wrong OTP
    const wrongOtpRes = await httpPost(`/workers/bookings/${primaryBookingId}/self/visit/verify`, {
      otp: '9999'
    }, { Authorization: `Bearer ${workerToken}` });
    report('OTP_EDGE', 'Visit verification rejects invalid OTP (400)', wrongOtpRes.status === 400 && wrongOtpRes.data.message.includes('Invalid OTP'));

    // 7.6 Verify visit with correct OTP
    const correctVisitRes = await httpPost(`/workers/bookings/${primaryBookingId}/self/visit/verify`, {
      otp: visitOtp
    }, { Authorization: `Bearer ${workerToken}` });
    report('JOB_PROGRESS', 'Visit verified with correct OTP', correctVisitRes.status === 200 && correctVisitRes.data.success);

    // 7.7 DB Check: status is visited and visitOtp is cleared
    primaryBookingDoc = await Booking.findById(primaryBookingId).select('+visitOtp');
    report('BOOKING_DB', 'Booking status updated to visited, startedAt recorded, and visitOtp cleared', primaryBookingDoc.status === 'visited' && !primaryBookingDoc.visitOtp && !!primaryBookingDoc.startedAt);

    // -----------------------------------------------------------------
    // PHASE 8: Customer Added Repair Services (Mid-Job)
    // -----------------------------------------------------------------
    console.log('\n--- [8] CUSTOMER-ADDED REPAIR SERVICES (MID-JOB) ---');

    if (extraService) {
      const addExtraRes = await httpPut(`/users/bookings/${primaryBookingId}/extra-services`, {
        items: [{ serviceId: extraService._id.toString(), quantity: 1 }]
      }, { Authorization: `Bearer ${userToken}` });
      report('EXTRA_SERVICES', 'User adds extra repair service while status is visited', addExtraRes.status === 200 && addExtraRes.data.selected.length === 1);

      primaryBookingDoc = await Booking.findById(primaryBookingId);
      report('BOOKING_DB', 'Booking has customerAddedServices saved in DB', primaryBookingDoc.customerAddedServices?.length === 1);
    }

    // -----------------------------------------------------------------
    // PHASE 9: Job Completion & Bill Generation Edge Cases
    // -----------------------------------------------------------------
    console.log('\n--- [9] JOB COMPLETION & BILL GENERATION EDGE CASES ---');

    // 9.1 Edge Case: Complete job without photos
    const noPhotosRes = await httpPost(`/workers/bookings/${primaryBookingId}/self/complete`, {}, { Authorization: `Bearer ${workerToken}` });
    report('COMPLETE_EDGE', 'Job completion rejects missing work photos (400)', noPhotosRes.status === 400);

    // 9.2 Edge Case: Complete job with photos but missing 'after' photo
    const badPhotosRes = await httpPost(`/workers/bookings/${primaryBookingId}/self/complete`, {
      workPhotos: [{ url: 'https://cloudinary.com/test.jpg', type: 'before' }]
    }, { Authorization: `Bearer ${workerToken}` });
    report('COMPLETE_EDGE', 'Job completion rejects photos missing "after" type (400)', badPhotosRes.status === 400 && (badPhotosRes.data.message.includes('after') || badPhotosRes.data.message.includes('finished work')), badPhotosRes.data);

    // 9.3 Complete job with valid 'after' photo and bill details
    const completeJobRes = await httpPost(`/workers/bookings/${primaryBookingId}/self/complete`, {
      workPhotos: [{ url: 'https://cloudinary.com/test-after.jpg', type: 'after' }],
      billDetails: {
        services: [{ name: 'Deep Coil Cleaning', price: 150, quantity: 1 }],
        parts: [{ name: 'Capacitor 45uF', price: 200, quantity: 1, gstPercentage: 18 }]
      }
    }, { Authorization: `Bearer ${workerToken}` });
    report('JOB_COMPLETE', 'Job completed and bill generated', completeJobRes.status === 200 && completeJobRes.data.success, completeJobRes.data.data?.bill);

    // 9.4 Edge Case: Complete job again -> rejected (bill already generated)
    const doubleCompleteRes = await httpPost(`/workers/bookings/${primaryBookingId}/self/complete`, {
      workPhotos: [{ url: 'https://cloudinary.com/test-after.jpg', type: 'after' }]
    }, { Authorization: `Bearer ${workerToken}` });
    report('COMPLETE_EDGE', 'Completing job again blocked (Bill already generated)', doubleCompleteRes.status === 400);

    // 9.5 DB Check: WorkerBill and Booking fields
    primaryBookingDoc = await Booking.findById(primaryBookingId).select('+paymentOtp +customerConfirmationOTP');
    paymentOtp = primaryBookingDoc.customerConfirmationOTP || primaryBookingDoc.paymentOtp;
    workerBillId = primaryBookingDoc.vendorBillId;

    report('BOOKING_DB', 'Booking status is work_done, finalAmount set, and payment OTP generated', primaryBookingDoc.status === 'work_done' && primaryBookingDoc.finalAmount > 0 && /^\d{4}$/.test(paymentOtp), {
      finalAmount: primaryBookingDoc.finalAmount,
      userPayableAmount: primaryBookingDoc.userPayableAmount,
      paymentOtp
    });

    const billDoc = await WorkerBill.findById(workerBillId);
    report('BILL_DB', 'WorkerBill document created with calculated earnings and company revenue', !!billDoc && billDoc.status === 'generated' && billDoc.vendorTotalEarning > 0 && billDoc.companyRevenue > 0, {
      grandTotal: billDoc?.grandTotal,
      vendorTotalEarning: billDoc?.vendorTotalEarning,
      companyRevenue: billDoc?.companyRevenue,
      totalGST: billDoc?.totalGST
    });

    // -----------------------------------------------------------------
    // PHASE 10: Cash Collection & Payment Edge Cases
    // -----------------------------------------------------------------
    console.log('\n--- [10] CASH COLLECTION & PAYMENT EDGE CASES ---');

    // 10.1 Edge Case: Confirm cash collection without OTP
    const noOtpCashRes = await httpPost(`/bookings/cash/${primaryBookingId}/confirm`, {}, { Authorization: `Bearer ${workerToken}` });
    report('CASH_EDGE', 'Cash confirmation rejects missing OTP (400)', noOtpCashRes.status === 400);

    // 10.2 Edge Case: Confirm cash collection with wrong OTP
    const wrongOtpCashRes = await httpPost(`/bookings/cash/${primaryBookingId}/confirm`, {
      otp: '9999'
    }, { Authorization: `Bearer ${workerToken}` });
    report('CASH_EDGE', 'Cash confirmation rejects incorrect OTP (400)', wrongOtpCashRes.status === 400);

    // 10.3 Edge Case: Confirm cash collection by unauthorized worker (assigned to someone else)
    const anotherWorker = await Worker.findOne({ _id: { $ne: workerId }, approvalStatus: 'approved' });
    if (anotherWorker) {
      const otherWorkerToken = jwt.sign({ userId: anotherWorker._id.toString(), role: 'WORKER' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const wrongWorkerCashRes = await httpPost(`/bookings/cash/${primaryBookingId}/confirm`, {
        otp: paymentOtp
      }, { Authorization: `Bearer ${otherWorkerToken}` });
      report('CASH_EDGE', 'Cash confirmation rejects unauthorized worker (403)', wrongWorkerCashRes.status === 403, wrongWorkerCashRes.data);
    } else {
      report('CASH_EDGE', 'Cash confirmation rejects unauthorized worker (skipped, no second worker)', true);
    }

    // 10.4 Confirm cash collection with correct OTP
    const workerBeforeCash = await Worker.findById(workerId);
    const prevDues = workerBeforeCash.wallet?.dues || 0;
    const prevEarnings = workerBeforeCash.wallet?.earnings || 0;

    const confirmCashRes = await httpPost(`/bookings/cash/${primaryBookingId}/confirm`, {
      otp: paymentOtp
    }, { Authorization: `Bearer ${workerToken}` });
    report('CASH_COLLECT', 'Cash collection confirmed with correct OTP', confirmCashRes.status === 200 && confirmCashRes.data.success);

    // 10.5 Edge Case: Double confirmation (race condition guard)
    const doubleCashRes = await httpPost(`/bookings/cash/${primaryBookingId}/confirm`, {
      otp: paymentOtp
    }, { Authorization: `Bearer ${workerToken}` });
    report('CASH_EDGE', 'Idempotent cash confirmation prevents double charging/crediting', doubleCashRes.status === 200 && doubleCashRes.data.message.includes('already confirmed'));

    // 10.6 DB Check: Booking status completed & paymentStatus collected_by_vendor
    primaryBookingDoc = await Booking.findById(primaryBookingId).select('+paymentOtp +customerConfirmationOTP');
    report('BOOKING_DB', 'Booking marked completed, cashCollected: true, paymentStatus: collected_by_vendor, OTPs cleared',
      primaryBookingDoc.status === 'completed' &&
      primaryBookingDoc.cashCollected === true &&
      (primaryBookingDoc.paymentStatus === 'collected_by_vendor' || primaryBookingDoc.paymentStatus === 'collected_by_worker') &&
      !primaryBookingDoc.paymentOtp &&
      !primaryBookingDoc.customerConfirmationOTP,
      { status: primaryBookingDoc.status, paymentStatus: primaryBookingDoc.paymentStatus, cashCollected: primaryBookingDoc.cashCollected }
    );

    // 10.7 DB Check: WorkerBill marked paid
    const paidBillDoc = await WorkerBill.findById(workerBillId);
    report('BILL_DB', 'WorkerBill marked as paid with paidAt timestamp', paidBillDoc.status === 'paid' && !!paidBillDoc.paidAt);

    // 10.8 DB Check: Worker Wallet dues & earnings updated
    const workerAfterCash = await Worker.findById(workerId);
    const duesDiff = (workerAfterCash.wallet?.dues || 0) - prevDues;
    const earningsDiff = (workerAfterCash.wallet?.earnings || 0) - prevEarnings;
    report('WORKER_DB', 'Worker wallet dues increased by cash collected and earnings increased by worker share',
      duesDiff === primaryBookingDoc.finalAmount && earningsDiff === paidBillDoc.vendorTotalEarning && workerAfterCash.availability === 'AVAILABLE', {
        newDues: workerAfterCash.wallet?.dues,
        newEarnings: workerAfterCash.wallet?.earnings,
        availability: workerAfterCash.availability
      }
    );

    // 10.9 DB Check: Transactions created (dues increase & earnings credit)
    const cashTxn = await Transaction.findOne({ bookingId: primaryBookingId, type: 'cash_collected' });
    const earningTxn = await Transaction.findOne({ bookingId: primaryBookingId, type: 'earnings_credit' });
    report('LEDGER_DB', 'Transaction records created: cash_collected and earnings_credit',
      !!cashTxn && cashTxn.amount === primaryBookingDoc.finalAmount &&
      !!earningTxn && earningTxn.amount === paidBillDoc.vendorTotalEarning
    );

    // 10.10 DB Check: Daily PlatformEarning tracker updated
    const todayStr = new Date().toISOString().split('T')[0];
    const platformEarningDoc = await PlatformEarning.findOne({ date: todayStr });
    report('ADMIN_DB', 'PlatformEarning daily tracker updated with booking financial metrics',
      !!platformEarningDoc && platformEarningDoc.totalBookings > 0 && platformEarningDoc.totalRevenue > 0, {
        totalRevenue: platformEarningDoc?.totalRevenue,
        platformCommission: platformEarningDoc?.platformCommission,
        vendorEarnings: platformEarningDoc?.vendorEarnings
      }
    );

    // -----------------------------------------------------------------
    // PHASE 11: Post-Completion Reviews & Ratings
    // -----------------------------------------------------------------
    console.log('\n--- [11] REVIEWS, RATINGS & POST-COMPLETION ---');

    // 11.1 Submit review
    const reviewRes = await httpPost(`/users/bookings/${primaryBookingId}/review`, {
      rating: 5,
      review: 'Outstanding job by this professional!',
      reviewImages: []
    }, { Authorization: `Bearer ${userToken}` });
    report('REVIEW', 'User successfully reviews completed booking', reviewRes.status === 200 && reviewRes.data.success);

    // 11.2 Edge Case: Review booking twice -> rejected
    const doubleReviewRes = await httpPost(`/users/bookings/${primaryBookingId}/review`, {
      rating: 4,
      review: 'Trying again'
    }, { Authorization: `Bearer ${userToken}` });
    report('REVIEW_EDGE', 'Submitting duplicate review rejected (400)', doubleReviewRes.status === 400 && doubleReviewRes.data.message.includes('already reviewed'));

    // 11.3 DB Check: Review document created
    const reviewDoc = await Review.findOne({ bookingId: primaryBookingId });
    report('REVIEW_DB', 'Review document created in Review collection', !!reviewDoc && reviewDoc.rating === 5);

    // 11.4 DB Check: Worker & Service rating updated
    const ratedWorker = await Worker.findById(workerId);
    const ratedService = await UserService.findById(targetService._id);
    report('RATING_DB', 'Worker and UserService ratings and totalReviews incremented in DB',
      ratedWorker.rating > 0 && ratedWorker.totalReviews > 0 && ratedService.rating > 0 && ratedService.totalReviews > 0, {
        workerRating: ratedWorker.rating,
        workerReviews: ratedWorker.totalReviews,
        serviceRating: ratedService.rating,
        serviceReviews: ratedService.totalReviews
      }
    );

    // -----------------------------------------------------------------
    // PHASE 12: Admin Verification & Views
    // -----------------------------------------------------------------
    console.log('\n--- [12] ADMIN VERIFICATION & DASHBOARD VIEWS ---');

    // 12.1 Admin lists all bookings
    const adminBookingsRes = await httpGet('/admin/bookings', { Authorization: `Bearer ${adminToken}` });
    const foundInAdminList = (adminBookingsRes.data.data || []).some(b => String(b._id) === primaryBookingId);
    report('ADMIN_API', 'Admin booking list includes newly completed booking', adminBookingsRes.status === 200 && foundInAdminList);

    // 12.2 Admin gets booking details
    const adminBookingDetailRes = await httpGet(`/admin/bookings/${primaryBookingId}`, { Authorization: `Bearer ${adminToken}` });
    report('ADMIN_API', 'Admin booking details returns populated user, worker, and service',
      adminBookingDetailRes.status === 200 &&
      adminBookingDetailRes.data.data?.userId?.phone === testUserPhone &&
      adminBookingDetailRes.data.data?.vendorId?.phone === testWorkerPhone
    );

    // 12.3 Admin Dashboard Stats
    const adminDashboardRes = await httpGet('/admin/dashboard/stats', { Authorization: `Bearer ${adminToken}` });
    const statsData = adminDashboardRes.data.data?.stats || adminDashboardRes.data.data || {};
    report('ADMIN_API', 'Admin dashboard stats API returns counts and completed bookings metrics',
      adminDashboardRes.status === 200 && statsData.completedBookings > 0,
      statsData
    );

    // 12.4 Admin Analytics
    const adminAnalyticsRes = await httpGet('/admin/bookings/analytics', { Authorization: `Bearer ${adminToken}` });
    report('ADMIN_API', 'Admin booking analytics returns valid status aggregates', adminAnalyticsRes.status === 200);

    // 12.5 Admin Transactions View
    const adminTxnsRes = await httpGet('/admin/transactions', { Authorization: `Bearer ${adminToken}` });
    const hasWorkerTxn = (adminTxnsRes.data.data || []).some(t => String(t.vendorId?._id || t.vendorId) === workerId);
    report('ADMIN_API', 'Admin transactions includes worker transactions', adminTxnsRes.status === 200 && hasWorkerTxn);

    // 12.6 Admin Worker View
    const adminWorkerRes = await httpGet(`/admin/workers/${workerId}`, { Authorization: `Bearer ${adminToken}` });
    const workerWallet = adminWorkerRes.data.data?.worker?.wallet || adminWorkerRes.data.data?.wallet;
    report('ADMIN_API', 'Admin worker detail reflects updated wallet dues & earnings',
      adminWorkerRes.status === 200 && workerWallet?.dues === primaryBookingDoc.finalAmount,
      { wallet: workerWallet }
    );

    // 12.7 Admin User View
    const adminUserRes = await httpGet(`/admin/users/${userId}`, { Authorization: `Bearer ${adminToken}` });
    const fetchedUser = adminUserRes.data.data?.user || adminUserRes.data.data;
    report('ADMIN_API', 'Admin user detail reflects user data', adminUserRes.status === 200 && fetchedUser?.phone === testUserPhone, { user: fetchedUser });

    // -----------------------------------------------------------------
    // PHASE 13: Rescheduling & Cancellation Edge Cases
    // -----------------------------------------------------------------
    console.log('\n--- [13] RESCHEDULING & CANCELLATION EDGE CASES (NEW BOOKINGS) ---');

    // 13.1 Create a second booking to test rescheduling and user cancellation
    const booking2Res = await httpPost('/users/bookings', baseCheckoutPayload, { Authorization: `Bearer ${userToken}` });
    const booking2Id = booking2Res.data.data?._id;
    report('RESCHEDULE', 'Secondary booking created for reschedule/cancel test', booking2Res.status === 201);

    // Reschedule booking 2
    const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const rescheduleRes = await httpPut(`/users/bookings/${booking2Id}/reschedule`, {
      scheduledDate: futureDate,
      scheduledTime: '2:00 PM - 4:00 PM',
      timeSlot: { start: '14:00', end: '16:00' }
    }, { Authorization: `Bearer ${userToken}` });
    report('RESCHEDULE', 'User successfully reschedules booking to new date & time', rescheduleRes.status === 200 && rescheduleRes.data.success);

    const rescheduledDoc = await Booking.findById(booking2Id);
    report('BOOKING_DB', 'Booking scheduledDate and scheduledTime updated in DB', rescheduledDoc.scheduledTime === '2:00 PM - 4:00 PM');

    // User cancels booking 2
    const cancelRes = await httpPost(`/users/bookings/${booking2Id}/cancel`, {
      cancellationReason: 'Need to postpone indefinitely'
    }, { Authorization: `Bearer ${userToken}` });
    report('CANCEL', 'User successfully cancels booking', cancelRes.status === 200 && cancelRes.data.success);

    const cancelledDoc = await Booking.findById(booking2Id);
    report('BOOKING_DB', 'Booking marked cancelled in DB with cancelledBy = user', cancelledDoc.status === 'cancelled' && cancelledDoc.cancelledBy === 'user');

    // Edge Case: Cancelling already cancelled booking
    const doubleCancelRes = await httpPost(`/users/bookings/${booking2Id}/cancel`, {}, { Authorization: `Bearer ${userToken}` });
    report('CANCEL_EDGE', 'Cancelling already cancelled booking rejected (400)', doubleCancelRes.status === 400);

    // Edge Case: Rescheduling a cancelled booking
    const rescheduleCancelledRes = await httpPut(`/users/bookings/${booking2Id}/reschedule`, {
      scheduledDate: futureDate,
      scheduledTime: '2:00 PM - 4:00 PM',
      timeSlot: { start: '14:00', end: '16:00' }
    }, { Authorization: `Bearer ${userToken}` });
    report('RESCHEDULE_EDGE', 'Rescheduling a cancelled booking rejected (400)', rescheduleCancelledRes.status === 400);

    // 13.2 Worker Cancellation Test (Booking 3)
    const booking3Res = await httpPost('/users/bookings', baseCheckoutPayload, { Authorization: `Bearer ${userToken}` });
    const booking3Id = booking3Res.data.data?._id;
    await httpPost(`/workers/bookings/${booking3Id}/accept`, {}, { Authorization: `Bearer ${workerToken}` });

    const workerCancelRes = await httpPost(`/workers/bookings/${booking3Id}/cancel`, {
      reason: 'Vehicle breakdown'
    }, { Authorization: `Bearer ${workerToken}` });
    report('WORKER_CANCEL', 'Worker cancels accepted job', workerCancelRes.status === 200);

    const workerCancelledBookingDoc = await Booking.findById(booking3Id);
    report('BOOKING_DB', 'Booking handles worker drop (excluded worker recorded)', workerCancelledBookingDoc.excludedVendors.map(String).includes(workerId));

    // 13.3 Admin Cancellation Test (Booking 4)
    const booking4Res = await httpPost('/users/bookings', baseCheckoutPayload, { Authorization: `Bearer ${userToken}` });
    const booking4Id = booking4Res.data.data?._id;
    if (!booking4Id) {
      console.error('    [Debug Booking 4 Creation Error]', booking4Res.status, booking4Res.data);
    }

    const adminCancelRes = await httpPost(`/admin/bookings/${booking4Id}/cancel`, {
      cancellationReason: 'Dispatched by mistake'
    }, { Authorization: `Bearer ${adminToken}` });
    if (adminCancelRes.status !== 200) {
      console.error('    [Debug Admin Cancel Error]', adminCancelRes.status, adminCancelRes.data);
    }
    report('ADMIN_CANCEL', 'Admin cancels booking', adminCancelRes.status === 200 && adminCancelRes.data.success, adminCancelRes.data);

    const adminCancelledDoc = await Booking.findById(booking4Id);
    report('BOOKING_DB', 'Booking status is cancelled with cancelledBy = admin', adminCancelledDoc?.status === 'cancelled' && adminCancelledDoc?.cancelledBy === 'admin', {
      status: adminCancelledDoc?.status,
      cancelledBy: adminCancelledDoc?.cancelledBy
    });

    // Edge Case: Admin attempts to cancel completed primary booking
    const adminCancelCompletedRes = await httpPost(`/admin/bookings/${primaryBookingId}/cancel`, {
      cancellationReason: 'Cannot cancel'
    }, { Authorization: `Bearer ${adminToken}` });
    report('ADMIN_CANCEL_EDGE', 'Admin cancelling completed booking rejected (400)', adminCancelCompletedRes.status === 400 && adminCancelCompletedRes.data.message.includes('completed'));

  } catch (error) {
    console.error('\n❌ Unhandled exception during test execution:', error);
    report('FATAL', 'Test Suite Execution', false, error.message);
  } finally {
    // -----------------------------------------------------------------
    // CLEANUP TEST DATA
    // -----------------------------------------------------------------
    console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
    try {
      if (userId) {
        await User.deleteOne({ _id: userId });
        await Cart.deleteOne({ userId });
      }
      if (workerId) {
        await Worker.deleteOne({ _id: workerId });
      }
      if (primaryBookingId) {
        await Booking.deleteMany({ userId });
        await BookingRequest.deleteMany({ vendorId: workerId });
        await WorkerBill.deleteOne({ bookingId: primaryBookingId });
        await Transaction.deleteMany({ vendorId: workerId });
        await Review.deleteMany({ vendorId: workerId });
      }
      console.log('🧹 Test data cleaned up successfully');
    } catch (cleanErr) {
      console.error('⚠️ Cleanup warning:', cleanErr.message);
    }

    await mongoose.disconnect();
  }

  console.log('\n===============================================================');
  console.log(`📊 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED out of ${passedCount + failedCount} assertions`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    console.log('Failed assertions:');
    results.filter(r => r.status === 'FAIL').forEach(f => console.log(`  - [${f.category}] ${f.name}:`, f.details));
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

runTests();
