'use client';

/**
 * Role selection page for new users
 * Allows users to choose between being a Client or Business Owner
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/appwrite';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBag, Briefcase, ArrowRight } from 'lucide-react';
import type { UserRole } from '@/types';

export default function SelectRolePage() {
  const { user, isUserLoading, updateUserRole } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Handle role selection
  const handleRoleSelect = async (role: UserRole) => {
    try {
      await updateUserRole(role);
      toast({
        title: 'Role Selected',
        description: `You are now registered as a ${role === 'owner' ? 'Business Owner' : 'Client'}`
      });
      router.push('/');
    } catch (error) {
      console.error('Failed to set role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to set role. Please try again.'
      });
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Smart Design Vault</h1>
          <p className="text-muted-foreground mt-2">Please select how you would like to use the platform</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Client Option */}
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleRoleSelect('client')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>I am a Client</CardTitle>
              <CardDescription>
                I want to browse services and place orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Browse available design services
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Place orders for products
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Track order status
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  View order history
                </li>
              </ul>
              <Button className="w-full" onClick={() => handleRoleSelect('client')}>
                Continue as Client
              </Button>
            </CardContent>
          </Card>

          {/* Owner Option */}
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleRoleSelect('owner')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>I am a Business Owner</CardTitle>
              <CardDescription>
                I want to offer services and manage orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Create and manage services
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Receive and process orders
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Track order fulfillment
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Export orders to CSV
                </li>
              </ul>
              <Button className="w-full" onClick={() => handleRoleSelect('owner')}>
                Continue as Owner
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
