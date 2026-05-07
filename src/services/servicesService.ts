/**
 * Service layer for managing services in Smart Design Vault
 */

import { databases, ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/constants';
import type { Service, ServiceFormData, ServiceStatus } from '@/types';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'smart-design-vault';
const SERVICES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SERVICES_COLLECTION_ID || 'services';

/**
 * Service class for managing services
 */
export class ServicesService {
  /**
   * Create a new service
   */
  static async createService(
    ownerId: string,
    ownerName: string,
    data: ServiceFormData
  ): Promise<Service & { $id: string }> {
    try {
      const now = new Date().toISOString();
      const document = await databases.createDocument(
        DATABASE_ID,
        SERVICES_COLLECTION_ID,
        ID.unique(),
        {
          name: data.name,
          description: data.description,
          price: parseInt(data.price) || 0,
          ownerId,
          ownerName,
          status: 'active' as ServiceStatus,
          $createdAt: now,
          $updatedAt: now,
        }
      );
      return document as unknown as Service & { $id: string };
    } catch (error: any) {
      console.error('Service creation error:', error);
      if (error?.type === 'user_unauthorized') {
        throw new Error('You are not authorized to create services. Please log in again.');
      }
      throw new Error(error?.message || 'Failed to create service');
    }
  }

  /**
   * Get a service by ID
   */
  static async getService(serviceId: string): Promise<(Service & { $id: string }) | null> {
    try {
      const document = await databases.getDocument(
        DATABASE_ID,
        SERVICES_COLLECTION_ID,
        serviceId
      );
      return document as unknown as Service & { $id: string };
    } catch (error) {
      return null;
    }
  }

  /**
   * List all services by owner
   */
  static async getServicesByOwner(ownerId: string): Promise<(Service & { $id: string })[]> {
    try {
      const result = await databases.listDocuments(
        DATABASE_ID,
        SERVICES_COLLECTION_ID,
        [Query.equal('ownerId', ownerId)]
      );

      return result.documents as unknown as (Service & { $id: string })[];
    } catch (error: any) {
      console.error('Get services by owner error:', {
        error,
        type: error?.type,
        code: error?.code,
        message: error?.message,
        ownerId,
        database: DATABASE_ID,
        collection: SERVICES_COLLECTION_ID
      });

      if (error?.type === 'user_unauthorized' || error?.code === 401) {
        throw new Error('You are not authorized to view services. Please log in again.');
      } else if (error?.type === 'general_unauthorized' || error?.code === 403) {
        throw new Error('Access denied. You may not have proper permissions to view services.');
      } else if (error?.message?.includes('Collection') && error?.message?.includes('not found')) {
        throw new Error('Services collection not found. Please check database setup.');
      } else if (error?.code === 'ENOTFOUND') {
        throw new Error('Unable to connect to database. Please check your connection.');
      }

      throw new Error(error?.message || 'Failed to fetch services');
    }
  }

  /**
   * List all active services (for client browsing)
   */
  static async getActiveServices(): Promise<(Service & { $id: string })[]> {
    try {
      const result = await databases.listDocuments(
        DATABASE_ID,
        SERVICES_COLLECTION_ID,
        [Query.equal('status', 'active')]
      );

      return result.documents as unknown as (Service & { $id: string })[];
    } catch (error: any) {
      console.error('Get active services error:', {
        error,
        type: error?.type,
        code: error?.code,
        message: error?.message,
        database: DATABASE_ID,
        collection: SERVICES_COLLECTION_ID
      });

      if (error?.type === 'user_unauthorized' || error?.code === 401) {
        throw new Error('You are not authorized to view services. Please log in again.');
      } else if (error?.type === 'general_unauthorized' || error?.code === 403) {
        throw new Error('Access denied. You may not have proper permissions to view services.');
      } else if (error?.message?.includes('Collection') && error?.message?.includes('not found')) {
        throw new Error('Services collection not found. Please check database setup.');
      } else if (error?.code === 'ENOTFOUND') {
        throw new Error('Unable to connect to database. Please check your connection.');
      }

      throw new Error(error?.message || 'Failed to fetch services');
    }
  }

  /**
   * Update a service
   */
  static async updateService(
    serviceId: string,
    data: Partial<ServiceFormData> & { status?: ServiceStatus }
  ): Promise<Service & { $id: string }> {
    const updates: any = {
      $updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.price !== undefined) updates.price = parseInt(data.price) || 0;
    if (data.status !== undefined) updates.status = data.status;

    const document = await databases.updateDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      serviceId,
      updates
    );
    return document as unknown as Service & { $id: string };
  }

  /**
   * Delete a service
   */
  static async deleteService(serviceId: string): Promise<void> {
    await databases.deleteDocument(
      DATABASE_ID,
      SERVICES_COLLECTION_ID,
      serviceId
    );
  }

  /**
   * Toggle service status between active and inactive
   */
  static async toggleServiceStatus(
    serviceId: string,
    currentStatus: ServiceStatus
  ): Promise<Service & { $id: string }> {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    return this.updateService(serviceId, { status: newStatus });
  }
}
