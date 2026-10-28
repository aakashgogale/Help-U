const User = require('../models/User');
const Transaction = require('../models/Transaction');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Adds a verified Razorpay payment to a customer's wallet exactly once.
 *
 * Both the app's verify call and Razorpay's webhook (which sends payment.captured AND order.paid
 * for one payment) end up here, possibly at the same instant. The payment is first CLAIMED by
 * inserting its transaction under a unique key; only the caller that wins the claim credits the
 * wallet, everyone else gets { duplicate: true } with the balance after the first credit.
 *
 *   { userId, paymentId, orderId, amount (rupees, taken from the gateway), source }
 * Returns { duplicate, balance, balanceBefore }.
 */
const creditWalletTopup = async ({ userId, paymentId, orderId, amount, source = 'verify' }) => {
  const credited = round2(amount);
  if (!(credited > 0)) throw new Error('Invalid top-up amount');

  // Records written before the unique key existed are recognised by their payment reference
  const legacy = await Transaction.findOne({ referenceId: paymentId, type: 'credit', userId });
  if (legacy) return { duplicate: true, balance: legacy.balanceAfter, balanceBefore: legacy.balanceBefore };

  let claim;
  try {
    claim = await Transaction.create({
      userId,
      type: 'credit',
      amount: credited,
      status: 'pending',
      paymentMethod: 'razorpay',
      description: source === 'webhook' ? 'Wallet Top-up (via Webhook)' : 'Wallet Top-up',
      referenceId: paymentId,
      idempotencyKey: `wallet_topup:${paymentId}`,
      metadata: { orderId, source }
    });
  } catch (err) {
    if (err && err.code === 11000) {
      const existing = await Transaction.findOne({ idempotencyKey: `wallet_topup:${paymentId}` });
      return { duplicate: true, balance: existing?.balanceAfter ?? null, balanceBefore: existing?.balanceBefore ?? null };
    }
    throw err;
  }

  try {
    const user = await User.findByIdAndUpdate(userId, { $inc: { 'wallet.balance': credited } }, { new: true });
    if (!user) throw new Error('Customer not found');
    const balance = user.wallet?.balance || 0;
    claim.status = 'completed';
    claim.balanceAfter = balance;
    claim.balanceBefore = round2(balance - credited);
    await claim.save();
    return { duplicate: false, balance, balanceBefore: claim.balanceBefore };
  } catch (err) {
    // The wallet was not credited: release the claim so a retry (or the webhook) can still do it
    await Transaction.deleteOne({ _id: claim._id }).catch(() => {});
    throw err;
  }
};

module.exports = { creditWalletTopup };
