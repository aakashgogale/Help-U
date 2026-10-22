/**
 * Customer Coupon Controller
 *
 * Checkout-side coupon endpoints. Both are read-only — a coupon is only
 * actually consumed when the booking is created.
 */

const { validateCoupon, getAvailableCoupons } = require('../../services/couponService');

/**
 * POST /api/users/coupons/validate
 * Checks a typed code against the current order.
 *
 * Always responds 200: an invalid code is a normal outcome the UI renders
 * inline, not a request error.
 */
exports.validate = async (req, res) => {
  try {
    const { code, orderAmount, categoryId, serviceId, cityId, zoneId } = req.body || {};

    const result = await validateCoupon(code, {
      userId: req.user.id,
      orderAmount,
      categoryId,
      serviceId,
      cityId,
      zoneId
    });

    if (!result.valid) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: result.reason
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      coupon: {
        code: result.coupon.code,
        title: result.coupon.title,
        description: result.coupon.description,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue
      },
      discount: result.discount,
      message: `₹${result.discount} discount applied`
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ success: false, message: 'Failed to validate coupon' });
  }
};

/**
 * GET /api/users/coupons/available
 * Coupons to list on the checkout screen.
 */
exports.available = async (req, res) => {
  try {
    const coupons = await getAvailableCoupons({
      userId: req.user.id,
      orderAmount: Number(req.query.orderAmount) || 0,
      categoryId: req.query.categoryId,
      serviceId: req.query.serviceId,
      cityId: req.query.cityId,
      zoneId: req.query.zoneId
    });

    res.status(200).json({ success: true, coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ success: false, message: 'Failed to load coupons' });
  }
};
