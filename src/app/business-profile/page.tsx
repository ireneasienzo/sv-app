'use client';

/**
 * Business Profile page - Only accessible to owners
 * Allows owners to manage their business information including:
 * - Business name and description
 * - Location and contact information
 * - Services offered (link to services management)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarNav, BottomNav } from '@/components/nav-main';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DashboardSkeleton } from '@/components/loading-states';
import { useUser } from '@/appwrite';
import { useIsOwner } from '@/hooks/useAuth';
import { BusinessProfileService } from '@/services/businessProfileService';
import { ServicesService } from '@/services/servicesService';
import { OrdersService } from "@/services/ordersService"
import { formatPrice } from "@/utils/currency"
import { useToast } from '@/hooks/use-toast';
import { Edit, MapPin, Phone, Mail, Globe, Store, Package } from 'lucide-react';
import type { BusinessProfile, BusinessProfileFormData, Service } from '@/types';

export default function BusinessProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const isOwner = useIsOwner();
  const { toast } = useToast();

  const [businessProfile, setBusinessProfile] = useState<(BusinessProfile & { $id: string }) | null>(null);
  const [services, setServices] = useState<(Service & { $id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<BusinessProfileFormData>({
    businessName: '',
    description: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
    website: ''
  });

  // Redirect if not logged in or not owner
  useEffect(() => {
    if (!isUserLoading && (!user || !isOwner)) {
      router.push('/');
    }
  }, [user, isUserLoading, isOwner, router]);

  // Fetch business profile and services
  useEffect(() => {
    if (!user || !isOwner) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get or create business profile
        const profile = await BusinessProfileService.getBusinessProfileByOwner(user.$id);

        if (profile) {
          setBusinessProfile(profile);
          setFormData({
            businessName: profile.businessName,
            description: profile.description || '',
            location: profile.location || '',
            contactEmail: profile.contactEmail,
            contactPhone: profile.contactPhone || '',
            website: profile.website || ''
          });
        } else {
          // Create default profile if none exists
          const defaultProfile = await BusinessProfileService.createBusinessProfile(user.$id, {
            businessName: user.name || 'My Business',
            contactEmail: user.email || ''
          });
          setBusinessProfile(defaultProfile);
          setFormData({
            businessName: defaultProfile.businessName,
            description: defaultProfile.description || '',
            location: defaultProfile.location || '',
            contactEmail: defaultProfile.contactEmail,
            contactPhone: defaultProfile.contactPhone || '',
            website: defaultProfile.website || ''
          });
        }

        // Get owner's services
        const ownerServices = await ServicesService.getServicesByOwner(user.$id);
        setServices(ownerServices);
      } catch (error) {
        console.error('Failed to fetch business profile:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load business profile'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isOwner, toast]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessProfile || !user) return;

    try {
      await BusinessProfileService.updateBusinessProfile(businessProfile.$id, formData);

      // Refresh profile data
      const updatedProfile = await BusinessProfileService.getBusinessProfileByOwner(user.$id);
      setBusinessProfile(updatedProfile);

      toast({
        title: 'Success',
        description: 'Business profile updated successfully'
      });

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to update business profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update business profile'
      });
    }
  };

  // Open edit dialog
  const openEditDialog = () => {
    if (businessProfile) {
      setFormData({
        businessName: businessProfile.businessName,
        description: businessProfile.description || '',
        location: businessProfile.location || '',
        contactEmail: businessProfile.contactEmail,
        contactPhone: businessProfile.contactPhone || '',
        website: businessProfile.website || ''
      });
    }
    setIsDialogOpen(true);
  };

  if (isUserLoading || isLoading || !user || !isOwner) {
    return (
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 md:ml-0 pt-16 md:pt-0">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <DashboardSkeleton />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav />

      <main className="flex-1 md:ml-0 pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Business Profile</h1>
              <p className="text-muted-foreground mt-1">
                Manage your business information and services
              </p>
            </div>
            <Button onClick={openEditDialog}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>

          {businessProfile && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Business Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{businessProfile.businessName}</h3>
                    <p className="text-muted-foreground mt-1">
                      {businessProfile.description || 'None'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{businessProfile.location || 'None'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{businessProfile.contactEmail}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{businessProfile.contactPhone || 'None'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {businessProfile.website ? (
                      <a
                        href={businessProfile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {businessProfile.website}
                      </a>
                    ) : (
                      <span>None</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Services Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Services Offered
                    </div>
                    <Badge variant="secondary">{services.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Manage your service offerings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {services.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        You haven't created any services yet
                      </p>
                      <Button onClick={() => router.push('/services')}>
                        Create Your First Service
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {services.map((service) => (
                        <div key={service.$id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{service.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(service.price)}
                            </p>
                          </div>
                          <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                            {service.status}
                          </Badge>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => router.push('/services')}
                      >
                        Manage All Services
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Edit Business Profile Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Business Profile</DialogTitle>
            <DialogDescription>
              Update your business information that clients will see
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="e.g., Creative Design Studio"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your business and what you offer..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Kampala, Uganda"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="business@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="+256 123 456 789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
