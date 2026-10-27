const User = require('../models/User');
const Transaction = require('../models/Transaction');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const MAX_QUANTITY = 100000;

/**
 * Works out what a pickup is worth from the weights the professional entered.
 *   entries: [{ itemId, actualQuantity }]. Every item needs a weight; 0 means "not collected".
 * Posted-rate items are paid rate x actual weight, using the rate saved on the request. Quote items
 * are paid the amount the admin quoted (or nothing when not collected).
 * Returns { items: [{ itemId, actualQuantity, finalAmount }], total } or { error }.
 */
const computeWeighing = (scrap, entries) => {
  const byId = new Map((Array.isArray(entries) ? entries : []).map((e) => [String(e?.itemId), e]));
  const out = [];
  let total = 0;

  for (const item of scrap.items || []) {
    const entry = byId.get(String(item._id));
    if (!entry) return { error: `Enter the weight of ${item.name}.` };

    let quantity = Number(entry.actualQuantity);
    if (!Number.isFinite(quantity) || quantity < 0) return { error: `The weight of ${item.name} is not valid.` };
    if (quantity > MAX_QUANTITY) return { error: `That is too much ${item.name}. Please check the weight.` };
    quantity = item.unit === 'piece' ? Math.round(quantity) : round2(quantity);

    let finalAmount;
    if (quantity === 0) finalAmount = 0;
    else if (item.pricingMode === 'quote') finalAmount = round2(item.quotedAmount || 0);
    else finalAmount = round2(item.rate * quantity);

    total += finalAmount;
    out.push({ itemId: item._id, actualQuantity: quantity, finalAmount });
  }

  return { items: out, total: round2(total) };
};

/**
 * Pays the customer for a finished pickup.
 *   wallet  the amount is added to their Help U wallet and recorded as a transaction
 *   cash    nothing moves here; the professional handed over cash and Help U reimburses them
 * Returns the `payout` object to store on the request.
 */
const payCustomer = async (scrap, method) => {
  const amount = round2(scrap.finalPrice);

  if (method === 'cash') {
    if (scrap.vendorId && amount > 0) {
      const Worker = require('../models/Worker');
      const worker = await Worker.findById(scrap.vendorId);
      if (worker) {
        // Reimbursing worker for paying customer in cash on behalf of the platform
        if (!worker.wallet) worker.wallet = { dues: 0, earnings: 0 };
        const currentDues = worker.wallet.dues || 0;
        if (currentDues >= amount) {
          worker.wallet.dues = currentDues - amount;
        } else {
          const remainder = amount - currentDues;
          worker.wallet.dues = 0;
          worker.wallet.earnings = (worker.wallet.earnings || 0) + remainder;
        }
        await worker.save();

        await Transaction.create({
          vendorId: worker._id,
          type: 'scrap_reimbursement',
          amount,
          status: 'completed',
          paymentMethod: 'system',
          description: `Reimbursement for cash paid to customer for scrap "${scrap.title}"`,
          metadata: { scrapId: String(scrap._id) }
        });
      }
    }
    return { method: 'cash', status: 'cash_paid_by_pro', amount, paidAt: new Date() };
  }

  if (amount > 0) {
    const user = await User.findByIdAndUpdate(scrap.userId, { $inc: { 'wallet.balance': amount } }, { new: true });
    if (!user) throw new Error('Customer not found');
    await Transaction.create({
      userId: user._id,
      type: 'credit',
      amount,
      status: 'completed',
      paymentMethod: 'wallet',
      description: `Scrap sale: ${scrap.title}`,
      balanceBefore: round2((user.wallet?.balance || 0) - amount),
      balanceAfter: user.wallet?.balance || 0,
      metadata: { scrapId: String(scrap._id) }
    });
  }
  return { method: 'wallet', status: 'paid', amount, paidAt: new Date() };
};

module.exports = { computeWeighing, payCustomer };
