/**
 * Service layer for managing business profiles in Smart Design Vault
 */

import { databases, ID, Query } from '@/lib/appwrite';
import type { BusinessProfile, BusinessProfileFormData } from '@/types';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'smart-design-vault';
const BUSINESS_PROFILES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_BUSINESS_PROFILES_COLLECTION_ID || 'business-profiles';

/**
 * Service class for managing business profiles
 */
export class BusinessProfileService {
  /**
   * Create a new business profile
   */
  static async createBusinessProfile(
    ownerId: string,
    data: BusinessProfileFormData
  ): Promise<BusinessProfile & { $id: string }> {
    const now = new Date().toISOString();
    const document = await databases.createDocument(
      DATABASE_ID,
      BUSINESS_PROFILES_COLLECTION_ID,
      ID.unique(),
      {
        ownerId,
        businessName: data.businessName,
        description: data.description || '',
        location: data.location || '',
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || '',
        website: data.website || '',
        $createdAt: now,
        $updatedAt: now,
      }
    );
    return document as unknown as BusinessProfile & { $id: string };
  }

  /**
   * Get a business profile by owner ID
   */
  static async getBusinessProfileByOwner(ownerId: string): Promise<(BusinessProfile & { $id: string }) | null> {
    try {
      const result = await databases.listDocuments(
        DATABASE_ID,
        BUSINESS_PROFILES_COLLECTION_ID,
        [Query.equal('ownerId', ownerId), Query.limit(1)]
      );
      
      if (result.documents.length === 0) {
        return null;
      }
      
      return result.documents[0] as unknown as BusinessProfile & { $id: string };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get a business profile by ID
   */
  static async getBusinessProfile(profileId: string): Promise<(BusinessProfile & { $id: string }) | null> {
    try {
      const document = await databases.getDocument(
        DATABASE_ID,
        BUSINESS_PROFILES_COLLECTION_ID,
        profileId
      );
      return document as unknown as BusinessProfile & { $id: string };
    } catch (error) {
      return null;
    }
  }

  /**
   * Update a business profile
   */
  static async updateBusinessProfile(
    profileId: string,
    data: Partial<BusinessProfileFormData>
  ): Promise<BusinessProfile & { $id: string }> {
    const updates: any = {
      $updatedAt: new Date().toISOString(),
    };

    if (data.businessName !== undefined) updates.businessName = data.businessName;
    if (data.description !== undefined) updates.description = data.description;
    if (data.location !== undefined) updates.location = data.location;
    if (data.contactEmail !== undefined) updates.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) updates.contactPhone = data.contactPhone;
    if (data.website !== undefined) updates.website = data.website;

    const document = await databases.updateDocument(
      DATABASE_ID,
      BUSINESS_PROFILES_COLLECTION_ID,
      profileId,
      updates
    );
    return document as unknown as BusinessProfile & { $id: string };
  }

  /**
   * Delete a business profile
   */
  static async deleteBusinessProfile(profileId: string): Promise<void> {
    await databases.deleteDocument(
      DATABASE_ID,
      BUSINESS_PROFILES_COLLECTION_ID,
      profileId
    );
  }

  /**
   * Get or create business profile for an owner
   */
  static async getOrCreateBusinessProfile(
    ownerId: string,
    defaultData: BusinessProfileFormData
  ): Promise<BusinessProfile & { $id: string }> {
    const existingProfile = await this.getBusinessProfileByOwner(ownerId);
    
    if (existingProfile) {
      return existingProfile;
    }
    
    return this.createBusinessProfile(ownerId, defaultData);
  }
}
