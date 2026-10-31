export const ROLES = { ADMIN: 'ADMIN', STAFF: 'STAFF', CUSTOMER: 'CUSTOMER' };

// Staff are limited to day-to-day operations. Admin can do everything.
export const STAFF_PERMISSIONS = ['orders', 'customers', 'inventory', 'support', 'products:read'];
// ADMIN additionally holds: products:write, reviews, settings, analytics

export const COOKIES = { access: 'gs_at', refresh: 'gs_rt', guest: 'gs_guest' };

export const ORDER_TRANSITIONS = {
  PENDING: ['CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['READY_FOR_DISPATCH', 'CANCELLED', 'REFUNDED'],
  READY_FOR_DISPATCH: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

// Order statuses that mean "the customer really paid and kept the goods"
export const PURCHASED_STATUSES = ['PAID', 'PROCESSING', 'READY_FOR_DISPATCH', 'SHIPPED', 'DELIVERED'];

export const CURRENCY = 'NGN';
export const MAX_CART_QTY = 10;
