/**
 * Rescheduling: the customer moves a booking, the assigned partner asks the customer to move it, and the admin
 * switches/limits in Booking Config. Runs on an in-memory MongoDB and never touches the real database.
 * Run: node tests/reschedule.test.js
 */
process.env.JWT_SECRET = 'x'; process.env.JWT_REFRESH_SECRET = 'y';
delete process.env.GOOGLE_MAPS_API_KEY;
const path = require('path');
const R = path.join(__dirname, '..') + path.sep;
const assert = require('assert');
const express = require(R + 'node_modules/express');
const request = require(R + 'node_modules/supertest');
const mongoose = require(R + 'node_modules/mongoose');
const { MongoMemoryServer } = require(R + 'node_modules/mongodb-memory-server');
const User = require(R + 'models/User');
const Category = require(R + 'models/Category');
const UserService = require(R + 'models/UserService');
const Booking = require(R + 'models/Booking');
const Worker = require(R + 'models/Worker');
const Settings = require(R + 'models/Settings');
const { invalidateBookingConfigCache } = require(R + 'utils/bookingConfig');
const { generateAccessToken } = require(R + 'utils/tokenService');

let passed = 0, failed = 0;
const it = async (desc, fn) => {
  try { await fn(); console.log(`  PASS  ${desc}`); passed++; } catch (e) { console.error(`  FAIL  ${desc}: ${e.message}`); failed++; }
};
const daysAhead = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();
const slot = (d, start = '14:00', end = '16:00') => ({ scheduledDate: daysAhead(d), scheduledTime: `${start}-${end}`, timeSlot: { start, end } });
const setConfig = async (o) => { await Settings.deleteMany({}); await Settings.create({ type: 'global', ...o }); invalidateBookingConfigCache(); };

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const app = express();
  app.use(express.json());
  app.use('/api/users/bookings', require(R + 'routes/user-routes/booking.routes'));
  app.use('/api/workers/bookings', require(R + 'routes/worker-routes/booking.routes'));

  try {
    const user = await User.create({ name: 'Customer', phone: '9000000011' });
    const userAuth = { Authorization: `Bearer ${generateAccessToken({ userId: String(user._id), role: 'USER' })}` };
    const mkWorker = async (n) => (await Worker.collection.insertOne({
      name: `Partner ${n}`, email: `p${n}@t.com`, phone: `900000002${n}`, approvalStatus: 'approved', isActive: true, isOnline: true,
      service: ['Fan Repair'], categories: ['Electrician'], address: { city: 'Indore', lat: 22.72, lng: 75.86 }, wallet: { dues: 0, cashLimit: 1000 }
    })).insertedId;
    const workerId = await mkWorker(1);
    const otherWorkerId = await mkWorker(2);
    const workerAuth = (id) => ({ Authorization: `Bearer ${generateAccessToken({ userId: String(id), role: 'WORKER' })}` });

    const category = await Category.create({ title: 'Electrician', slug: 'electrician-rs' });
    const service = await UserService.create({ title: 'Fan Repair', categoryId: category._id, brandId: new mongoose.Types.ObjectId(), basePrice: 400, status: 'active' });
    const newBooking = async (over = {}) => {
      await setConfig({});
      const res = await request(app).post('/api/users/bookings').set(userAuth).send({
        serviceId: String(service._id),
        address: { type: 'home', addressLine1: '12 MG Road', city: 'Indore', state: 'MP', pincode: '452001' },
        scheduledDate: daysAhead(1), scheduledTime: '10:00-12:00', timeSlot: { start: '10:00', end: '12:00' },
        paymentMethod: 'cash', bookingType: 'scheduled'
      });
      assert.strictEqual(res.status, 201, JSON.stringify(res.body));
      await new Promise((r) => setTimeout(r, 300));
      await Booking.updateOne({ _id: res.body.data._id }, { $set: { vendorId: workerId, status: 'assigned', ...over } });
      return String(res.body.data._id);
    };
    const wReq = (id, body, who = workerId) => request(app).post(`/api/workers/bookings/${id}/reschedule-request`).set(workerAuth(who)).send(body);
    const respond = (id, accept) => request(app).post(`/api/users/bookings/${id}/reschedule-request/respond`).set(userAuth).send({ accept });
    const uMove = (id, body) => request(app).put(`/api/users/bookings/${id}/reschedule`).set(userAuth).send(body);

    console.log('\n== partner asks, customer decides ==');
    const id = await newBooking();
    const before = (await Booking.findById(id)).scheduledDate.getTime();

    await it('partner sends a request; the booking itself does not change yet', async () => {
      const res = await wReq(id, { ...slot(3), reason: 'Stuck on another job' });
      assert.strictEqual(res.status, 200, JSON.stringify(res.body));
      const b = await Booking.findById(id);
      assert.strictEqual(b.rescheduleRequest.status, 'pending');
      assert.strictEqual(b.scheduledDate.getTime(), before);
      assert.strictEqual(b.rescheduleCount, 0);
    });
    await it('a second request while one is waiting is refused', async () => {
      assert.strictEqual((await wReq(id, slot(4))).status, 400);
    });
    await it('another partner cannot ask for this booking', async () => {
      assert.strictEqual((await wReq(id, slot(4), otherWorkerId)).status, 404);
    });
    await it('customer declines: nothing moves, request is closed', async () => {
      const res = await respond(id, false);
      assert.strictEqual(res.status, 200, JSON.stringify(res.body));
      const b = await Booking.findById(id);
      assert.strictEqual(b.rescheduleRequest.status, 'declined');
      assert.strictEqual(b.scheduledDate.getTime(), before);
    });
    await it('answering when nothing is waiting is refused', async () => {
      assert.strictEqual((await respond(id, true)).status, 400);
    });
    await it('customer accepts a new request: the booking moves and is counted', async () => {
      assert.strictEqual((await wReq(id, slot(3))).status, 200);
      const res = await respond(id, true);
      assert.strictEqual(res.status, 200, JSON.stringify(res.body));
      const b = await Booking.findById(id);
      assert.strictEqual(b.rescheduleRequest.status, 'accepted');
      assert.strictEqual(b.timeSlot.start, '14:00');
      assert.notStrictEqual(b.scheduledDate.getTime(), before);
      assert.strictEqual(b.rescheduleCount, 1);
      assert.ok(b.statusHistory.some((h) => h.event === 'reschedule_requested' && h.by === 'worker'));
    });
    await it('the customer moving it themselves closes a pending request', async () => {
      assert.strictEqual((await wReq(id, slot(5))).status, 200);
      assert.strictEqual((await uMove(id, slot(6))).status, 200);
      const b = await Booking.findById(id);
      assert.notStrictEqual(b.rescheduleRequest.status, 'pending');
      assert.strictEqual(b.rescheduleCount, 2);
    });
    await it('a request for a time that is not an offered slot is refused', async () => {
      const bid = await newBooking();
      assert.strictEqual((await wReq(bid, slot(3, '03:00', '04:00'))).status, 400);
    });
    await it('no request once the visit is under way', async () => {
      const bid = await newBooking({ status: 'journey_started' });
      assert.strictEqual((await wReq(bid, slot(3))).status, 400);
    });

    console.log('\n== admin controls ==');
    await it('partner requests switched off: partner refused, customer can still move it', async () => {
      const bid = await newBooking();
      await setConfig({ isWorkerRescheduleEnabled: false });
      assert.strictEqual((await wReq(bid, slot(3))).status, 403);
      assert.strictEqual((await uMove(bid, slot(3))).status, 200);
    });
    await it('rescheduling switched off: customer and partner both refused', async () => {
      const bid = await newBooking();
      await setConfig({ isRescheduleEnabled: false });
      assert.strictEqual((await uMove(bid, slot(3))).status, 403);
      assert.strictEqual((await wReq(bid, slot(3))).status, 403);
    });
    await it('a limit of 1 allows the first move and refuses the second', async () => {
      const bid = await newBooking();
      await setConfig({ rescheduleMaxCount: 1 });
      assert.strictEqual((await uMove(bid, slot(8))).status, 200);
      const second = await uMove(bid, slot(9));
      assert.strictEqual(second.status, 400);
      assert.ok(/maximum of 1/.test(second.body.message), second.body.message);
      assert.strictEqual((await wReq(bid, slot(10))).status, 400);
    });
    await it('cut-off: too close to the appointment is refused', async () => {
      const bid = await newBooking({ scheduledDate: new Date(Date.now() + 3 * 60 * 60 * 1000), timeSlot: { start: String(new Date(Date.now() + 3 * 60 * 60 * 1000).getHours()).padStart(2, '0') + ':00', end: '23:00' } });
      await setConfig({ rescheduleCutoffHours: 24 });
      assert.strictEqual((await uMove(bid, slot(5))).status, 400);
    });
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('Test harness error:', e); process.exit(1); });
