/**
 * Application constants and configuration for Smart Design Vault
 */

import type { UserRole } from '@/types';

// Authentication Constants
export const ALLOWED_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'company.com',
  'example.org'
] as const;

// Currency and Formatting
export const CURRENCY = {
  CODE: 'UGX',
  SYMBOL: 'UGX',
  LOCALE: 'en-US'
} as const;

export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  INPUT: 'yyyy-MM-dd',
  CHART: 'MMM yyyy',
  DATETIME: 'MMM dd, yyyy HH:mm'
} as const;

// Navigation Constants - Role Based
export const CLIENT_NAVIGATION = [
  { name: 'Dashboard', href: '/' },
  { name: 'Services', href: '/services' },
  { name: 'My Orders', href: '/orders' }
] as const;

export const OWNER_NAVIGATION = [
  { name: 'Dashboard', href: '/' },
  { name: 'Services', href: '/services' },
  { name: 'Orders', href: '/orders' },
  { name: 'Clients', href: '/clients' }
] as const;

export const getNavigationItems = (role: UserRole | undefined) => {
  if (role === 'owner') return OWNER_NAVIGATION;
  return CLIENT_NAVIGATION;
};

// Chart Configuration
export const CHART_CONFIG = {
  COLORS: {
    RECEIVED: '#f59e0b',     // amber
    PENDING: '#3b82f6',      // blue
    IN_PROGRESS: '#8b5cf6',  // violet
    COMPLETED: '#22c55e',    // green
    PICKED_UP: '#10b981',    // emerald
    PRIMARY: 'hsl(var(--primary))'
  },
  GRADIENTS: {
    RECEIVED: { START: '#f59e0b', END: '#f59e0b33' },
    PENDING: { START: '#3b82f6', END: '#3b82f633' },
    IN_PROGRESS: { START: '#8b5cf6', END: '#8b5cf633' },
    COMPLETED: { START: '#22c55e', END: '#22c55e33' },
    PICKED_UP: { START: '#10b981', END: '#10b98133' }
  },
  MONTHS_TO_DISPLAY: 6,
  DAYS_TO_DISPLAY: 7
} as const;

// Order Status Configuration
export const ORDER_STATUS_CONFIG = {
  received: { label: 'Received', color: '#f59e0b', icon: 'Inbox', variant: 'secondary' as const, className: 'bg-amber-100 text-amber-800 border-amber-200' },
  pending: { label: 'Pending', color: '#3b82f6', icon: 'Clock', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800 border-blue-200' },
  'in-progress': { label: 'In Progress', color: '#8b5cf6', icon: 'Loader2', variant: 'secondary' as const, className: 'bg-violet-100 text-violet-800 border-violet-200' },
  completed: { label: 'Completed', color: '#22c55e', icon: 'CheckCircle', variant: 'secondary' as const, className: 'bg-green-100 text-green-800 border-green-200' },
  'picked-up': { label: 'Picked Up', color: '#10b981', icon: 'PackageCheck', variant: 'secondary' as const, className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelled', color: '#ef4444', icon: 'XCircle', variant: 'secondary' as const, className: 'bg-red-100 text-red-800 border-red-200' }
} as const;

// Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  SERVICES: 'services',
  ORDERS: 'orders'
} as const;

// Order Configuration
export const ORDER_CONFIG = {
  NUMBER_PREFIX: 'ORD-',
  STATUS_FLOW: ['received', 'pending', 'in-progress', 'completed', 'picked-up'] as const
} as const;

// UI Constants
export const UI = {
  LOADING_STATES: {
    INITIAL: 'initial',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error'
  },
  ANIMATIONS: {
    DURATION: {
      FAST: 150,
      NORMAL: 300,
      SLOW: 500
    }
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px'
  }
} as const;

// Validation Constants
export const VALIDATION = {
  MIN_PRICE: 0,
  MAX_PRICE: 999999999,
  MIN_DESCRIPTION_LENGTH: 1,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_SERVICE_NAME_LENGTH: 2,
  MAX_SERVICE_NAME_LENGTH: 100,
  MIN_PHONE_LENGTH: 10,
  MAX_PHONE_LENGTH: 20,
  PASSWORD_MIN_LENGTH: 6,
  MIN_SOURCE_LENGTH: 2,
  MAX_SOURCE_LENGTH: 100
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_DOMAIN: 'Email domain is not allowed',
    WEAK_PASSWORD: 'Password should be at least 6 characters',
    LOGIN_FAILED: 'Login failed. Please check your credentials.',
    SIGNUP_FAILED: 'Sign up failed. Please try again.',
    ROLE_REQUIRED: 'Please select a role (Client or Business Owner)'
  },
  FORM: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_PRICE: 'Please enter a valid price',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PHONE: 'Please enter a valid phone number',
    MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
    MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`
  },
  SERVICE: {
    NOT_FOUND: 'Service not found',
    CREATE_FAILED: 'Failed to create service',
    UPDATE_FAILED: 'Failed to update service',
    DELETE_FAILED: 'Failed to delete service'
  },
  ORDER: {
    NOT_FOUND: 'Order not found',
    CREATE_FAILED: 'Failed to create order',
    UPDATE_FAILED: 'Failed to update order',
    STATUS_UPDATE_FAILED: 'Failed to update order status',
    DELETE_FAILED: 'Failed to delete order'
  },
  NETWORK: {
    GENERIC: 'Something went wrong. Please try again.',
    OFFLINE: 'You appear to be offline. Please check your connection.'
  }
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SERVICE: {
    CREATED: 'Service created successfully',
    DELETED: 'Service deleted successfully',
    UPDATED: 'Service updated successfully',
    STATUS_TOGGLED: 'Service status updated'
  },
  ORDER: {
    CREATED: 'Order placed successfully',
    DELETED: 'Order deleted successfully',
    STATUS_UPDATED: 'Order status updated successfully',
    EXPORTED: 'Orders exported to CSV'
  },
  USER: {
    PROFILE_UPDATED: 'Profile updated successfully',
    PASSWORD_UPDATED: 'Password updated successfully',
    ROLE_UPDATED: 'Role updated successfully'
  },
  AUTH: {
    LOGIN_SUCCESS: 'Welcome back!',
    SIGNUP_SUCCESS: 'Account created successfully!',
    LOGOUT_SUCCESS: 'You have been logged out'
  }
} as const;
