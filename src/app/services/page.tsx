'use client';

/**
 * Services page - Shows different views for clients and owners
 * - Owners: Manage their services (create, edit, delete, toggle status)
 * - Clients: Browse available services and place orders
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarNav } from '@/components/nav-main';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardSkeleton } from '@/components/loading-states';
import { useUser } from '@/appwrite';
import { useIsOwner, useIsClient } from '@/hooks/useAuth';
import { ServicesService } from "@/services/servicesService"
import { formatPrice } from "@/utils/currency"
import { BusinessProfileService } from '@/services/businessProfileService';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, ShoppingCart, Download, Square } from 'lucide-react';
import type { Service, ServiceFormData, BusinessProfile } from '@/types';

export default function ServicesPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const isOwner = useIsOwner();
  const isClient = useIsClient();
  const { toast } = useToast();

  const [services, setServices] = useState<(Service & { $id: string })[]>([]);
  const [businessProfile, setBusinessProfile] = useState<(BusinessProfile & { $id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<(Service & { $id: string }) | null>(null);
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    price: ''
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Fetch services and business profile
  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch business profile for owners
        if (isOwner) {
          const profile = await BusinessProfileService.getBusinessProfileByOwner(user.$id);
          setBusinessProfile(profile);
        }

        // Fetch services
        let data;
        if (isOwner) {
          // Owners see their own services
          data = await ServicesService.getServicesByOwner(user.$id);
        } else {
          // Clients see all active services
          data = await ServicesService.getActiveServices();
        }
        setServices(data);
      } catch (error: any) {
        console.error('Failed to fetch services:', error);

        let errorMessage = 'Unknown error';
        let errorAction = '';

        if (error?.type === 'user_unauthorized' || error?.code === 401) {
          errorMessage = 'You are not authorized to access services. Please log in again.';
          errorAction = 'redirect_to_login';
        } else if (error?.type === 'general_unauthorized' || error?.code === 403) {
          errorMessage = 'Access denied. You may not have the proper permissions.';
        } else if (error?.code === 'ENOTFOUND' || error?.message?.includes('network')) {
          errorMessage = 'Network connection issue. Please check your internet connection.';
        } else if (error?.message?.includes('Collection') && error?.message?.includes('not found')) {
          errorMessage = 'Services database not found. Please contact support.';
        } else {
          errorMessage = error?.message || 'Failed to load services';
        }

        console.error('Error details:', {
          message: errorMessage,
          type: error?.type,
          code: error?.code,
          action: errorAction
        });

        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage
        });

        // Redirect to login if unauthorized
        if (errorAction === 'redirect_to_login') {
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isOwner, isClient, toast]);

  // Handle form submission for creating/updating service
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isOwner) return;

    try {
      if (editingService) {
        // Update existing service
        await ServicesService.updateService(editingService.$id, formData);
        toast({
          title: 'Success',
          description: 'Service updated successfully'
        });
      } else {
        // Create new service
        const ownerName = businessProfile?.businessName || user.name || 'Business Owner';
        await ServicesService.createService(user.$id, ownerName, formData);
        toast({
          title: 'Success',
          description: 'Service created successfully'
        });
      }

      // Refresh services list
      const data = await ServicesService.getServicesByOwner(user?.$id || '');
      setServices(data);

      // Close dialog and reset form
      setIsDialogOpen(false);
      setEditingService(null);
      setFormData({ name: '', description: '', price: '' });
    } catch (error) {
      console.error('Failed to save service:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save service'
      });
    }
  };

  // Handle delete service
  const handleDelete = async (serviceId: string) => {
    if (!isOwner) return;

    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      await ServicesService.deleteService(serviceId);
      toast({
        title: 'Success',
        description: 'Service deleted successfully'
      });

      // Refresh services list
      const data = await ServicesService.getServicesByOwner(user?.$id || '');
      setServices(data);
    } catch (error) {
      console.error('Failed to delete service:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete service'
      });
    }
  };

  // Handle toggle service status
  const handleToggleStatus = async (service: Service & { $id: string }) => {
    if (!isOwner) return;

    try {
      await ServicesService.toggleServiceStatus(service.$id, service.status);
      toast({
        title: 'Success',
        description: `Service ${service.status === 'active' ? 'deactivated' : 'activated'} successfully`
      });

      // Refresh services list
      const data = await ServicesService.getServicesByOwner(user?.$id || '');
      setServices(data);
    } catch (error) {
      console.error('Failed to toggle service status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update service status'
      });
    }
  };

  // Handle place order (for clients)
  const handlePlaceOrder = async (service: Service & { $id: string }) => {
    if (!user || !isClient) return;

    router.push(`/orders?service=${service.$id}`);
  };

  // Open edit dialog
  const openEditDialog = (service: Service & { $id: string }) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price.toString()
    });
    setIsDialogOpen(true);
  };

  // Open create dialog
  const openCreateDialog = () => {
    setEditingService(null);
    setFormData({ name: '', description: '', price: '' });
    setIsDialogOpen(true);
  };

  // Handle inline field editing
  const handleInlineEdit = (serviceId: string, field: string, value: string) => {
    setEditingField({ id: serviceId, field });

    // Find the service and update the field
    const updatedServices = services.map(service => {
      if (service.$id === serviceId) {
        return { ...service, [field]: field === 'price' ? parseFloat(value) || 0 : value };
      }
      return service;
    });
    setServices(updatedServices);
  };

  // Save inline edit
  const saveInlineEdit = async (serviceId: string) => {
    const service = services.find(s => s.$id === serviceId);
    if (!service) return;

    try {
      await ServicesService.updateService(serviceId, {
        name: service.name,
        description: service.description,
        price: service.price.toString()
      });
      toast({
        title: 'Success',
        description: 'Service updated successfully'
      });
    } catch (error) {
      console.error('Failed to update service:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update service'
      });
    }
    setEditingField(null);
  };

  // Handle checkbox selection
  const handleSelectService = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServices([...selectedServices, serviceId]);
    } else {
      setSelectedServices(selectedServices.filter(id => id !== serviceId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedServices(services.map(s => s.$id));
    } else {
      setSelectedServices([]);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedServices.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedServices.length} service(s)?`)) return;

    try {
      await Promise.all(selectedServices.map(id => ServicesService.deleteService(id)));
      toast({
        title: 'Success',
        description: `${selectedServices.length} service(s) deleted successfully`
      });

      // Refresh services list
      const data = await ServicesService.getServicesByOwner(user?.$id || '');
      setServices(data);
      setSelectedServices([]);
    } catch (error) {
      console.error('Failed to delete services:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete services'
      });
    }
  };

  // Handle bulk export
  const handleBulkExport = () => {
    if (selectedServices.length === 0) return;

    const selectedData = services.filter(s => selectedServices.includes(s.$id));
    const csvContent = [
      ['Name', 'Description', 'Price', 'Status'],
      ...selectedData.map(s => [s.name, s.description, s.price.toString(), s.status])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'services.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: `${selectedServices.length} service(s) exported successfully`
    });
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
          {/* Header - Mobile Optimized */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Services</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {isOwner ? 'Manage your service offerings' : 'Browse available services'}
            </p>
          </div>


          {/* Desktop Action Buttons */}
          {isOwner && (
            <div className="hidden md:flex mb-6 flex-col sm:flex-row gap-4">
              <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
                Add New Service
              </Button>
            </div>
          )}

          {/* Bulk Actions for Owners */}
          {isOwner && selectedServices.length > 0 && (
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium">{selectedServices.length} service(s) selected</span>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedServices([])}>
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* Services Display - Responsive */}
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isOwner && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedServices.length === services.length && services.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Service Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Price</TableHead>
                    {isOwner && <TableHead>Status</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={isOwner ? 6 : 5} className="text-center">
                        <DashboardSkeleton />
                      </TableCell>
                    </TableRow>
                  ) : services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isOwner ? 6 : 5} className="text-center text-muted-foreground">
                        No services found
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((service) => (
                      <TableRow key={service.$id}>
                        {isOwner && (
                          <TableCell>
                            <Checkbox
                              checked={selectedServices.includes(service.$id)}
                              onCheckedChange={(checked) => handleSelectService(service.$id, checked as boolean)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          {editingField?.id === service.$id && editingField?.field === 'name' ? (
                            <Input
                              value={service.name}
                              onChange={(e) => handleInlineEdit(service.$id, 'name', e.target.value)}
                              onBlur={() => saveInlineEdit(service.$id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(service.$id);
                                if (e.key === 'Escape') setEditingField(null);
                              }}
                              className="min-w-[200px]"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-muted p-1 rounded"
                              onClick={() => isOwner && setEditingField({ id: service.$id, field: 'name' })}
                            >
                              {service.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingField?.id === service.$id && editingField?.field === 'description' ? (
                            <Textarea
                              value={service.description}
                              onChange={(e) => handleInlineEdit(service.$id, 'description', e.target.value)}
                              onBlur={() => saveInlineEdit(service.$id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  saveInlineEdit(service.$id);
                                }
                                if (e.key === 'Escape') setEditingField(null);
                              }}
                              className="min-w-[300px] resize-none"
                              rows={2}
                              autoFocus
                            />
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-muted p-1 rounded max-w-xs truncate"
                              onClick={() => isOwner && setEditingField({ id: service.$id, field: 'description' })}
                              title={service.description || 'None'}
                            >
                              {service.description || 'None'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingField?.id === service.$id && editingField?.field === 'price' ? (
                            <Input
                              type="number"
                              value={service.price}
                              onChange={(e) => handleInlineEdit(service.$id, 'price', e.target.value)}
                              onBlur={() => saveInlineEdit(service.$id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(service.$id);
                                if (e.key === 'Escape') setEditingField(null);
                              }}
                              className="w-24"
                              min="0"
                              step="0.01"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-muted p-1 rounded font-medium"
                              onClick={() => isOwner && setEditingField({ id: service.$id, field: 'price' })}
                            >
                              {formatPrice(service.price)}
                            </div>
                          )}
                        </TableCell>
                        {isOwner && (
                          <TableCell>
                            <Button
                              size="sm"
                              variant={service.status === 'active' ? 'default' : 'secondary'}
                              onClick={() => handleToggleStatus(service)}
                              className="text-xs"
                            >
                              {service.status}
                            </Button>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex gap-2">
                            {isOwner && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(service)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(service.$id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {isClient && (
                              <Button
                                size="sm"
                                onClick={() => handlePlaceOrder(service)}
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {services.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {isOwner
                        ? 'No services found. Add your first service to get started.'
                        : 'No services available. Check back later for new offerings.'}
                    </p>
                    {isOwner && (
                      <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                services.map((service) => (
                  <Card key={service.$id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-lg truncate" title={service.name}>
                            {service.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatPrice(service.price)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {editingField?.id === service.$id && editingField?.field === 'description' ? (
                              <Textarea
                                value={service.description}
                                onChange={(e) => handleInlineEdit(service.$id, 'description', e.target.value)}
                                onBlur={() => saveInlineEdit(service.$id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    saveInlineEdit(service.$id);
                                  }
                                  if (e.key === 'Escape') setEditingField(null);
                                }}
                                className="min-w-[300px] resize-none"
                                rows={2}
                                autoFocus
                              />
                            ) : (
                              <div className="truncate" title={service.description || 'None'}>
                                {service.description || 'None'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwner && (
                            <Button
                              size="sm"
                              variant={service.status === 'active' ? 'default' : 'secondary'}
                              onClick={() => handleToggleStatus(service)}
                            >
                              {service.status}
                            </Button>
                          )}
                          {isClient && (
                            <Button
                              size="sm"
                              onClick={() => handlePlaceOrder(service)}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {isOwner && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(service)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(service.$id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create/Edit Service Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="mx-auto max-w-[95vw] md:max-w-lg px-4">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit Service' : 'Create New Service'}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? 'Update the details of your service'
                : 'Add a new service that clients can order'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Logo Design"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this service includes..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (UGX)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                min="0"
                step="1"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingService ? 'Update Service' : 'Create Service'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
