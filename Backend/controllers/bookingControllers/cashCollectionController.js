const Booking = require('../../models/Booking');
const Worker = require('../../models/Worker');
const Transaction = require('../../models/Transaction');
const { PAYMENT_STATUS, BOOKING_STATUS } = require('../../utils/constants');
const { recordBookingEarning } = require('../../services/earningTrackerService');
const { createQRCode, getQRCodePayments, closeQRCode } = require('../../services/razorpayService');
const { billLockReason } = require('../../utils/billLock');
const { getBookingConfig } = require('../../utils/bookingConfig');

const getRemainingPayableAmount = (booking) => {
  const advancePaid = booking.advancePayment?.status === 'paid'
    ? Number(booking.advancePayment?.paidAmount || booking.advancePayment?.requestedAmount || 0)
    : 0;
  if (booking.userPayableAmount != null && Number.isFinite(Number(booking.userPayableAmount))) {
    return Math.max(0, Number(booking.userPayableAmount));
  }
  const total = Number(booking.finalAmount ?? 0);
  return Number.isFinite(total) ? Math.max(0, total - advancePaid) : 0;
};

// Falls back to the admin-configured default commission rate when a
// booking has no WorkerBill yet, instead of a hardcoded 20/80 split.
const getDefaultWorkerShare = async () => {
  const config = await getBookingConfig();
  return (config.servicePayoutPercentage ?? 80) / 100;
};

/**
 * Withdraw a bill that was sent to the customer (worker pressed Back on the review step).
 * The customer's pay buttons, amount and code disappear until the worker sends it again.
 * Refused once the payment is done, so it can never undo a completed payment.
 */
exports.retractBill = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (String(booking.vendorId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this booking' });
    }
    if (booking.status !== BOOKING_STATUS.WORK_DONE) {
      return res.status(400).json({ success: false, message: 'Booking is not awaiting payment' });
    }

    const lockReason = billLockReason(booking);
    if (lockReason) {
      return res.status(409).json({ success: false, message: lockReason });
    }

    // An open QR would let the customer pay the old amount: make sure nothing was paid on it, then close it
    if (booking.razorpayQrId) {
      const qrRes = await getQRCodePayments(booking.razorpayQrId);
      if (qrRes.success && (qrRes.payments || []).some((p) => p.status === 'captured')) {
        return res.status(409).json({ success: false, message: 'The customer has already paid by QR. Verify the payment instead.' });
      }
      await closeQRCode(booking.razorpayQrId);
      booking.razorpayQrId = undefined;
    }

    booking.billFinalizedAt = null;
    booking.qrPaymentInitiated = false;
    await booking.save();

    // Clear penalty on user account now that cash payment is collected
    if (booking.penalty > 0) {
      const User = require('../../models/User');
      await User.findByIdAndUpdate(booking.userId, { $set: { 'wallet.penalty': 0 } }).catch(() => null);
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        billRetracted: true,
        customerConfirmationOTP: null,
        paymentOtp: null,
        qrPaymentInitiated: false
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Retract bill error:', error);
    res.status(500).json({ success: false, message: 'Failed to withdraw the bill' });
  }
};

/**
 * Initiate Online Collection (Show QR Code)
 */
exports.initiateOnlineCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).select('+paymentOtp +customerConfirmationOTP');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const callerId = String(req.user?._id || req.user?.id);
    const isAdmin = ['admin', 'ADMIN'].includes(req.userRole);
    if (!isAdmin && String(booking.vendorId) !== callerId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this booking' });
    }

    // Optional: Update final total and extra items if provided during initiation
    const { totalAmount, extraItems } = req.body;
    // Once a bill exists the server's amount is final; a client-computed total must
    // not downgrade or tamper with the final amount.
    if (!booking.vendorBillId && totalAmount !== undefined && !isNaN(parseFloat(totalAmount))) {
      const parsedTotal = parseFloat(totalAmount);
      if (parsedTotal >= (booking.finalAmount || 0)) {
        booking.userPayableAmount = parsedTotal;
        booking.finalAmount = parsedTotal;
      }
    }

    const payableAmount = getRemainingPayableAmount(booking);

    if (!payableAmount || payableAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    // Store extra items for proper commission calculation
    if (extraItems && Array.isArray(extraItems) && extraItems.length > 0) {
      booking.workDoneDetails = {
        ...booking.workDoneDetails,
        items: extraItems.map(item => ({
          title: item.name || item.title,
          qty: Number(item.qty) || Number(item.quantity) || 1,
          price: Number(item.price) || 0
        }))
      };

      booking.extraCharges = extraItems.map(item => ({
        name: item.name || item.title,
        quantity: Number(item.qty) || Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        total: (Number(item.qty) || Number(item.quantity) || 1) * (Number(item.price) || 0)
      }));

      booking.extraChargesTotal = booking.extraCharges.reduce((sum, item) => sum + item.total, 0);
      booking.markModified('workDoneDetails');
      booking.markModified('extraCharges');
    }

    // Create QR Code
    const qrResult = await createQRCode(
      payableAmount,
      booking.bookingNumber,
      {
        bookingId: booking._id.toString(),
        type: 'vendor_initiated_online'
      }
    );

    if (!qrResult.success) {
      return res.status(500).json({ success: false, message: qrResult.error });
    }

    // Reuse existing OTP or generate new one
    const otp = booking.paymentOtp || Math.floor(1000 + Math.random() * 9000).toString();
    booking.customerConfirmationOTP = otp;
    booking.paymentOtp = otp;

    // Store QR ID to track later
    booking.razorpayQrId = qrResult.qrCodeId;
    booking.paymentMethod = 'online'; // Mark as online as soon as QR is shown
    booking.billFinalizedAt = new Date();
    await booking.save();

    // Clear penalty on user account now that cash payment is collected
    if (booking.penalty > 0) {
      const User = require('../../models/User');
      await User.findByIdAndUpdate(booking.userId, { $set: { 'wallet.penalty': 0 } }).catch(() => null);
    }

    // Emit socket event to user with full bill details & OTP
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        finalAmount: booking.finalAmount,
        userPayableAmount: payableAmount,
        workDoneDetails: booking.workDoneDetails,
        qrPaymentInitiated: true,
        customerConfirmationOTP: otp,
        paymentOtp: otp
      });
    }

    // Send Push Notification with OTP
    try {
      const { createNotification } = require('../notificationControllers/notificationController');
      await createNotification({
        userId: booking.userId,
        type: 'work_done',
        title: 'Payment Request & Bill Ready',
        message: `Bill: ₹${booking.finalAmount}. OTP: ${otp}. Please verify bill and pay online or share OTP.`,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high',
        pushData: {
          type: 'work_done',
          bookingId: booking._id.toString(),
          paymentOtp: otp,
          link: `/user/booking/${booking._id}`
        }
      });
    } catch (notificationError) {
      console.error('Notification error in initiateOnlineCollection:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'QR Code generated',
      data: {
        qrImageUrl: qrResult.imageUrl,
        paymentUrl: qrResult.paymentUrl,
        amount: payableAmount,
        isManualUpi: qrResult.isManualUpi || false
      }
    });
  } catch (error) {
    console.error('Initiate online collection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Initiate Cash Collection
 * Optional: Sends OTP to customer
 */
exports.initiateCashCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).select('+paymentOtp +customerConfirmationOTP');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const callerId = String(req.user?._id || req.user?.id);
    const isAdmin = ['admin', 'ADMIN'].includes(req.userRole);
    if (!isAdmin && String(booking.vendorId) !== callerId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this booking' });
    }

    // Allow cash, pay_at_home, online (if user changes mind), AND plan_benefit (for final bill flow)
    const allowedMethods = ['cash', 'pay_at_home', 'plan_benefit', 'online'];
    if (!allowedMethods.includes(booking.paymentMethod)) {
      return res.status(400).json({ success: false, message: 'This booking is not eligible for cash collection' });
    }

    // Optional: Update final total and extra items if provided during initiation
    const { totalAmount, extraItems } = req.body;
    if (!booking.vendorBillId && totalAmount !== undefined && !isNaN(parseFloat(totalAmount))) {
      const parsedTotal = parseFloat(totalAmount);
      if (parsedTotal >= (booking.finalAmount || 0)) {
        booking.userPayableAmount = parsedTotal;
        booking.finalAmount = parsedTotal;
      }
    }

    // Store extra items for proper commission calculation
    if (extraItems && Array.isArray(extraItems) && extraItems.length > 0) {
      // 1. Update workDoneDetails (Frontend display)
      booking.workDoneDetails = {
        ...booking.workDoneDetails,
        items: extraItems.map(item => ({
          title: item.name || item.title,
          qty: Number(item.qty) || Number(item.quantity) || 1,
          price: Number(item.price) || 0
        }))
      };

      // 2. Update extraCharges (Backend calculation)
      booking.extraCharges = extraItems.map(item => ({
        name: item.name || item.title,
        quantity: Number(item.qty) || Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        total: (Number(item.qty) || Number(item.quantity) || 1) * (Number(item.price) || 0)
      }));

      // 3. Update extraChargesTotal
      booking.extraChargesTotal = booking.extraCharges.reduce((sum, item) => sum + item.total, 0);
    }

    // Force mark modified for nested object (just in case)
    if (extraItems) {
      booking.markModified('workDoneDetails');
      booking.markModified('extraCharges');
    }

    // Reset QR payment flag and switch method if switching back to cash
    booking.qrPaymentInitiated = false;
    if (booking.paymentMethod === 'online') {
      booking.paymentMethod = 'cash';
    }

    // Reuse existing OTP or generate new one
    const otp = booking.paymentOtp || Math.floor(1000 + Math.random() * 9000).toString();
    booking.customerConfirmationOTP = otp;
    booking.paymentOtp = otp;
    booking.billFinalizedAt = new Date();
    await booking.save();

    // Clear penalty on user account now that cash payment is collected
    if (booking.penalty > 0) {
      const User = require('../../models/User');
      await User.findByIdAndUpdate(booking.userId, { $set: { 'wallet.penalty': 0 } }).catch(() => null);
    }

    // Emit socket event to user with full bill details and OTP
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        finalAmount: booking.finalAmount,
        userPayableAmount: getRemainingPayableAmount(booking),
        customerConfirmationOTP: booking.customerConfirmationOTP,
        paymentOtp: booking.paymentOtp,
        workDoneDetails: booking.workDoneDetails,
        qrPaymentInitiated: false
      });
    }

    // Send Push Notification with OTP
    const { createNotification } = require('../notificationControllers/notificationController');
    await createNotification({
      userId: booking.userId,
      type: 'work_done',
      title: 'Payment Request & Bill Ready',
      message: `Bill: ₹${booking.finalAmount}. OTP: ${otp}. Please verify bill and share OTP to complete payment.`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high',
      pushData: {
        type: 'work_done',
        bookingId: booking._id.toString(),
        paymentOtp: otp,
        link: `/user/booking/${booking._id}`
      }
    });

    res.status(200).json({
      success: true,
      message: 'Bill finalized',
      totalAmount: getRemainingPayableAmount(booking)
    });
  } catch (error) {
    console.error('Initiate cash collection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Confirm Cash Collection (by Worker)
 * Uses WorkerBill as the single source of truth for earnings.
 */
exports.confirmCashCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp, amount, extraItems } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const booking = await Booking.findById(id).select('+paymentOtp +customerConfirmationOTP');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const callerId = String(req.user?._id || req.user?.id);
    const isAdmin = ['admin', 'ADMIN'].includes(req.userRole);
    if (!isAdmin && String(booking.vendorId) !== callerId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this booking' });
    }

    // OTP Verification
    const isPlanBenefitNoExtras = booking.paymentMethod === 'plan_benefit' && (booking.userPayableAmount === 0 || booking.finalAmount === 0);
    const expectedOtp = (booking.customerConfirmationOTP || booking.paymentOtp || '').trim();
    const providedOtp = (otp != null) ? String(otp).trim() : '';

    if (!isPlanBenefitNoExtras) {
      if (!providedOtp) {
        return res.status(400).json({ success: false, message: 'OTP is required to confirm cash collection.' });
      }
      if (expectedOtp && providedOtp !== expectedOtp) {
        if (process.env.NODE_ENV !== 'development' || providedOtp !== '0000') {
          console.warn(`[ConfirmCash] Invalid OTP attempt for booking ${id}. Expected: ${expectedOtp}, Received: ${providedOtp}`);
          return res.status(400).json({ success: false, message: 'Invalid OTP. Please enter the correct code shared by the customer.' });
        }
      }
    }

    // --- ATOMIC LOCK AGAINST RACE CONDITIONS ---
    const updateResult = await Booking.updateOne(
      { _id: booking._id, cashCollected: { $ne: true } },
      { $set: { cashCollected: true } }
    );

    if (updateResult.modifiedCount === 0) {
      console.log(`[Race Condition Prevented] Booking ${booking._id} already processed.`);
      return res.status(200).json({
        success: true,
        message: 'Cash collection already confirmed',
        data: { bookingId: booking._id }
      });
    }

    const collectionAmount = (!booking.vendorBillId && amount !== undefined) ? Number(amount) : getRemainingPayableAmount(booking);

    // Store extra items in workDoneDetails (for display)
    if (extraItems && Array.isArray(extraItems) && extraItems.length > 0) {
      booking.workDoneDetails = {
        ...booking.workDoneDetails,
        items: extraItems.map(item => ({
          title: item.name || item.title,
          qty: Number(item.qty) || Number(item.quantity) || 1,
          price: Number(item.price) || 0
        }))
      };

      booking.extraCharges = extraItems.map(item => ({
        name: item.name || item.title,
        quantity: Number(item.qty) || Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        total: (Number(item.qty) || Number(item.quantity) || 1) * (Number(item.price) || 0)
      }));

      booking.extraChargesTotal = booking.extraCharges.reduce((sum, item) => sum + item.total, 0);
      booking.markModified('workDoneDetails');
      booking.markModified('extraCharges');
    }

    // Fetch WorkerBill (single source of truth for earnings)
    const WorkerBill = require('../../models/WorkerBill');
    const bill = await WorkerBill.findOne({ bookingId: booking._id });

    let vendorEarning = 0;
    let grandTotal = collectionAmount;

    if (bill) {
      vendorEarning = Number(bill.vendorTotalEarning) || 0;
      grandTotal = Number(bill.grandTotal) || 0;

      // Sync booking fields from bill to ensure data consistency
      booking.basePrice = bill.originalServiceBase;
      booking.tax = bill.originalGST + bill.vendorServiceGST + bill.partsGST;
      booking.visitingCharges = bill.visitingCharges;
      booking.finalAmount = bill.grandTotal;
      booking.userPayableAmount = collectionAmount;

      // Mark bill as paid
      bill.status = 'paid';
      bill.paidAt = new Date();
      await bill.save();
    }

    // Update Booking
    booking.finalAmount = grandTotal;
    booking.userPayableAmount = collectionAmount;
    booking.cashCollected = true;
    booking.cashCollectedAt = new Date();
    booking.cashCollectedBy = 'vendor';
    booking.cashCollectorId = userId;

    if (booking.paymentMethod === 'plan_benefit') {
      booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
    } else {
      booking.paymentStatus = PAYMENT_STATUS.COLLECTED_BY_WORKER;
      booking.paymentMethod = 'cash collected'; // Standardized label
    }

    if (booking.status === 'work_done' || booking.status === 'visited' || booking.status === 'in_progress') {
      booking.status = 'completed';
      booking.completedAt = new Date();
    }

    // Clear OTPs on completion
    booking.paymentOtp = undefined;
    booking.customerConfirmationOTP = undefined;

    await booking.save();

    // Clear penalty on user account now that cash payment is collected
    if (booking.penalty > 0) {
      const User = require('../../models/User');
      await User.findByIdAndUpdate(booking.userId, { $set: { 'wallet.penalty': 0 } }).catch(() => null);
    }

    // Update Worker Wallet
    const vendorId = booking.vendorId;
    const worker = await Worker.findById(vendorId).lean();
    let newDues = 0;

    if (worker) {
      newDues = (worker.wallet?.dues || 0) + collectionAmount;
      const newEarnings = (worker.wallet?.earnings || 0) + vendorEarning;
      const cashLimit = worker.wallet?.cashLimit || 10000;
      const netOwed = newDues - newEarnings;
      const isOverLimit = netOwed > cashLimit;

      const walletUpdate = {
        $inc: {
          'wallet.dues': collectionAmount,
          'wallet.earnings': vendorEarning,
          'wallet.totalCashCollected': collectionAmount
        }
      };

      if (isOverLimit) {
        walletUpdate.$set = {
          'wallet.isBlocked': true,
          'wallet.blockedAt': new Date(),
          'wallet.blockReason': `Cash limit exceeded. Net owed: ₹${netOwed.toFixed(2)}, Limit: ₹${cashLimit}`
        };
      } else {
        walletUpdate.$set = { availability: 'AVAILABLE' };
      }

      await Worker.findByIdAndUpdate(vendorId, walletUpdate, { runValidators: false });

      // Record Transaction - Cash Collected
      try {
        await Transaction.create({
          vendorId,
          userId: booking.userId,
          bookingId: booking._id,
          amount: collectionAmount,
          type: 'cash_collected',
          paymentMethod: 'cash collected',
          description: `Cash ₹${grandTotal} collected for booking ${booking.bookingNumber}`,
          status: 'completed',
          metadata: {
            type: 'dues_increase',
            collectedBy: userRole,
            billId: bill?._id?.toString(),
            vendorEarning,
            companyRevenue: bill?.companyRevenue
          }
        });
      } catch (txnErr) {
        console.error('[ConfirmCash] Transaction 1 (cash_collected) failed:', txnErr);
        // We don't throw here to ensure the payment status remains 'completed' since booking.save and Worker update already finished
      }

      // Record Transaction - Earnings Credit
      if (vendorEarning > 0) {
        try {
          await Transaction.create({
            vendorId,
            bookingId: booking._id,
            amount: vendorEarning,
            type: 'earnings_credit',
            paymentMethod: 'system',
            description: `Earnings ₹${vendorEarning} credited for booking ${booking.bookingNumber}`,
            status: 'completed',
            metadata: {
              type: 'earnings_increase',
              billId: bill?._id?.toString(),
              serviceEarning: bill?.vendorServiceEarning,
              partsEarning: bill?.vendorPartsEarning
            }
          });
        } catch (txnErr) {
          console.error('[ConfirmCash] Transaction 2 (earnings_credit) failed:', txnErr);
        }
      }
    }

    // Record stats in the Daily Earning Tracker (Async)
    const defaultShareConfirmCash = bill ? null : await getDefaultWorkerShare();
    recordBookingEarning({
      date: new Date(),
      totalRevenue: bill ? bill.grandTotal : collectionAmount,
      platformCommission: bill ? (bill.companyRevenue || 0) : (collectionAmount * (1 - defaultShareConfirmCash)),
      vendorEarnings: vendorEarning > 0 ? vendorEarning : (collectionAmount * defaultShareConfirmCash),
      totalGST: bill ? (bill.totalGST || 0) : 0,
      totalTDS: 0 // Captured separately during withdrawal
    }).catch(err => console.error('[ConfirmCash] Daily tracker failed:', err));

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        status: booking.status,
        cashCollected: true,
        message: 'Payment recorded and booking completed!'
      });
    }

    // Push Notification
    const { createNotification } = require('../notificationControllers/notificationController');
    await createNotification({
      userId: booking.userId,
      type: 'payment_received',
      title: 'Payment Received (Cash)',
      message: `Payment of ₹${collectionAmount} received in cash. Job Completed. Thanks!`,
      relatedId: booking._id,
      relatedType: 'booking',
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: 'Cash collection confirmed and recorded in ledger',
      data: {
        bookingId: booking._id,
        amount: collectionAmount,
        walletDues: worker ? newDues : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Customer Confirm Payment (Optional flow for user to confirm they paid)
 */
exports.customerConfirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).select('+paymentOtp +customerConfirmationOTP');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const callerId = String(req.user?._id || req.user?.id);
    const isAdmin = ['admin', 'ADMIN'].includes(req.userRole);
    if (!isAdmin && String(booking.userId) !== callerId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this booking' });
    }

    booking.customerConfirmed = true;
    await booking.save();

    // Clear penalty on user account now that cash payment is collected
    if (booking.penalty > 0) {
      const User = require('../../models/User');
      await User.findByIdAndUpdate(booking.userId, { $set: { 'wallet.penalty': 0 } }).catch(() => null);
    }

    res.status(200).json({ success: true, message: 'Payment confirmed by customer' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Cash Collection Status
 */
/**
 * Verify Online Payment & Complete Job
 * POST /api/bookings/cash/:id/verify-online
 */
exports.verifyOnlinePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).select('+paymentOtp +customerConfirmationOTP');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const callerId = String(req.user?._id || req.user?.id);
    const isAdmin = ['admin', 'ADMIN'].includes(req.userRole);
    if (!isAdmin && String(booking.vendorId) !== callerId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this booking' });
    }

    if (!booking.razorpayQrId) {
      return res.status(400).json({ success: false, message: 'No online payment initiated for this booking' });
    }

    // Only allow if status is WORK_DONE or already COMPLETED (idempotency)
    if (booking.status !== BOOKING_STATUS.WORK_DONE && booking.status !== BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, message: `Cannot verify payment for booking in ${booking.status} status` });
    }

    // Idempotency: if already paid, return immediately to prevent double crediting earnings
    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS || booking.paymentStatus === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified and completed',
        status: booking.status
      });
    }

    const qrRes = await getQRCodePayments(booking.razorpayQrId);

    if (qrRes.success && qrRes.payments && qrRes.payments.length > 0) {
      const capturedPayment = qrRes.payments.find(p => p.status === 'captured');

      if (capturedPayment) {
        console.log(`[QR Verify] Finalizing booking ${booking.bookingNumber}`);

        // 1. Update Booking
        booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
        booking.paymentMethod = 'Qr online';
        booking.cashCollected = false; // Ensure it's not counted as cash
        booking.razorpayPaymentId = capturedPayment.id;
        booking.paymentId = capturedPayment.id;

        if (booking.status !== BOOKING_STATUS.COMPLETED) {
          booking.status = BOOKING_STATUS.COMPLETED;
          booking.completedAt = new Date();
        }

        // Clear OTPs on completion
        booking.paymentOtp = undefined;
        booking.customerConfirmationOTP = undefined;

        await booking.save();

    // Clear penalty on user account now that cash payment is collected
    if (booking.penalty > 0) {
      const User = require('../../models/User');
      await User.findByIdAndUpdate(booking.userId, { $set: { 'wallet.penalty': 0 } }).catch(() => null);
    }

        // 2. Handle Earnings & Wallet
        const WorkerBill = require('../../models/WorkerBill');
        const bill = await WorkerBill.findOne({ bookingId: booking._id });

        let vendorEarning = 0;
        if (bill) {
          vendorEarning = bill.vendorTotalEarning;
          
          // Sync booking fields from bill to ensure data consistency
          booking.basePrice = bill.originalServiceBase;
          booking.tax = bill.originalGST + bill.vendorServiceGST + bill.partsGST;
          booking.visitingCharges = bill.visitingCharges;
          booking.finalAmount = bill.grandTotal;
          booking.userPayableAmount = getRemainingPayableAmount(booking);
          
          bill.status = 'paid';
          bill.paidAt = new Date();
          await bill.save();
        } else {
          vendorEarning = booking.finalAmount * (await getDefaultWorkerShare());
        }

        const vendorId = booking.vendorId;
        const Worker = require('../../models/Worker');
        await Worker.findByIdAndUpdate(vendorId, {
          $inc: { 'wallet.earnings': vendorEarning },
          $set: { availability: 'AVAILABLE' }
        });

        // 3. Transactions
        await Transaction.create({
          userId: booking.userId,
          bookingId: booking._id,
          amount: getRemainingPayableAmount(booking),
          type: 'payment',
          paymentMethod: 'Qr online',
          status: 'completed',
          description: `Online QR payment for booking #${booking.bookingNumber}`,
          referenceId: capturedPayment.id,
          metadata: {
            source: 'vendor_qr',
            razorpayPaymentId: capturedPayment.id
          }
        });

        if (vendorEarning > 0) {
          await Transaction.create({
            vendorId: booking.vendorId,
            bookingId: booking._id,
            amount: vendorEarning,
            type: 'earnings_credit',
            paymentMethod: 'system',
            status: 'completed',
            description: `Earnings credited for online booking #${booking.bookingNumber}`,
            metadata: {
              type: 'online_earning',
              billId: bill?._id?.toString()
            }
          });
        }

        // 4. Record Stats (Async)
        recordBookingEarning({
          date: new Date(),
          totalRevenue: Number(bill ? bill.grandTotal : booking.finalAmount) || 0,
          platformCommission: Number(bill ? bill.companyRevenue : (booking.finalAmount - vendorEarning)) || 0,
          vendorEarnings: Number(vendorEarning) || 0,
          totalGST: Number(bill ? bill.totalGST : 0) || 0,
          totalTDS: 0
        }).catch(err => console.error('[ConfirmCash] Daily tracker failed:', err));

        // 5. Notify & Socket
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${booking.userId}`).emit('booking_updated', {
            bookingId: booking._id,
            status: 'completed',
            paymentStatus: 'success'
          });
          io.to(`vendor_${booking.vendorId}`).emit('booking_updated', {
            bookingId: booking._id,
            status: 'completed'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Payment verified and job completed',
          status: 'completed'
        });
      }
    }

    return res.status(200).json({
      success: false,
      message: 'Payment not yet detected by Razorpay',
      paymentStatus: 'pending'
    });

  } catch (error) {
    console.error('Verify online payment error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/**
 * Manually Confirm Online Payment (For Manual QR Fallback)
 * POST /api/bookings/cash/:id/confirm-manual-online
 */
exports.confirmManualOnlinePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    const booking = await Booking.findById(id).select('+paymentOtp +customerConfirmationOTP');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const callerId = String(req.user?._id || req.user?.id);
    const isAdmin = ['admin', 'ADMIN'].includes(req.userRole);
    if (!isAdmin && String(booking.vendorId) !== callerId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this booking' });
    }

    // OTP Verification (Mandatory for manual confirmation to prevent accidents)
    const expectedOtp = (booking.customerConfirmationOTP || booking.paymentOtp || '').trim();
    const providedOtp = (otp != null) ? String(otp).trim() : '';

    if (!providedOtp) {
      return res.status(400).json({ success: false, message: 'OTP is required for manual confirmation.' });
    }
    if (expectedOtp && providedOtp !== expectedOtp) {
      if (process.env.NODE_ENV !== 'development' || providedOtp !== '0000') {
        return res.status(400).json({ success: false, message: 'Invalid OTP. Please enter the code sent to the customer.' });
      }
    }

    // prevent race conditions
    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, message: 'Booking already completed' });
    }

    console.log(`[Manual QR Confirm] Finalizing booking ${booking.bookingNumber} manually`);

    // 1. Update Booking
    booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
    booking.paymentMethod = 'Qr online';
    booking.cashCollected = false;
    booking.paymentId = `manual_conf_${Date.now()}`;
    booking.status = BOOKING_STATUS.COMPLETED;
    booking.completedAt = new Date();
    await booking.save();

    // Clear penalty on user account now that cash payment is collected
    if (booking.penalty > 0) {
      const User = require('../../models/User');
      await User.findByIdAndUpdate(booking.userId, { $set: { 'wallet.penalty': 0 } }).catch(() => null);
    }

    // 2. Handle Earnings & Wallet (Reuse logic)
    const WorkerBill = require('../../models/WorkerBill');
    const bill = await WorkerBill.findOne({ bookingId: booking._id });

    let vendorEarning = 0;
    if (bill) {
      vendorEarning = bill.vendorTotalEarning;
      
      // Sync booking fields from bill to ensure data consistency
      booking.basePrice = bill.originalServiceBase;
      booking.tax = bill.originalGST + bill.vendorServiceGST + bill.partsGST;
      booking.visitingCharges = bill.visitingCharges;
      booking.finalAmount = bill.grandTotal;
      booking.userPayableAmount = getRemainingPayableAmount(booking);

      bill.status = 'paid';
      bill.paidAt = new Date();
      await bill.save();
    } else {
      vendorEarning = booking.finalAmount * (await getDefaultWorkerShare());
    }

    const vendorId = booking.vendorId;
    await Worker.findByIdAndUpdate(vendorId, {
      $inc: { 'wallet.earnings': vendorEarning },
      $set: { availability: 'AVAILABLE' }
    });

    // 3. Transactions
    await Transaction.create({
      userId: booking.userId,
      bookingId: booking._id,
      amount: getRemainingPayableAmount(booking),
      type: 'payment',
      paymentMethod: 'Qr online',
      status: 'completed',
      description: `Manual confirmation of UPI QR payment for booking #${booking.bookingNumber}`,
      referenceId: booking.paymentId,
      metadata: { source: 'manual_vendor_confirm' }
    });

    if (vendorEarning > 0) {
      await Transaction.create({
        vendorId: booking.vendorId,
        bookingId: booking._id,
        amount: vendorEarning,
        type: 'earnings_credit',
        paymentMethod: 'system',
        status: 'completed',
        description: `Earnings credited for manual online booking #${booking.bookingNumber}`,
        metadata: { type: 'online_earning', billId: bill?._id?.toString() }
      });
    }

    // 4. Record Stats (Async)
    recordBookingEarning({
      date: new Date(),
      totalRevenue: Number(bill ? bill.grandTotal : booking.finalAmount) || 0,
      platformCommission: Number(bill ? bill.companyRevenue : (booking.finalAmount - vendorEarning)) || 0,
      vendorEarnings: Number(vendorEarning) || 0,
      totalGST: Number(bill ? bill.totalGST : 0) || 0,
      totalTDS: 0
    }).catch(err => console.error('[ConfirmManual] Daily tracker failed:', err));

    // 5. Notify & Socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${booking.userId}`).emit('booking_updated', {
        bookingId: booking._id,
        status: 'completed',
        paymentStatus: 'success'
      });
      io.to(`vendor_${booking.vendorId}`).emit('booking_updated', {
        bookingId: booking._id,
        status: 'completed',
        paymentMethod: 'online'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment confirmed manually and job completed',
      status: 'completed'
    });

  } catch (error) {
    console.error('Confirm manual online payment error:', error);
    res.status(500).json({ success: false, message: 'Manual confirmation failed' });
  }
};

/**
 * Get Cash / Payment Status
 * Read-only check for UI
 */
exports.getCashCollectionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).select('+paymentOtp +customerConfirmationOTP');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const callerId = String(req.user?._id || req.user?.id);
    const isAdmin = ['admin', 'ADMIN'].includes(req.userRole);
    if (!isAdmin && String(booking.userId) !== callerId && String(booking.vendorId) !== callerId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this booking' });
    }

    const statusData = {
      bookingId: booking._id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      cashCollected: booking.cashCollected || false,
      isPaid: booking.paymentStatus === PAYMENT_STATUS.SUCCESS
    };

    if (booking.razorpayQrId && booking.paymentStatus === PAYMENT_STATUS.PENDING) {
      const qrRes = await getQRCodePayments(booking.razorpayQrId);
      if (qrRes.success && qrRes.payments && qrRes.payments.length > 0) {
        const captured = qrRes.payments.find(p => p.status === 'captured');
        if (captured) {
          statusData.paymentDetected = true;
          statusData.paymentId = captured.id;
        }
      }
    }

    res.status(200).json({
      success: true,
      data: statusData
    });

  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch status' });
  }
};
