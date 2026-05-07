/**
 * Service layer for managing orders in Smart Design Vault
 */

import { databases, ID, Query } from '@/lib/appwrite';
import type { Order, OrderFormData, OrderStatus, OrderCSVRow, Service } from '@/types';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'smart-design-vault';
const ORDERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID || 'orders';

/**
 * Generate a unique order number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

/**
 * Service class for managing orders
 */
export class OrdersService {
  /**
   * Create a new order
   */
  static async createOrder(
    clientId: string,
    clientName: string,
    clientEmail: string,
    clientPhone: string,
    service: Service & { $id: string },
    data: OrderFormData
  ): Promise<Order & { $id: string }> {
    const now = new Date().toISOString();
    const orderNumber = generateOrderNumber();

    const document = await databases.createDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      ID.unique(),
      {
        orderNumber,
        serviceId: service.$id,
        serviceName: service.name,
        clientId,
        clientName,
        clientEmail,
        clientPhone,
        ownerId: service.ownerId,
        description: data.description,
        price: service.price,
        status: 'pending' as OrderStatus,
        dateOrdered: now,
        $createdAt: now,
        $updatedAt: now,
      }
    );
    return document as unknown as Order & { $id: string };
  }

  /**
   * Get an order by ID
   */
  static async getOrder(orderId: string): Promise<(Order & { $id: string }) | null> {
    try {
      const document = await databases.getDocument(
        DATABASE_ID,
        ORDERS_COLLECTION_ID,
        orderId
      );
      return document as unknown as Order & { $id: string };
    } catch (error) {
      return null;
    }
  }

  /**
   * List all orders by client
   */
  static async getOrdersByClient(clientId: string): Promise<(Order & { $id: string })[]> {
    const result = await databases.listDocuments(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      [Query.equal('clientId', clientId)]
    );
    return result.documents as unknown as (Order & { $id: string })[];
  }

  /**
   * List all orders by owner (for business owners)
   */
  static async getOrdersByOwner(ownerId: string): Promise<(Order & { $id: string })[]> {
    const result = await databases.listDocuments(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      [Query.equal('ownerId', ownerId)]
    );
    return result.documents as unknown as (Order & { $id: string })[];
  }

  /**
   * List all orders (admin/owner view with filters)
   */
  static async getOrdersByStatus(
    ownerId: string,
    status: OrderStatus
  ): Promise<(Order & { $id: string })[]> {
    const result = await databases.listDocuments(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      [
        Query.equal('ownerId', ownerId),
        Query.equal('status', status)
      ]
    );
    return result.documents as unknown as (Order & { $id: string })[];
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ): Promise<Order & { $id: string }> {
    const updates: any = {
      status,
      $updatedAt: new Date().toISOString(),
    };

    // If status is completed or picked-up, set dateCompleted
    if (status === 'completed' || status === 'picked-up') {
      updates.dateCompleted = new Date().toISOString();
    } else {
      updates.dateCompleted = null;
    }

    const document = await databases.updateDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId,
      updates
    );
    return document as unknown as Order & { $id: string };
  }

  /**
   * Delete an order
   */
  static async deleteOrder(orderId: string): Promise<void> {
    await databases.deleteDocument(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      orderId
    );
  }

  /**
   * Get dashboard stats for an owner
   */
  static async getOwnerStats(ownerId: string): Promise<{
    totalOrders: number;
    receivedOrders: number;
    pendingOrders: number;
    inProgressOrders: number;
    completedOrders: number;
    pickedUpOrders: number;
  }> {
    const orders = await this.getOrdersByOwner(ownerId);

    return {
      totalOrders: orders.length,
      receivedOrders: orders.filter(o => o.status === 'received').length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      inProgressOrders: orders.filter(o => o.status === 'in-progress').length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      pickedUpOrders: orders.filter(o => o.status === 'picked-up').length,
    };
  }

  /**
   * Get dashboard stats for a client
   */
  static async getClientStats(clientId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    inProgressOrders: number;
    completedOrders: number;
    pickedUpOrders: number;
  }> {
    const orders = await this.getOrdersByClient(clientId);

    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending' || o.status === 'received').length,
      inProgressOrders: orders.filter(o => o.status === 'in-progress').length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      pickedUpOrders: orders.filter(o => o.status === 'picked-up').length,
    };
  }

  /**
   * Export orders to CSV format
   */
  static exportToCSV(orders: (Order & { $id: string })[]): string {
    const headers = [
      'Order Number',
      'Service Name',
      'Date Ordered',
      'Price',
      'Description',
      'Service Provider',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Order Status'
    ];

    const rows = orders.map(order => ({
      orderNumber: order.orderNumber,
      serviceName: order.serviceName,
      dateOrdered: order.dateOrdered,
      price: order.price.toString(),
      description: order.description,
      serviceProvider: order.ownerId, // This will be enhanced with actual owner name in UI layer
      customerName: order.clientName,
      customerEmail: order.clientEmail,
      customerPhone: order.clientPhone,
      orderStatus: order.status
    }));

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => [
        `"${row.orderNumber}"`,
        `"${row.serviceName}"`,
        `"${row.dateOrdered}"`,
        row.price,
        `"${row.description?.replace(/"/g, '""') || ''}"`,
        `"${row.serviceProvider}"`,
        `"${row.customerName}"`,
        `"${row.customerEmail}"`,
        `"${row.customerPhone}"`,
        `"${row.orderStatus}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Download CSV file
   */
  static downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
