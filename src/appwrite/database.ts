/**
 * @fileOverview Database service layer for Appwrite integration.
 * Provides typed CRUD operations for all application data models.
 */

import { databases, ID, Query } from '@/lib/appwrite'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'smart-design-vault'

/** Base database service class providing generic CRUD operations. */
export class DatabaseService {
  protected static databaseId = DATABASE_ID

  /**
   * Create a new document in the specified collection.
   * @param collectionId - The Appwrite collection ID.
   * @param data - The document data to create.
   * @returns The created document with generated ID.
   * @throws Error if creation fails.
   */
  protected static async create<T>(collectionId: string, data: Omit<T, '$id' | '$createdAt' | '$updatedAt'>): Promise<T & { $id: string }> {
    try {
      const document = await databases.createDocument({
        databaseId: this.databaseId,
        collectionId,
        documentId: ID.unique(),
        data
      })
      return document as unknown as T & { $id: string }
    } catch (error: any) {
      throw new Error(error?.message || `Failed to create document in ${collectionId}`)
    }
  }

  /**
   * Retrieve a single document by ID.
   * @param collectionId - The Appwrite collection ID.
   * @param documentId - The document ID to retrieve.
   * @returns The requested document.
   */
  protected static async get<T>(collectionId: string, documentId: string): Promise<T & { $id: string }> {
    const document = await databases.getDocument({
      databaseId: this.databaseId,
      collectionId,
      documentId
    })
    return document as unknown as T & { $id: string }
  }

  /**
   * List documents from a collection with optional filtering.
   * @param collectionId - The Appwrite collection ID.
   * @param queries - Optional query filters.
   * @param userId - Optional user ID to filter by ownership.
   * @returns List of matching documents.
   * @throws Error if the query fails.
   */
  protected static async list<T>(
    collectionId: string,
    queries?: string[] | null,
    userId?: string
  ): Promise<{ documents: (T & { $id: string })[] }> {
    try {
      const finalQueries = queries || []
      if (userId) {
        finalQueries.push(Query.equal('userId', userId))
      }

      const result = await databases.listDocuments({
        databaseId: this.databaseId,
        collectionId,
        queries: finalQueries
      })
      return {
        documents: result.documents as unknown as (T & { $id: string })[]
      }
    } catch (error: any) {
      throw new Error(error?.message || `Failed to list documents from ${collectionId}`)
    }
  }

  /**
   * Update an existing document.
   * @param collectionId - The Appwrite collection ID.
   * @param documentId - The document ID to update.
   * @param data - Partial data to update.
   * @returns The updated document.
   */
  protected static async update<T>(
    collectionId: string,
    documentId: string,
    data: Partial<T>
  ): Promise<T & { $id: string }> {
    const document = await databases.updateDocument({
      databaseId: this.databaseId,
      collectionId,
      documentId,
      data
    })
    return document as unknown as T & { $id: string }
  }

  /**
   * Delete a document from the collection.
   * @param collectionId - The Appwrite collection ID.
   * @param documentId - The document ID to delete.
   */
  protected static async delete(collectionId: string, documentId: string): Promise<void> {
    await databases.deleteDocument({
      databaseId: this.databaseId,
      collectionId,
      documentId
    })
  }
}


/** Represents a user document in the database. */
export interface UserDocument {
  $id: string
  email: string
  name?: string
  $createdAt: string
  $updatedAt: string
}

/** Service for managing user documents and syncing with authentication. */
export class UserService extends DatabaseService {
  /**
   * Create a new user document.
   * @param data - User data excluding system fields.
   * @returns The created user document.
   */
  static async createUser(data: Omit<UserDocument, '$id' | '$createdAt' | '$updatedAt'>): Promise<UserDocument> {
    return await this.create<UserDocument>('users', data)
  }

  /**
   * Get a user by their ID.
   * @param userId - The user document ID.
   * @returns The user document or null if not found.
   */
  static async getUserById(userId: string): Promise<UserDocument | null> {
    try {
      return await this.get<UserDocument>('users', userId)
    } catch (error) {
      return null
    }
  }

  /**
   * Get a user by their email address.
   * @param email - The email to search for.
   * @returns The user document or null if not found.
   */
  static async getUserByEmail(email: string): Promise<UserDocument | null> {
    try {
      const result = await this.list<UserDocument>('users', [Query.equal('email', email)])
      return result.documents.length > 0 ? result.documents[0] as UserDocument : null
    } catch (error) {
      return null
    }
  }

  /**
   * Update an existing user document.
   * @param id - The user document ID.
   * @param data - Partial data to update.
   * @returns The updated user document.
   */
  static async updateUser(id: string, data: Partial<UserDocument>): Promise<UserDocument> {
    return await this.update<UserDocument>('users', id, data)
  }

  /**
   * Delete a user document.
   * @param id - The user document ID to delete.
   */
  static async deleteUser(id: string): Promise<void> {
    await this.delete('users', id)
  }

  /**
   * Synchronize an Appwrite auth user with the database.
   * Creates the user if they don't exist, or updates their info if they do.
   * @param authUser - The Appwrite authentication user object.
   * @returns The synced user document.
   */
  static async syncUserFromAuth(authUser: any): Promise<UserDocument> {
    const existingUser = await this.getUserByEmail(authUser.email)

    if (existingUser) {
      return await this.updateUser(existingUser.$id, {
        name: authUser.name,
        email: authUser.email
      })
    } else {
      return await this.createUser({
        email: authUser.email,
        name: authUser.name
      })
    }
  }
}


// Smart Design Vault - New Document Types

/** Represents a service document. */
export interface ServiceDocument {
  $id: string
  name: string
  description: string
  price: number
  ownerId: string
  status: 'active' | 'inactive'
  $createdAt: string
  $updatedAt: string
}

/** Represents an order document. */
export interface OrderDocument {
  $id: string
  orderNumber: string
  serviceId: string
  serviceName: string
  clientId: string
  clientName: string
  clientEmail: string
  clientPhone: string
  ownerId: string
  description: string
  price: number
  status: 'received' | 'pending' | 'in-progress' | 'completed' | 'picked-up'
  dateOrdered: string
  dateCompleted?: string
  $createdAt: string
  $updatedAt: string
}

/** Service for managing service documents. */
export class ServiceCollection extends DatabaseService {
  private static collectionId = process.env.NEXT_PUBLIC_APPWRITE_SERVICES_COLLECTION_ID || 'services'

  static async createService(data: Omit<ServiceDocument, '$id' | '$createdAt' | '$updatedAt'>): Promise<ServiceDocument> {
    return await this.create<ServiceDocument>(this.collectionId, data)
  }

  static async getService(serviceId: string): Promise<ServiceDocument | null> {
    try {
      return await this.get<ServiceDocument>(this.collectionId, serviceId)
    } catch (error) {
      return null
    }
  }

  static async getServicesByOwner(ownerId: string): Promise<ServiceDocument[]> {
    const result = await this.list<ServiceDocument>(this.collectionId, [Query.equal('ownerId', ownerId)])
    return result.documents
  }

  static async getActiveServices(): Promise<ServiceDocument[]> {
    const result = await this.list<ServiceDocument>(this.collectionId, [Query.equal('status', 'active')])
    return result.documents
  }

  static async updateService(id: string, data: Partial<ServiceDocument>): Promise<ServiceDocument> {
    return await this.update<ServiceDocument>(this.collectionId, id, data)
  }

  static async deleteService(id: string): Promise<void> {
    await this.delete(this.collectionId, id)
  }
}

/** Service for managing order documents. */
export class OrderCollection extends DatabaseService {
  private static collectionId = process.env.NEXT_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID || 'orders'

  static async createOrder(data: Omit<OrderDocument, '$id' | '$createdAt' | '$updatedAt'>): Promise<OrderDocument> {
    return await this.create<OrderDocument>(this.collectionId, data)
  }

  static async getOrder(orderId: string): Promise<OrderDocument | null> {
    try {
      return await this.get<OrderDocument>(this.collectionId, orderId)
    } catch (error) {
      return null
    }
  }

  static async getOrdersByClient(clientId: string): Promise<OrderDocument[]> {
    const result = await this.list<OrderDocument>(this.collectionId, [Query.equal('clientId', clientId)])
    return result.documents
  }

  static async getOrdersByOwner(ownerId: string): Promise<OrderDocument[]> {
    const result = await this.list<OrderDocument>(this.collectionId, [Query.equal('ownerId', ownerId)])
    return result.documents
  }

  static async getOrdersByStatus(ownerId: string, status: OrderDocument['status']): Promise<OrderDocument[]> {
    const result = await this.list<OrderDocument>(
      this.collectionId,
      [Query.equal('ownerId', ownerId), Query.equal('status', status)]
    )
    return result.documents
  }

  static async updateOrder(id: string, data: Partial<OrderDocument>): Promise<OrderDocument> {
    return await this.update<OrderDocument>(this.collectionId, id, data)
  }

  static async deleteOrder(id: string): Promise<void> {
    await this.delete(this.collectionId, id)
  }
}
