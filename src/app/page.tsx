'use client';

/**
 * Smart Design Vault Dashboard
 * Shows order statistics and recent activity
 * - Owners: See stats about their services and orders
 * - Clients: See their order history and status
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarNav } from '@/components/nav-main';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardSkeleton } from '@/components/loading-states';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { useUser } from '@/appwrite';
import { ServiceCollection, OrderCollection } from "@/appwrite/database"
import { formatPrice } from "@/utils/currency"
import { useIsOwner, useIsClient } from "@/hooks/useAuth";
import { ServicesService, OrdersService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { Package, ShoppingBag, Briefcase, Users, ArrowRight } from 'lucide-react';
import { CHART_CONFIG, ORDER_STATUS_CONFIG } from '@/constants';
import type { Order, OrderStatus } from '@/types';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  pickedUpOrders: number;
  totalServices?: number;
  totalClients?: number;
}

export default function Dashboard() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const isOwner = useIsOwner();
  const isClient = useIsClient();
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    pickedUpOrders: 0,
    totalServices: 0,
    totalClients: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch dashboard data function
  const fetchData = useCallback(async () => {
    if (!user || !isMounted) return;

    setIsLoading(true);
    try {
      // Fetch orders
      const orders = isOwner
        ? await OrdersService.getOrdersByOwner(user.$id)
        : await OrdersService.getOrdersByClient(user.$id);

      setRecentOrders(orders.slice(0, 5)); // Show only 5 most recent

      // Calculate stats
      const orderStats = orders.reduce((acc, order) => {
        acc.totalOrders++;
        switch (order.status) {
          case 'received':
          case 'pending':
            acc.pendingOrders++;
            break;
          case 'in-progress':
            acc.inProgressOrders++;
            break;
          case 'completed':
            acc.completedOrders++;
            break;
          case 'picked-up':
            acc.pickedUpOrders++;
            break;
        }
        return acc;
      }, {
        totalOrders: 0,
        pendingOrders: 0,
        inProgressOrders: 0,
        completedOrders: 0,
        pickedUpOrders: 0,
      });

      // Fetch additional stats for owners
      if (isOwner) {
        const services = await ServicesService.getServicesByOwner(user.$id);
        const clients = new Set(orders.map(order => order.clientId)).size;

        setStats({
          ...orderStats,
          totalServices: services.length,
          totalClients: clients,
        });
      } else {
        setStats(orderStats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dashboard data'
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, isOwner, isMounted, toast]);

  // Refresh dashboard data when returning from orders page
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Check if we're returning from orders page (indicates order status change)
      if (document.visibilityState === 'visible' && sessionStorage.getItem('refreshDashboard') === 'true') {
        sessionStorage.removeItem('refreshDashboard');
        fetchData(); // Refetch dashboard data
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);

  // Fetch dashboard data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [user, isOwner, isClient, isMounted, toast]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (stats.totalOrders === 0) return [];

    return [
      { name: 'Pending', value: stats.pendingOrders, color: CHART_CONFIG.COLORS.PENDING },
      { name: 'In Progress', value: stats.inProgressOrders, color: CHART_CONFIG.COLORS.IN_PROGRESS },
      { name: 'Completed', value: stats.completedOrders, color: CHART_CONFIG.COLORS.COMPLETED },
      { name: 'Picked Up', value: stats.pickedUpOrders, color: CHART_CONFIG.COLORS.PICKED_UP },
    ].filter(item => item.value > 0);
  }, [stats]);

  // Get status badge
  const getStatusBadge = (status: OrderStatus) => {
    const config = ORDER_STATUS_CONFIG[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (!user) return null;

  const greetingName = user.name?.split(' ')[0] || 'User';
  const capitalizedName = greetingName.charAt(0).toUpperCase() + greetingName.slice(1);

  return (
    <div className="flex min-h-screen">
      <SidebarNav />

      <main className="flex-1 md:ml-0 pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Header - Mobile Optimized */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Welcome back, {capitalizedName}</p>
          </div>

          {/* Mobile Summary Stats - Hidden on Desktop */}
          <div className="md:hidden mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white">Total Orders</p>
                    <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white">Pending</p>
                    <p className="text-2xl font-bold text-white">{stats.pendingOrders}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white">In Progress</p>
                    <p className="text-2xl font-bold text-white">{stats.inProgressOrders}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white">Completed</p>
                    <p className="text-2xl font-bold text-white">{stats.completedOrders + stats.pickedUpOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Stats Grid - Hidden on Mobile */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="text-center md:text-left">
                    <p className="text-xs md:text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-xl md:text-3xl font-bold">{stats.totalOrders}</p>
                  </div>

                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="text-center md:text-left">
                    <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                    <p className="text-xl md:text-3xl font-bold">{stats.pendingOrders}</p>
                  </div>

                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="text-center md:text-left">
                    <p className="text-xs md:text-sm text-muted-foreground">In Progress</p>
                    <p className="text-xl md:text-3xl font-bold">{stats.inProgressOrders}</p>
                  </div>

                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="text-center md:text-left">
                    <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
                    <p className="text-xl md:text-3xl font-bold">{stats.completedOrders + stats.pickedUpOrders}</p>
                  </div>

                </div>
              </CardContent>
            </Card>
          </div>

          {/* Owner-specific stats */}
          {isOwner && (
            <>
              {/* Mobile Owner Summary - Hidden on Desktop */}
              <div className="md:hidden mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white">Total Services</p>
                        <p className="text-2xl font-bold text-white">{stats.totalServices || 0}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white">Total Clients</p>
                        <p className="text-2xl font-bold text-white">{stats.totalClients || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Desktop Owner Stats - Hidden on Mobile */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 md:mb-8">
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-center md:text-left">
                        <p className="text-xs md:text-sm text-muted-foreground">Total Services</p>
                        <p className="text-xl md:text-3xl font-bold">{stats.totalServices || 0}</p>
                      </div>

                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-center md:text-left">
                        <p className="text-xs md:text-sm text-muted-foreground">Total Clients</p>
                        <p className="text-xl md:text-3xl font-bold">{stats.totalClients || 0}</p>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Chart Section - Desktop Only */}
          {chartData.length > 0 && (
            <div className="hidden lg:block mb-6 md:mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Order Status Distribution</CardTitle>
                  <CardDescription>Overview of your order statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Button variant="outline" size="sm" onClick={() => router.push('/orders')}>
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.$id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{order.serviceName}</p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(order.status)}
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatPrice(order.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">

                  <p className="text-muted-foreground">
                    {isOwner
                      ? 'No orders yet.'
                      : 'No orders yet. Browse services to place your first order!'}
                  </p>
                  {isClient && (
                    <Button className="mt-4" onClick={() => router.push('/services')}>
                      Browse Services
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
