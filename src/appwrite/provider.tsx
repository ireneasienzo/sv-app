/**
 * @fileOverview Appwrite authentication context provider.
 * Manages user authentication state and provides hooks for accessing Appwrite services.
 */

'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { Account, Models } from 'appwrite';
import { account } from '@/lib/appwrite';
import type { UserRole } from '@/types';
import { handleAppwriteError } from '@/utils/errorHandler';

/** Props for the AppwriteProvider component. */
interface AppwriteProviderProps {
  children: ReactNode;
}

/** User preferences stored as array for flexible structure */
interface UserPreferences extends Models.Preferences {
  preferences?: Array<{
    key: string;
    value: any;
  }>;
  [key: string]: any; // Allow dynamic preference keys
}

/** User authentication state shape. */
interface UserAuthState {
  user: Models.User<UserPreferences> | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/** Combined state interface for the Appwrite context. */
export interface AppwriteContextState {
  account: Account;
  user: Models.User<UserPreferences> | null;
  isUserLoading: boolean;
  userError: Error | null;
  refreshUser: () => Promise<void>;
  updateUserRole: (role: UserRole) => Promise<void>;
}

/** Return type for the useAppwrite hook. */
export interface AppwriteServicesAndUser {
  account: Account;
  user: Models.User<UserPreferences> | null;
  isUserLoading: boolean;
  userError: Error | null;
  refreshUser: () => Promise<void>;
  updateUserRole: (role: UserRole) => Promise<void>;
}

/** Return type for the useUser hook. */
export interface UserHookResult {
  user: Models.User<UserPreferences> | null;
  isUserLoading: boolean;
  userError: Error | null;
  refreshUser: () => Promise<void>;
  updateUserRole: (role: UserRole) => Promise<void>;
}

const AppwriteContext = createContext<AppwriteContextState | null>(null);

/**
 * Provider component that manages Appwrite authentication state.
 * Wrap your application with this to enable authentication hooks.
 */
export function AppwriteProvider({ children }: AppwriteProviderProps) {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUserAuthState({
        user: currentUser,
        isUserLoading: false,
        userError: null,
      });
    } catch (error: any) {
      setUserAuthState({
        user: null,
        isUserLoading: false,
        userError: error,
      });
    }
  }, []);


  // Update user role in preferences (array-based)
  const updateUserRole = useCallback(async (role: UserRole) => {
    try {
      const currentUser = await account.get();
      const currentPrefs = currentUser.prefs?.preferences || [];

      // Find existing role preference
      const roleIndex = currentPrefs.findIndex((pref: any) => pref.key === 'role');

      if (roleIndex >= 0) {
        // Update existing role
        currentPrefs[roleIndex] = { key: 'role', value: role };
      } else {
        // Add new role preference
        currentPrefs.push({ key: 'role', value: role });
      }

      await account.updatePrefs({ preferences: currentPrefs });
      await refreshUser();
    } catch (error: any) {
      handleAppwriteError(error, 'updateUserRole');
      throw error;
    }
  }, [refreshUser]);

  useEffect(() => {
    // Check current user session on mount
    refreshUser();
  }, [refreshUser]);

  const contextValue: AppwriteContextState = {
    account,
    user: userAuthState.user,
    isUserLoading: userAuthState.isUserLoading,
    userError: userAuthState.userError,
    refreshUser,
    updateUserRole,
  };

  return (
    <AppwriteContext.Provider value={contextValue}>
      {children}
    </AppwriteContext.Provider>
  );
};

/**
 * Hook to access Appwrite services and current user authentication state.
 * Must be used within an AppwriteProvider.
 * @throws Error if used outside of AppwriteProvider.
 */
export function useAppwrite(): AppwriteServicesAndUser {
  const context = useContext(AppwriteContext);
  if (!context) {
    throw new Error('useAppwrite must be used within an AppwriteProvider');
  }
  return context;
}

/**
 * Hook to get the current user's authentication state.
 * Convenient shorthand for useAppwrite() when only user state is needed.
 */
export function useUser(): UserHookResult {
  const { user, isUserLoading, userError, refreshUser, updateUserRole } = useAppwrite();
  return { user, isUserLoading, userError, refreshUser, updateUserRole };
}

/**
 * Hook to get the Appwrite Account service instance.
 * Convenient shorthand for useAppwrite() when only the account service is needed.
 */
export function useAccount(): Account {
  const { account } = useAppwrite();
  return account;
}
