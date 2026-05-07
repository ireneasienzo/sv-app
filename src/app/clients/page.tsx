'use client';

/**
 * Clients page - Owner only view
 * Shows all clients who have placed orders with the owner
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarNav } from '@/components/nav-main';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardSkeleton } from '@/components/loading-states';
import { useUser } from '@/appwrite';
import { useIsOwner } from '@/hooks/useAuth';
import { OrdersService } from '@/services/ordersService';
import { OrderCollection } from '@/appwrite/database';
import { useToast } from '@/hooks/use-toast';
import { Users, Mail, Phone, ShoppingBag } from 'lucide-react';
import type { Client, Order } from '@/types';

export default function ClientsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const isOwner = useIsOwner();
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not logged in or not an owner
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }

    if (!isUserLoading && user && !isOwner) {
      // Non-owners should not access this page
      router.push('/');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only business owners can access the clients page'
      });
    }
  }, [user, isUserLoading, isOwner, router, toast]);

  // Fetch clients from orders
  useEffect(() => {
    if (!user || !isOwner) return;

    const fetchClients = async () => {
      setIsLoading(true);
      try {
        // Get all orders for this owner
        const orders = await OrdersService.getOrdersByOwner(user.$id);

        // Aggregate client data from orders
        const clientMap = new Map<string, Client>();

        orders.forEach((order) => {
          const existing = clientMap.get(order.clientId);

          if (existing) {
            existing.totalOrders += 1;
            if (order.status !== 'picked-up') {
              existing.activeOrders += 1;
            }
          } else {
            clientMap.set(order.clientId, {
              $id: order.clientId,
              name: order.clientName,
              email: order.clientEmail,
              phone: order.clientPhone,
              totalOrders: 1,
              activeOrders: order.status === 'picked-up' ? 0 : 1,
              $createdAt: new Date().toISOString(),
              $updatedAt: new Date().toISOString()
            });
          }
        });

        setClients(Array.from(clientMap.values()));
      } catch (error) {
        console.error('Failed to fetch clients:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load clients'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [user, isOwner, toast]);

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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">My Clients</h1>
            <p className="text-muted-foreground mt-1">
              View all clients who have placed orders with you
            </p>
          </div>

          {clients.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">

                <p className="text-muted-foreground">
                  No clients yet. When customers place orders for your services, they will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clients.map((client) => (
                <Card key={client.$id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {client.totalOrders} total orders
                        </CardDescription>
                      </div>
                      {client.activeOrders > 0 && (
                        <Badge variant="secondary">
                          {client.activeOrders} active
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{client.phone || 'None'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span>{client.totalOrders} orders placed</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
