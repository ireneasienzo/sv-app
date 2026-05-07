/**
 * Core type definitions for the Smart Design Vault application
 */

import type { ComponentType } from 'react';

// User and Authentication Types
export type UserRole = 'client' | 'owner';

export interface User {
  $id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: UserRole;
  $createdAt: string;
  $updatedAt: string;
}

export interface UserProfileFormData {
  displayName?: string;
  photoURL?: string;
}

export interface PasswordChangeFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Service Types
export type ServiceStatus = 'active' | 'inactive';

export interface Service {
  $id: string;
  name: string;
  description: string;
  price: number;
  ownerId: string;
  ownerName: string;
  status: ServiceStatus;
  $createdAt: string;
  $updatedAt: string;
}

export interface ServiceFormData {
  name: string;
  description: string;
  price: string;
}

// Order Types
export type OrderStatus = 'received' | 'pending' | 'in-progress' | 'completed' | 'picked-up' | 'cancelled';

export interface Order {
  $id: string;
  orderNumber: string;
  serviceId: string;
  serviceName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  ownerId: string;
  description: string;
  price: number;
  status: OrderStatus;
  dateOrdered: string;
  dateCompleted?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface OrderFormData {
  serviceId: string;
  description: string;
}

// Business Profile Types
export interface BusinessProfile {
  $id: string;
  ownerId: string;
  businessName: string;
  description?: string;
  location?: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface BusinessProfileFormData {
  businessName: string;
  description?: string;
  location?: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
}

// Client Types (for owner view)
export interface Client {
  $id: string;
  name: string;
  email: string;
  phone?: string;
  totalOrders: number;
  activeOrders: number;
  $createdAt: string;
  $updatedAt: string;
}

// UI and Component Types
export interface NavigationItem {
  name: string;
  href: string;
  icon?: ComponentType<any>;
  roles?: UserRole[];
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  pickedUpOrders: number;
  totalClients?: number; // owner only
}

export interface StatusBreakdown {
  name: string;
  value: number;
  color: string;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface CollectionResponse<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
}

// CSV Export Types
export interface OrderCSVRow {
  orderNumber: string;
  serviceName: string;
  dateOrdered: string;
  price: string;
  description: string;
  serviceProvider: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderStatus: string;
}

// Configuration Types
export interface AppConfig {
  allowedDomains: string[];
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
}

// Utility Types
export type WithId<T> = T & { $id: string };
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
