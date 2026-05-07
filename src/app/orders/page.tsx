'use client';

/**
 * Orders page - Shows different views for clients and owners
 * - Owners: Manage all orders for their services (update status, export CSV)
 * - Clients: View their placed orders
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SidebarNav } from '@/components/nav-main';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardSkeleton } from '@/components/loading-states';
import { useUser } from '@/appwrite';
import { useIsOwner, useIsClient } from '@/hooks/useAuth';
import { ServicesService, OrdersService, BusinessProfileService } from '@/services';
import { ServiceCollection, OrderCollection } from '@/appwrite/database';
import { useToast } from '@/hooks/use-toast';
import { Download, Filter, Package, ArrowRight, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ORDER_STATUS_CONFIG } from '@/constants';
import { formatPrice } from "@/utils/currency"
import type { Order, OrderStatus, Service, BusinessProfile } from '@/types';

function OrdersPageContent() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOwner = useIsOwner();
  const isClient = useIsClient();
  const { toast } = useToast();

  const [orders, setOrders] = useState<(Order & { $id: string })[]>([]);
  const [businessProfiles, setBusinessProfiles] = useState<Map<string, BusinessProfile & { $id: string }>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedService, setSelectedService] = useState<Service & { $id: string } | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [orderDescription, setOrderDescription] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isCancelling, setIsCancelling] = useState(false);

  const serviceId = searchParams.get('service');

  // Toggle order expansion for mobile view
  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Handle order cancellation (client only)
  const handleCancelOrders = async () => {
    if (!isClient || selectedOrders.size === 0) return;

    setIsCancelling(true);
    try {
      await Promise.all(
        Array.from(selectedOrders).map(orderId =>
          OrdersService.updateOrderStatus(orderId, 'cancelled')
        )
      );

      toast({
        title: 'Success',
        description: `${selectedOrders.size} order(s) cancelled successfully`
      });

      setSelectedOrders(new Set());
      fetchOrders();

      // Set flag to refresh dashboard when user returns
      sessionStorage.setItem('refreshDashboard', 'true');
    } catch (error) {
      console.error('Failed to cancel orders:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel orders'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle order deletion (both clients and owners)
  const handleDeleteOrders = async () => {
    if (selectedOrders.size === 0) return;

    setIsCancelling(true);
    try {
      await Promise.all(
        Array.from(selectedOrders).map(orderId =>
          OrdersService.deleteOrder(orderId)
        )
      );

      toast({
        title: 'Success',
        description: `${selectedOrders.size} order(s) deleted successfully`
      });

      setSelectedOrders(new Set());
      fetchOrders();

      // Set flag to refresh dashboard when user returns
      sessionStorage.setItem('refreshDashboard', 'true');
    } catch (error) {
      console.error('Failed to delete orders:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete orders'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Check if order can be cancelled (only for clients and certain statuses)
  const canCancelOrder = (order: Order & { $id: string }) => {
    return isClient && ['received', 'pending'].includes(order.status);
  };

  // Check if order can be deleted (both clients and owners)
  const canDeleteOrder = (order: Order & { $id: string }) => {
    if (isOwner) return order.status === 'cancelled'; // Owners can only delete cancelled orders
    return isClient && ['cancelled'].includes(order.status); // Clients can delete cancelled orders
  };

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let data;
      if (isOwner) {
        // Owners see all orders for their services
        data = await OrdersService.getOrdersByOwner(user?.$id || '');
      } else {
        // Clients see their own orders
        data = await OrdersService.getOrdersByClient(user?.$id || '');
      }

      // Sort by date ordered (newest first)
      data.sort((a, b) => new Date(b.dateOrdered).getTime() - new Date(a.dateOrdered).getTime());

      // Apply status filter
      let filteredData = data;
      if (statusFilter !== 'all') {
        filteredData = data.filter(order => order.status === statusFilter);
      }

      // Filter out cancelled orders for clients (but show to owners) - only if not filtering for cancelled orders
      if (isClient && statusFilter !== 'cancelled') {
        filteredData = filteredData.filter(order => order.status !== 'cancelled');
      }

      setOrders(filteredData);

      // Fetch business profiles for unique owners (only for clients)
      if (!isOwner && data.length > 0) {
        const uniqueOwnerIds = [...new Set(data.map(order => order.ownerId))];
        const profileMap = new Map<string, BusinessProfile & { $id: string }>();

        await Promise.all(
          uniqueOwnerIds.map(async (ownerId) => {
            try {
              const profile = await BusinessProfileService.getBusinessProfileByOwner(ownerId);
              if (profile) {
                profileMap.set(ownerId, profile);
              }
            } catch (error) {
              console.error(`Failed to fetch business profile for owner ${ownerId}:`, error);
            }
          })
        );

        setBusinessProfiles(profileMap);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load orders'
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, isOwner, statusFilter, toast]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle service selection for new order
  useEffect(() => {
    if (serviceId && isClient) {
      const loadService = async () => {
        try {
          const service = await ServicesService.getService(serviceId);
          if (service && service.status === 'active') {
            setSelectedService(service);
            setIsOrderDialogOpen(true);
          } else {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Service not available'
            });
          }
        } catch (error) {
          console.error('Failed to load service:', error);
        }
      };
      loadService();
    }
  }, [serviceId, isClient, toast]);

  // Handle status update (owner only)
  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    if (!isOwner) return;

    // Find the current order to check its status
    const currentOrder = orders.find(order => order.$id === orderId);
    if (!currentOrder) return;

    // Prevent status updates for canceled orders
    if (currentOrder.status === 'cancelled') {
      toast({
        variant: 'destructive',
        title: 'Cannot Update Status',
        description: 'Canceled orders cannot be modified. Only deletion is allowed.'
      });
      return;
    }

    try {
      await OrdersService.updateOrderStatus(orderId, newStatus);
      toast({
        title: 'Success',
        description: `Order status updated to ${newStatus}`
      });
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update order status'
      });
    }
  };

  // Handle CSV export (owner only)
  const handleExportCSV = () => {
    if (!isOwner || orders.length === 0) return;

    const csvContent = OrdersService.exportToCSV(orders);
    const filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    OrdersService.downloadCSV(csvContent, filename);

    toast({
      title: 'Success',
      description: 'Orders exported to CSV'
    });
  };

  // Handle place order (client only)
  const handlePlaceOrder = async () => {
    if (!user || !selectedService || !isClient) return;

    try {
      await OrdersService.createOrder(
        user.$id,
        user.name || 'Anonymous',
        user.email || '',
        user.phone || '', // Note: phone may not be in user object, might need to collect separately
        selectedService,
        { serviceId: selectedService.$id, description: orderDescription }
      );

      toast({
        title: 'Success',
        description: 'Order placed successfully'
      });

      // Close dialog and refresh
      setIsOrderDialogOpen(false);
      setSelectedService(null);
      setOrderDescription('');
      fetchOrders();
    } catch (error) {
      console.error('Failed to place order:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to place order'
      });
    }
  };

  // Get status badge color
  const getStatusBadge = (status: OrderStatus) => {
    const config = ORDER_STATUS_CONFIG[status];

    // Handle undefined status configurations gracefully
    if (!config) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
          {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
        </Badge>
      );
    }

    return (
      <Badge style={{ backgroundColor: config.color, color: 'white' }}>
        {config.label}
      </Badge>
    );
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 md:ml-0 pt-16 md:pt-0">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <DashboardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav />

      <main className="flex-1 md:ml-0 pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {isOwner ? 'All Orders' : 'My Orders'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isOwner
                  ? 'Manage orders for your services'
                  : 'Track your order status and history'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="picked-up">Picked Up</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Cancel Orders (client only) */}
              {isClient && selectedOrders.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleCancelOrders}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Cancelling...' : `Cancel ${selectedOrders.size} Order${selectedOrders.size > 1 ? 's' : ''}`}
                </Button>
              )}

              {/* Delete Orders (both clients and owners) */}
              {selectedOrders.size > 0 && Array.from(selectedOrders).some(orderId => {
                const order = orders.find(o => o.$id === orderId);
                return order && canDeleteOrder(order);
              }) && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteOrders}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Deleting...' : `Delete ${selectedOrders.size} Order${selectedOrders.size > 1 ? 's' : ''}`}
                  </Button>
                )}

              {/* Export CSV (owner only) */}
              {isOwner && (
                <Button variant="outline" onClick={handleExportCSV} disabled={orders.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons - Show when orders are selected */}
          {selectedOrders.size > 0 && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isClient
                      ? `Choose action: ${selectedOrders.size > 1 ? 'cancel or delete' : 'cancel or delete'}`
                      : `Choose action: ${selectedOrders.size > 1 ? 'delete' : 'delete'}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isClient && (
                    <Button
                      variant="destructive"
                      onClick={handleCancelOrders}
                      disabled={isCancelling}
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Orders'}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={handleDeleteOrders}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Deleting...' : 'Delete Orders'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">

                <p className="text-muted-foreground">
                  {isOwner
                    ? 'No orders found. When clients place orders for your services, they will appear here.'
                    : 'You have not placed any orders yet. Browse services to get started.'}
                </p>
                {isClient && (
                  <Button className="mt-4" onClick={() => router.push('/services')}>
                    Browse Services
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {isClient && (
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">
                            <Checkbox
                              checked={orders.filter(order => canCancelOrder(order)).length > 0 &&
                                orders.filter(order => canCancelOrder(order)).every(order => selectedOrders.has(order.$id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const cancellableOrders = orders.filter(order => canCancelOrder(order));
                                  setSelectedOrders(new Set(cancellableOrders.map(order => order.$id)));
                                } else {
                                  setSelectedOrders(new Set());
                                }
                              }}
                            />
                          </th>
                        )}
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[120px]">
                          Order #
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Service
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          {isOwner ? 'Client' : 'Provider'}
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Description
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                          Price
                        </th>
                        {isOwner && (
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.$id} className="border-b transition-colors hover:bg-muted/25">
                          {isClient && (
                            <td className="p-4 align-middle">
                              <Checkbox
                                checked={selectedOrders.has(order.$id)}
                                onCheckedChange={() => toggleOrderSelection(order.$id)}
                                disabled={!canCancelOrder(order) && !canDeleteOrder(order)}
                              />
                            </td>
                          )}
                          <td className="p-4 align-middle">
                            <div className="font-medium truncate max-w-[150px] lg:max-w-none" title={order.orderNumber}>
                              {order.orderNumber}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="text-sm text-muted-foreground">
                              {new Date(order.dateOrdered).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="text-sm truncate max-w-[150px] lg:max-w-none" title={order.serviceName}>
                              {order.serviceName}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="text-sm">
                              {isOwner ? (
                                <div>
                                  <div className="font-medium truncate max-w-[120px] lg:max-w-none" title={order.clientName}>
                                    {order.clientName}
                                  </div>
                                  <div className="text-muted-foreground truncate max-w-[120px] lg:max-w-none" title={order.clientEmail}>
                                    {order.clientEmail}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-medium truncate max-w-[120px] lg:max-w-none"
                                    title={businessProfiles.get(order.ownerId)?.businessName || 'Service Provider'}>
                                    {businessProfiles.get(order.ownerId)?.businessName || 'Service Provider'}
                                  </div>
                                  <div className="text-muted-foreground truncate max-w-[120px] lg:max-w-none"
                                    title={businessProfiles.get(order.ownerId)?.contactEmail || ''}>
                                    {businessProfiles.get(order.ownerId)?.contactEmail && (
                                      businessProfiles.get(order.ownerId)?.contactEmail
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="text-sm max-w-xs truncate" title={order.description}>
                              {order.description || 'No description provided'}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="p-4 align-middle text-right">
                            <div className="font-medium">{formatPrice(order.price)}</div>
                          </td>
                          {isOwner && (
                            <td className="p-4 align-middle">
                              <Select
                                value={order.status}
                                onValueChange={(v) => handleStatusUpdate(order.$id, v as OrderStatus)}
                                disabled={order.status === 'cancelled'}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="received">Received</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in-progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="picked-up">Picked Up</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:hidden space-y-3">
                {orders.map((order) => (
                  <Card key={order.$id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleOrderExpansion(order.$id)}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          {isClient && (
                            <Checkbox
                              checked={selectedOrders.has(order.$id)}
                              onCheckedChange={() => toggleOrderSelection(order.$id)}
                              disabled={!canCancelOrder(order) && !canDeleteOrder(order)}
                              className="flex-shrink-0 mt-1"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-lg truncate" title={order.orderNumber}>
                              {order.orderNumber}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(order.dateOrdered).toLocaleDateString()}
                            </div>
                            <div className="mt-2">
                              {getStatusBadge(order.status)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {expandedOrders.has(order.$id) ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {expandedOrders.has(order.$id) && (
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Price</p>
                            <p className="text-lg font-semibold">{formatPrice(order.price)}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Service</p>
                            <p className="text-sm">{order.serviceName}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              {isOwner ? 'Client' : 'Provider'}
                            </p>
                            <p className="text-sm">
                              {isOwner ? (
                                <div>
                                  <div className="font-medium truncate max-w-[120px] lg:max-w-none" title={order.clientName}>
                                    {order.clientName}
                                  </div>
                                  <div className="text-muted-foreground truncate max-w-[120px] lg:max-w-none" title={order.clientEmail}>
                                    {order.clientEmail}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-medium truncate max-w-[120px] lg:max-w-none"
                                    title={businessProfiles.get(order.ownerId)?.businessName || 'Service Provider'}>
                                    {businessProfiles.get(order.ownerId)?.businessName || 'Service Provider'}
                                  </div>
                                  <div className="text-muted-foreground truncate max-w-[120px] lg:max-w-none"
                                    title={businessProfiles.get(order.ownerId)?.contactEmail || ''}>
                                    {businessProfiles.get(order.ownerId)?.contactEmail && (
                                      businessProfiles.get(order.ownerId)?.contactEmail
                                    )}
                                  </div>
                                </div>
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                            <p className="text-sm text-muted-foreground">
                              {order.description || 'No description provided'}
                            </p>
                          </div>

                          {isOwner && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">Update Status</p>
                              <Select
                                value={order.status}
                                onValueChange={(v) => handleStatusUpdate(order.$id, v as OrderStatus)}
                                disabled={order.status === 'cancelled'}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="received">Received</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in-progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="picked-up">Picked Up</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Order Placement Dialog (client only) */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Order</DialogTitle>
            <DialogDescription>
              You are ordering: <strong>{selectedService?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedService?.name}</p>
              <p className="text-sm text-muted-foreground">{formatPrice(selectedService?.price || 0)}</p>
              <p className="text-sm mt-2">{selectedService?.description}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Additional Details</Label>
              <Textarea
                id="description"
                value={orderDescription}
                onChange={(e) => setOrderDescription(e.target.value)}
                placeholder="Describe what you need in detail..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePlaceOrder}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OrdersPageContent />
    </Suspense>
  );
}
