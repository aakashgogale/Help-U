const { validationResult } = require('express-validator');
const Worker = require('../../models/Worker');

const MAX_ADDRESSES = 10;
const ADDRESS_TYPES = ['home', 'office', 'custom'];

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Makes an address the one job dispatch and service area read from
const applyAsBase = (worker, entry) => {
  worker.address = {
    fullAddress: entry.fullAddress,
    addressLine1: entry.addressLine1 || '',
    addressLine2: entry.addressLine2 || '',
    city: entry.city || '',
    state: entry.state || '',
    pincode: entry.pincode || '',
    landmark: entry.landmark || '',
    lat: entry.lat,
    lng: entry.lng
  };
  worker.location = { lat: entry.lat, lng: entry.lng, updatedAt: new Date() };
  worker.geoLocation = { type: 'Point', coordinates: [entry.lng, entry.lat] };
};

const setActive = (worker, entryId) => {
  worker.savedAddresses.forEach((a) => { a.isActive = String(a._id) === String(entryId); });
  applyAsBase(worker, worker.savedAddresses.id(entryId));
};

// Partners who saved one address before this list existed get it as their first entry
const importLegacyAddress = (worker) => {
  if (worker.savedAddresses.length > 0) return false;
  const addr = worker.address || {};
  const lat = Number(addr.lat ?? worker.location?.lat);
  const lng = Number(addr.lng ?? worker.location?.lng);
  if (!addr.fullAddress || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return false;
  worker.savedAddresses.push({
    addressType: 'office',
    fullAddress: addr.fullAddress,
    addressLine1: addr.addressLine1 || '',
    addressLine2: addr.addressLine2 || '',
    city: addr.city || '',
    state: addr.state || '',
    pincode: addr.pincode || '',
    landmark: addr.landmark || '',
    lat,
    lng,
    isActive: true
  });
  return true;
};

// Keeps the list in step when the base address is changed through the older profile / address calls
const mirrorBaseAddress = (worker) => {
  const addr = worker.address || {};
  const lat = Number(addr.lat);
  const lng = Number(addr.lng);
  if (!addr.fullAddress || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const active = worker.savedAddresses.find((a) => a.isActive);
  const fields = {
    fullAddress: addr.fullAddress,
    addressLine1: addr.addressLine1 || '',
    addressLine2: addr.addressLine2 || '',
    city: addr.city || '',
    state: addr.state || '',
    pincode: addr.pincode || '',
    landmark: addr.landmark || '',
    lat,
    lng
  };
  if (active) Object.assign(active, fields);
  else worker.savedAddresses.push({ ...fields, addressType: 'office', isActive: true });
};

const readFields = (body) => {
  const addressType = ADDRESS_TYPES.includes(body.addressType) ? body.addressType : 'office';
  return {
    addressType,
    customName: addressType === 'custom' ? String(body.customName || '').trim().slice(0, 40) : '',
    fullAddress: String(body.fullAddress || '').trim(),
    addressLine1: String(body.addressLine1 || '').trim(),
    addressLine2: String(body.addressLine2 || '').trim(),
    city: String(body.city || '').trim(),
    state: String(body.state || '').trim(),
    pincode: String(body.pincode || '').trim(),
    landmark: String(body.landmark || '').trim(),
    lat: Number(body.lat),
    lng: Number(body.lng)
  };
};

const respond = (res, worker, message) => res.status(200).json({
  success: true,
  ...(message ? { message } : {}),
  addresses: worker.savedAddresses,
  address: worker.address
});

const findWorker = async (req, res) => {
  const worker = await Worker.findById(req.user.id);
  if (!worker) fail(res, 404, 'Worker not found');
  return worker;
};

const listAddresses = async (req, res) => {
  try {
    const worker = await findWorker(req, res);
    if (!worker) return undefined;
    if (importLegacyAddress(worker)) await worker.save();
    return respond(res, worker);
  } catch (error) {
    console.error('List worker addresses error:', error);
    return fail(res, 500, 'Failed to load addresses');
  }
};

const addAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, errors.array()[0].msg);

    const worker = await findWorker(req, res);
    if (!worker) return undefined;
    importLegacyAddress(worker);
    if (worker.savedAddresses.length >= MAX_ADDRESSES) {
      return fail(res, 400, `You can save up to ${MAX_ADDRESSES} addresses`);
    }

    const isFirst = worker.savedAddresses.length === 0;
    worker.savedAddresses.push({ ...readFields(req.body), isActive: false });
    const created = worker.savedAddresses[worker.savedAddresses.length - 1];
    // The first address, or one the partner asks for, becomes the base location
    if (isFirst || req.body.makeActive === true) setActive(worker, created._id);

    await worker.save();
    return respond(res, worker, 'Address added');
  } catch (error) {
    console.error('Add worker address error:', error);
    return fail(res, 500, 'Failed to add address');
  }
};

const updateSavedAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, 400, errors.array()[0].msg);

    const worker = await findWorker(req, res);
    if (!worker) return undefined;
    const entry = worker.savedAddresses.id(req.params.id);
    if (!entry) return fail(res, 404, 'Address not found');

    Object.assign(entry, readFields(req.body));
    if (entry.isActive) applyAsBase(worker, entry);

    await worker.save();
    return respond(res, worker, 'Address updated');
  } catch (error) {
    console.error('Update worker saved address error:', error);
    return fail(res, 500, 'Failed to update address');
  }
};

const activateAddress = async (req, res) => {
  try {
    const worker = await findWorker(req, res);
    if (!worker) return undefined;
    if (!worker.savedAddresses.id(req.params.id)) return fail(res, 404, 'Address not found');

    setActive(worker, req.params.id);
    await worker.save();
    return respond(res, worker, 'Base location changed');
  } catch (error) {
    console.error('Activate worker address error:', error);
    return fail(res, 500, 'Failed to change base location');
  }
};

const deleteAddress = async (req, res) => {
  try {
    const worker = await findWorker(req, res);
    if (!worker) return undefined;
    const entry = worker.savedAddresses.id(req.params.id);
    if (!entry) return fail(res, 404, 'Address not found');
    // Jobs are matched on the base location, so there must always be one
    if (entry.isActive) {
      return fail(res, 400, 'This is your base location. Make another address your base before deleting it.');
    }

    entry.deleteOne();
    await worker.save();
    return respond(res, worker, 'Address deleted');
  } catch (error) {
    console.error('Delete worker address error:', error);
    return fail(res, 500, 'Failed to delete address');
  }
};

module.exports = {
  listAddresses,
  addAddress,
  updateSavedAddress,
  activateAddress,
  deleteAddress,
  mirrorBaseAddress
};
