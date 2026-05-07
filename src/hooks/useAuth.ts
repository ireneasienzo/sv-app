/**
 * Authentication hooks and utilities for Smart Design Vault
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/appwrite';
import type { UserRole, UserAuthState } from '@/types';

/**
 * Hook to handle authentication redirects
 */
export function useAuthRedirect() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  return { user, isUserLoading };
}

/**
 * Hook to ensure user is authenticated
 */
export function useRequireAuth() {
  const { user, isUserLoading } = useUser();

  if (!isUserLoading && !user) {
    throw new Error('User must be authenticated');
  }

  return { user, isUserLoading };
}

/**
 * Hook to get user display name
 */
export function useUserDisplayName() {
  const { user } = useUser();

  const displayName = user?.name?.split(' ')[0] || 'User';
  const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return capitalizedName;
}

/**
 * Hook to get user role from preferences (array-based)
 */
export function useUserRole(): UserRole | undefined {
  const { user } = useUser();
  const prefs = (user?.prefs as any)?.preferences || [];
  const rolePref = prefs.find((pref: any) => pref.key === 'role');
  return rolePref?.value;
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: UserRole): boolean {
  const userRole = useUserRole();
  return userRole === role;
}

/**
 * Hook to check if user is an owner
 */
export function useIsOwner(): boolean {
  return useHasRole('owner');
}

/**
 * Hook to check if user is a client
 */
export function useIsClient(): boolean {
  return useHasRole('client');
}

/**
 * Hook to redirect based on user role
 */
export function useRoleRedirect() {
  const { user, isUserLoading } = useUser();
  const userRole = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user && !userRole) {
      // User is logged in but has no role set - redirect to role selection
      router.push('/select-role');
    }
  }, [user, userRole, isUserLoading, router]);

  return { user, userRole, isUserLoading };
}
