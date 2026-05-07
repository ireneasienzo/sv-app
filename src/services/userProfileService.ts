/**
 * Service layer for managing user profiles in Smart Design Vault
 */

import { account } from '@/lib/appwrite';
import { useUser } from '@/appwrite';
import type { UserProfileFormData, PasswordChangeFormData } from '@/types';
import { handleAppwriteError } from '@/utils/errorHandler';

/**
 * Service class for managing user profiles
 */
export class UserProfileService {
  /**
   * Update user profile information
   */
  static async updateProfile(data: UserProfileFormData): Promise<void> {
    try {
      const currentUser = await account.get();
      const currentPrefs = currentUser.prefs?.preferences || [];

      // Update display name
      if (data.displayName !== undefined) {
        await account.updateName(data.displayName || '');
      }

      // Update photoURL in preferences array
      if (data.photoURL !== undefined) {
        const photoIndex = currentPrefs.findIndex((pref: any) => pref.key === 'photoURL');

        if (photoIndex >= 0) {
          // Update existing photoURL
          currentPrefs[photoIndex] = { key: 'photoURL', value: data.photoURL };
        } else {
          // Add new photoURL preference
          currentPrefs.push({ key: 'photoURL', value: data.photoURL });
        }

        await account.updatePrefs({ preferences: currentPrefs });
      }
    } catch (error: any) {
      handleAppwriteError(error, 'updateProfile');
      throw new Error(error?.message || 'Failed to update profile');
    }
  }

  /**
   * Change user password
   */
  static async changePassword(data: PasswordChangeFormData): Promise<void> {
    try {
      // Validate passwords match
      if (data.newPassword !== data.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      // Validate new password strength
      if (data.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Change password using Appwrite
      await account.updatePassword(data.newPassword, data.currentPassword);
    } catch (error: any) {
      handleAppwriteError(error, 'changePassword');
      throw new Error(error?.message || 'Failed to change password');
    }
  }

  /**
   * Get current user profile data
   */
  static async getCurrentProfile() {
    try {
      const user = await account.get();
      return {
        $id: user.$id,
        email: user.email,
        displayName: user.name,
        photoURL: user.prefs?.photoURL,
        role: user.prefs?.role
      };
    } catch (error: any) {
      handleAppwriteError(error, 'getCurrentProfile');
      throw new Error(error?.message || 'Failed to get user profile');
    }
  }

  /**
   * Update user email
   */
  static async updateEmail(newEmail: string, password: string): Promise<void> {
    try {
      await account.updateEmail(newEmail, password);
    } catch (error: any) {
      handleAppwriteError(error, 'updateEmail');
      throw new Error(error?.message || 'Failed to update email');
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(password: string): Promise<void> {
    try {
      // Get current user first
      const currentUser = await account.get();

      // First verify the password
      await account.createRecovery(currentUser.email, password);

      // Then delete the account
      await account.deleteSession('current');
      await account.deleteIdentity('current');
    } catch (error: any) {
      handleAppwriteError(error, 'deleteAccount');
      throw new Error(error?.message || 'Failed to delete account');
    }
  }
}
