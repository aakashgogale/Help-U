/**
 * Commission Service
 *
 * Works out how a bill's service and parts amounts are split between the
 * worker and the platform. Both bill generators (workerBookingController's
 * completeSelfJob and workerBillController) call this, so the rules are
 * applied identically wherever a bill is produced.
 *
 * Precedence, most specific first:
 *   worker_category rule > worker rule > category rule > global default
 */

const CommissionRule = require('../models/CommissionRule');
const { getBookingConfig } = require('../utils/bookingConfig');

const round2 = (n) => parseFloat((Number(n) || 0).toFixed(2));

/**
 * Finds the commission that applies to a worker for a category.
 *
 * Returns:
 *   {
 *     commissionType: 'percentage' | 'fixed',
 *     commissionValue,          // % kept by the platform, or ₹ per booking
 *     serviceSplitPercentage,   // worker's % of service (percentage type only)
 *     partsSplitPercentage,     // worker's % of parts
 *     source: 'global' | 'category' | 'worker' | 'worker_category',
 *     ruleId
 *   }
 */
const resolveCommission = async ({ workerId, categoryId }) => {
  const config = await getBookingConfig();
  const globalPartsSplit = config.partsPayoutPercentage;

  let rule = null;
  if (workerId || categoryId) {
    const or = [];
    if (workerId && categoryId) or.push({ scope: 'worker_category', workerId, categoryId });
    if (workerId) or.push({ scope: 'worker', workerId });
    if (categoryId) or.push({ scope: 'category', categoryId });

    const rules = await CommissionRule.find({ isActive: true, $or: or })
      .sort({ updatedAt: -1 })
      .lean();

    const rank = { worker_category: 0, worker: 1, category: 2 };
    rule = rules.sort((a, b) => rank[a.scope] - rank[b.scope])[0] || null;
  }

  if (rule) {
    const partsSplit = rule.partsPayoutPercentage ?? globalPartsSplit;
    return {
      commissionType: rule.commissionType,
      commissionValue: rule.commissionValue,
      serviceSplitPercentage: rule.commissionType === 'percentage'
        ? round2(100 - rule.commissionValue)
        : null,
      partsSplitPercentage: partsSplit,
      source: rule.scope,
      ruleId: rule._id
    };
  }

  // Global default from Settings.
  if (config.defaultCommissionType === 'fixed') {
    return {
      commissionType: 'fixed',
      commissionValue: config.defaultFixedCommission,
      serviceSplitPercentage: null,
      partsSplitPercentage: globalPartsSplit,
      source: 'global',
      ruleId: null
    };
  }

  return {
    commissionType: 'percentage',
    commissionValue: round2(100 - config.servicePayoutPercentage),
    serviceSplitPercentage: config.servicePayoutPercentage,
    partsSplitPercentage: globalPartsSplit,
    source: 'global',
    ruleId: null
  };
};

/**
 * Applies a resolved commission to bill amounts (all excluding GST).
 * Returns the worker's earnings; the caller derives company revenue.
 */
const computeWorkerEarnings = (commission, { serviceBase, partsBase }) => {
  let serviceEarning;
  if (commission.commissionType === 'fixed') {
    // The fixed fee can never push the worker's share below zero.
    serviceEarning = Math.max(0, (Number(serviceBase) || 0) - (Number(commission.commissionValue) || 0));
  } else {
    serviceEarning = ((Number(serviceBase) || 0) * (Number(commission.serviceSplitPercentage) || 0)) / 100;
  }

  const partsEarning = ((Number(partsBase) || 0) * (Number(commission.partsSplitPercentage) || 0)) / 100;

  return {
    vendorServiceEarning: round2(serviceEarning),
    vendorPartsEarning: round2(partsEarning),
    vendorTotalEarning: round2(serviceEarning + partsEarning)
  };
};

/**
 * The payoutConfig snapshot stored on the bill.
 */
const toPayoutConfig = (commission, { serviceGstPercentage, partsGstPercentage }) => ({
  serviceSplitPercentage: commission.serviceSplitPercentage ?? 0,
  partsSplitPercentage: commission.partsSplitPercentage,
  serviceGstPercentage,
  partsGstPercentage,
  commissionType: commission.commissionType,
  commissionValue: commission.commissionValue,
  commissionSource: commission.source,
  commissionRuleId: commission.ruleId
});

/**
 * Short human description for wallet transactions, e.g.
 * "70% service + 10% parts" or "service minus ₹50 fee + 10% parts".
 */
const describeCommission = (payoutConfig = {}) => {
  const parts = `${payoutConfig.partsSplitPercentage ?? 0}% parts`;
  if (payoutConfig.commissionType === 'fixed') {
    return `service minus ₹${payoutConfig.commissionValue || 0} fee + ${parts}`;
  }
  return `${payoutConfig.serviceSplitPercentage ?? 0}% service + ${parts}`;
};

module.exports = {
  resolveCommission,
  computeWorkerEarnings,
  toPayoutConfig,
  describeCommission
};
