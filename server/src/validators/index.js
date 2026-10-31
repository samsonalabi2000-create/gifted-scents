import { body, param, query } from 'express-validator';

export const uuidParam = (name = 'id') => param(name).isUUID().withMessage('Invalid id');
const pw = (f = 'password') => body(f).isString().isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters').matches(/[A-Za-z]/).withMessage('Password needs a letter').matches(/\d/).withMessage('Password needs a number');
const phone = (f = 'phone') => body(f).trim().matches(/^[+\d][\d\s-]{6,19}$/).withMessage('Enter a valid phone number');

export const registerRules = [
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email'), pw(),
  body('firstName').trim().isLength({ min: 1, max: 60 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1, max: 60 }).withMessage('Last name is required'),
  body('phone').optional({ values: 'falsy' }).trim().matches(/^[+\d][\d\s-]{6,19}$/).withMessage('Enter a valid phone number'),
];
export const loginRules = [body('email').isEmail().normalizeEmail(), body('password').isString().isLength({ min: 1, max: 128 })];
export const forgotRules = [body('email').isEmail().normalizeEmail()];
export const resetRules = [body('token').isString().isLength({ min: 20, max: 200 }), pw()];
export const changePasswordRules = [body('current').isString().isLength({ min: 1, max: 128 }), pw('next')];
export const profileRules = [
  body('firstName').optional().trim().isLength({ min: 1, max: 60 }), body('lastName').optional().trim().isLength({ min: 1, max: 60 }),
  body('phone').optional({ values: 'falsy' }).trim().matches(/^[+\d][\d\s-]{6,19}$/), body('preferences').optional({ nullable: true }).isObject(),
];
export const addressRules = [
  body('recipient').trim().isLength({ min: 2, max: 100 }), phone(), body('state').trim().isLength({ min: 2, max: 60 }),
  body('lga').trim().isLength({ min: 2, max: 80 }), body('addressLine').trim().isLength({ min: 5, max: 250 }),
  body('label').optional({ values: 'falsy' }).trim().isLength({ max: 40 }), body('instructions').optional({ values: 'falsy' }).trim().isLength({ max: 250 }), body('isDefault').optional().isBoolean(),
];

export const cartAddRules = [body('variantId').isUUID(), body('quantity').optional().isInt({ min: 1, max: 10 }).toInt()];
export const cartQtyRules = [uuidParam('itemId'), body('quantity').isInt({ min: 0, max: 10 }).toInt()];

export const checkoutRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Enter your full name'),
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email'), phone(),
  body('method').optional().isIn(['DELIVERY', 'PICKUP']),
  body('state').trim().isLength({ min: 2, max: 60 }).withMessage('Select your state'),
  body('lga').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your LGA / area'),
  body('address').trim().isLength({ min: 5, max: 250 }).withMessage('Enter your delivery address'),
  body('instructions').optional({ values: 'falsy' }).trim().isLength({ max: 250 }), body('couponCode').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
];
export const quoteRules = [query('state').optional().trim().isLength({ max: 60 }), query('method').optional().isIn(['DELIVERY', 'PICKUP']), query('coupon').optional().trim().isLength({ max: 40 })];

export const reviewRules = [
  body('productId').isUUID(), body('rating').isInt({ min: 1, max: 5 }).toInt(),
  body('title').optional({ values: 'falsy' }).trim().isLength({ max: 120 }), body('comment').trim().isLength({ min: 10, max: 2000 }).withMessage('Please write at least 10 characters'),
];
export const supportRules = [
  body('name').trim().isLength({ min: 2, max: 100 }), body('email').isEmail().normalizeEmail(), body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 25 }),
  body('orderNumber').optional({ values: 'falsy' }).trim().isLength({ max: 40 }), body('category').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
  body('subject').optional({ values: 'falsy' }).trim().isLength({ max: 160 }), body('message').trim().isLength({ min: 10, max: 4000 }).withMessage('Please write at least 10 characters'),
];
export const aiChatRules = [
  body('message').isString().trim().isLength({ min: 1, max: 800 }), body('sessionId').isString().isLength({ min: 8, max: 80 }),
  body('conversationId').optional({ values: 'falsy' }).isUUID(), body('history').optional().isArray({ max: 12 }),
  body('history.*.role').optional().isIn(['user', 'assistant']), body('history.*.content').optional().isString().isLength({ max: 800 }),
];
export const scentRules = [body().isObject(), body('budgetMax').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100_000_000 }), body('budgetMin').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100_000_000 })];
export const newsletterRules = [body('email').isEmail().normalizeEmail()];

export const productSaveRules = [
  body('name').trim().isLength({ min: 2, max: 160 }).withMessage('Product name is required'), body('brandId').isUUID().withMessage('Choose a brand'),
  body('type').optional().isIn(['FRAGRANCE', 'ROLL_ON', 'BODY_MIST', 'OIL_PERFUME', 'CANDLE', 'AIR_FRESHENER', 'POCKET_SCENT', 'DIFFUSER', 'BODY_CREAM', 'SOAP', 'SCRUB', 'GIFT_SET', 'DECANT', 'SAMPLE']),
  body('gender').optional().isIn(['MEN', 'WOMEN', 'UNISEX']),
  body('concentration').optional({ values: 'falsy' }).isIn(['PARFUM', 'EDP', 'EDT', 'EDC', 'COLOGNE', 'OIL', 'BODY_MIST', 'OTHER']),
  body('longevity').optional({ values: 'falsy' }).isIn(['LOW', 'MODERATE', 'LONG', 'VERY_LONG']),
  body('sillage').optional({ values: 'falsy' }).isIn(['INTIMATE', 'MODERATE', 'STRONG', 'ENORMOUS']),
  body('variants').isArray({ min: 1, max: 20 }).withMessage('Add at least one variant'),
  body('variants.*.label').trim().isLength({ min: 1, max: 40 }), body('variants.*.sku').trim().isLength({ min: 2, max: 60 }),
  body('variants.*.priceKobo').isInt({ min: 100 }).withMessage('Price must be at least ₦1'), body('variants.*.stock').optional().isInt({ min: 0 }),
  body('images').optional().isArray({ max: 12 }), body('images.*.url').optional().isString().isLength({ max: 500 }), body('images.*.storageKey').optional().isString().isLength({ max: 300 }),
  body('notes').optional().isArray({ max: 40 }), body('notes.*.layer').optional().isIn(['TOP', 'HEART', 'BASE']),
  body('relations').optional().isArray({ max: 30 }), body('relations.*.type').optional().isIn(['INSPIRED_BY', 'SIMILAR_PROFILE', 'ALTERNATIVE', 'SAME_FAMILY', 'COMPLEMENTARY']),
];
export const stockRules = [body('variantId').isUUID(), body('mode').isIn(['set', 'delta']), body('value').isInt({ min: -100000, max: 1000000 }).toInt(), body('reason').optional({ values: 'falsy' }).trim().isLength({ max: 200 })];
export const orderStatusRules = [uuidParam(), body('status').isIn(['PROCESSING', 'READY_FOR_DISPATCH', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']), body('note').optional({ values: 'falsy' }).trim().isLength({ max: 300 }), body('trackingNote').optional({ values: 'falsy' }).trim().isLength({ max: 300 })];
export const reviewModerateRules = [uuidParam(), body('status').optional().isIn(['APPROVED', 'REJECTED', 'HIDDEN', 'PENDING']), body('showOnHomepage').optional().isBoolean()];
export const ticketReplyRules = [uuidParam(), body('body').trim().isLength({ min: 1, max: 4000 })];
export const ticketStatusRules = [uuidParam(), body('status').isIn(['NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])];
export const zoneRules = [body('name').trim().isLength({ min: 1, max: 80 }), body('method').isIn(['DELIVERY', 'PICKUP']), body('feeKobo').isInt({ min: 0 }), body('freeAboveKobo').optional({ nullable: true }).isInt({ min: 0 }), body('states').optional().isArray(), body('estimatedDays').optional({ nullable: true }).isLength({ max: 80 }), body('isActive').optional().isBoolean(), body('isFallback').optional().isBoolean()];
export const couponRules = [body('code').trim().isLength({ min: 3, max: 40 }), body('type').isIn(['PERCENT', 'FIXED']), body('value').isInt({ min: 1 }), body('minSubtotalKobo').optional().isInt({ min: 0 }), body('maxUses').optional({ nullable: true }).isInt({ min: 1 }), body('expiresAt').optional({ nullable: true }).isISO8601(), body('isActive').optional().isBoolean()];
export const taxonomyRules = [body('name').trim().isLength({ min: 1, max: 80 })];
