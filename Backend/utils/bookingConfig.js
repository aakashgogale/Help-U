/**
 * Booking Configuration
 *
 * Single source of truth for the admin-tunable booking features stored on the
 * global Settings document: notes, problem media, add-ons, emergency bookings,
 * chat, disputes, worker assignment, commission defaults, payouts and
 * recurring bookings.
 *
 * Every reader goes through getBookingConfig() so a field missing from an
 * older settings document resolves to the same default everywhere, and a
 * brief database outage serves the last known values instead of failing the
 * request.
 */

const Settings = require('../models/Settings');

// Each entry: [default, kind, min?, max?]. `kind` drives validation of admin
// updates in sanitizeConfigUpdate(); defaults mirror models/Settings.js.
const CONFIG_SCHEMA = {
  isCustomerNotesEnabled: [true, 'boolean'],
  customerNotesMaxLength: [500, 'number', 50, 2000],

  maxIssuePhotos: [5, 'number', 0, 10],
  isIssueVideoEnabled: [true, 'boolean'],
  maxIssueVideos: [1, 'number', 0, 3],
  maxIssueVideoSizeMB: [25, 'number', 1, 100],
  maxIssueVideoDurationSec: [60, 'number', 5, 300],

  isAddOnsEnabled: [true, 'boolean'],

  isEmergencyEnabled: [false, 'boolean'],
  emergencySurchargeType: ['fixed', 'enum', ['fixed', 'percentage']],
  emergencySurchargeValue: [199, 'number', 0, 100000],
  emergencySearchRadius: [15, 'number', 1, 200],
  emergencyFirstWaveSize: [10, 'number', 1, 50],
  emergencyMaxSearchTime: [3, 'number', 1, 60],

  isChatEnabled: [true, 'boolean'],
  isChatImageEnabled: [true, 'boolean'],
  chatCloseAfterHours: [24, 'number', 0, 720],
  chatMaskPhoneNumbers: [true, 'boolean'],

  isDisputeEnabled: [true, 'boolean'],
  disputeWindowDays: [7, 'number', 1, 90],
  maxDisputeEvidence: [5, 'number', 0, 10],
  disputeReasons: [[
    'Service not completed',
    'Poor quality of work',
    'Overcharged / billing issue',
    'Professional misbehaved',
    'Damage to property',
    'Professional did not arrive',
    'Payment issue',
    'Other'
  ], 'stringList'],

  assignmentStrategy: ['smart', 'enum', ['distance', 'smart']],
  assignmentDistanceWeight: [40, 'number', 0, 100],
  assignmentRatingWeight: [25, 'number', 0, 100],
  assignmentAcceptanceWeight: [20, 'number', 0, 100],
  assignmentCompletionWeight: [15, 'number', 0, 100],
  assignmentMinRating: [0, 'number', 0, 5],
  assignmentStatsWindowDays: [90, 'number', 7, 365],
  wave1Size: [3, 'number', 1, 50],
  wave2Size: [3, 'number', 1, 50],
  wave3Size: [4, 'number', 1, 50],
  autoReassignOnReject: [true, 'boolean'],
  autoReassignOnWorkerCancel: [true, 'boolean'],
  maxReassignments: [3, 'number', 0, 10],

  defaultCommissionType: ['percentage', 'enum', ['percentage', 'fixed']],
  defaultFixedCommission: [0, 'number', 0, 100000],

  minWithdrawalAmount: [100, 'number', 0, 1000000],

  isRecurringEnabled: [true, 'boolean'],
  recurringFrequencies: [['weekly', 'biweekly', 'monthly'], 'enumList', ['weekly', 'biweekly', 'monthly']],
  recurringMaxOccurrences: [12, 'number', 2, 52],
  recurringDiscountPercentage: [0, 'number', 0, 50],
  recurringLeadHours: [24, 'number', 1, 168]
};

// Existing settings the booking flow also needs; read here so callers have one
// place to look, but they are still edited from the Settings page.
const PASSTHROUGH_DEFAULTS = {
  serviceGstPercentage: 18,
  partsGstPercentage: 18,
  servicePayoutPercentage: 90,
  partsPayoutPercentage: 100,
  searchRadius: 10,
  maxSearchTime: 5,
  waveDuration: 60
};

const CACHE_TTL_MS = 10000;
let cached = null;
let cachedAt = 0;

const loadSettings = async () => {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) return cached;

  try {
    const settings =
      (await Settings.findOne({ type: 'global' }).lean()) ||
      (await Settings.findOne().lean());
    cached = settings || {};
    cachedAt = now;
    return cached;
  } catch (error) {
    console.error('[BookingConfig] Failed to load settings:', error.message);
    return cached || {};
  }
};

const resolveValue = (stored, [fallback, kind]) => {
  if (stored === undefined || stored === null) return fallback;
  if (kind === 'boolean') return typeof stored === 'boolean' ? stored : fallback;
  if (kind === 'number') return Number.isFinite(Number(stored)) ? Number(stored) : fallback;
  if (kind === 'stringList' || kind === 'enumList') {
    return Array.isArray(stored) && stored.length > 0 ? stored : fallback;
  }
  return stored;
};

/**
 * Full configuration, including the passthrough settings. Server-side only.
 */
const getBookingConfig = async () => {
  const settings = await loadSettings();
  const config = {};

  for (const [name, spec] of Object.entries(CONFIG_SCHEMA)) {
    config[name] = resolveValue(settings[name], spec);
  }
  for (const [name, fallback] of Object.entries(PASSTHROUGH_DEFAULTS)) {
    const value = Number(settings[name]);
    config[name] = Number.isFinite(value) && settings[name] !== null && settings[name] !== undefined
      ? value
      : fallback;
  }

  return config;
};

/**
 * The subset the user and worker apps need. Assignment weights and commission
 * defaults are internal and deliberately left out.
 */
const getPublicBookingConfig = async () => {
  const c = await getBookingConfig();
  return {
    isCustomerNotesEnabled: c.isCustomerNotesEnabled,
    customerNotesMaxLength: c.customerNotesMaxLength,
    maxIssuePhotos: c.maxIssuePhotos,
    isIssueVideoEnabled: c.isIssueVideoEnabled && c.maxIssueVideos > 0,
    maxIssueVideos: c.maxIssueVideos,
    maxIssueVideoSizeMB: c.maxIssueVideoSizeMB,
    maxIssueVideoDurationSec: c.maxIssueVideoDurationSec,
    isAddOnsEnabled: c.isAddOnsEnabled,
    isEmergencyEnabled: c.isEmergencyEnabled,
    emergencySurchargeType: c.emergencySurchargeType,
    emergencySurchargeValue: c.emergencySurchargeValue,
    isChatEnabled: c.isChatEnabled,
    isChatImageEnabled: c.isChatImageEnabled,
    isDisputeEnabled: c.isDisputeEnabled,
    disputeWindowDays: c.disputeWindowDays,
    maxDisputeEvidence: c.maxDisputeEvidence,
    disputeReasons: c.disputeReasons,
    minWithdrawalAmount: c.minWithdrawalAmount,
    isRecurringEnabled: c.isRecurringEnabled,
    recurringFrequencies: c.recurringFrequencies,
    recurringMaxOccurrences: c.recurringMaxOccurrences,
    recurringDiscountPercentage: c.recurringDiscountPercentage
  };
};

const invalidateBookingConfigCache = () => {
  cached = null;
  cachedAt = 0;
};

/**
 * Validates an admin update against CONFIG_SCHEMA.
 * Unknown keys are ignored. Returns { updates, errors }.
 */
const sanitizeConfigUpdate = (payload = {}) => {
  const updates = {};
  const errors = [];

  for (const [name, [, kind, a, b]] of Object.entries(CONFIG_SCHEMA)) {
    if (payload[name] === undefined) continue;
    const raw = payload[name];

    if (kind === 'boolean') {
      updates[name] = raw === true || raw === 'true';
    } else if (kind === 'number') {
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        errors.push(`${name} must be a number`);
      } else if (value < a || value > b) {
        errors.push(`${name} must be between ${a} and ${b}`);
      } else {
        updates[name] = value;
      }
    } else if (kind === 'enum') {
      if (!a.includes(raw)) errors.push(`${name} must be one of: ${a.join(', ')}`);
      else updates[name] = raw;
    } else if (kind === 'enumList') {
      const list = Array.isArray(raw) ? [...new Set(raw.filter((v) => a.includes(v)))] : [];
      if (list.length === 0) errors.push(`${name} needs at least one value`);
      else updates[name] = list;
    } else if (kind === 'stringList') {
      const list = Array.isArray(raw)
        ? [...new Set(raw.map((v) => String(v || '').trim()).filter(Boolean))].slice(0, 30)
        : [];
      if (list.length === 0) errors.push(`${name} needs at least one value`);
      else updates[name] = list.map((v) => v.slice(0, 100));
    }
  }

  return { updates, errors };
};

module.exports = {
  CONFIG_SCHEMA,
  getBookingConfig,
  getPublicBookingConfig,
  invalidateBookingConfigCache,
  sanitizeConfigUpdate
};
