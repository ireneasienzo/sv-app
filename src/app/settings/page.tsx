"use client"

import { useState, useEffect } from "react"
import { SidebarNav } from "@/components/nav-main"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useUser, useAccount } from "@/appwrite"
import { Loader2, User, Mail, Lock, AlertTriangle, Settings, Store, Edit, MapPin, Phone, Globe, Package, CreditCard, Plug, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { UserService, type UserDocument } from "@/appwrite/database"
import { UserProfileService } from "@/services/userProfileService"
import { BusinessProfileService } from "@/services/businessProfileService"
import { handleAppwriteError } from "@/utils/errorHandler"
import { formatPrice } from "@/utils/currency"
import type { UserProfileFormData, PasswordChangeFormData, BusinessProfile, BusinessProfileFormData } from "@/types"

export default function SettingsPage() {
  const { user, isUserLoading, refreshUser } = useUser()
  const account = useAccount()
  const router = useRouter()
  const { toast } = useToast()

  const [profile, setProfile] = useState<UserDocument | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })


  // Business Profile state
  const [businessProfile, setBusinessProfile] = useState<(BusinessProfile & { $id: string }) | null>(null)
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false)
  const [isBusinessLoading, setIsBusinessLoading] = useState(false)
  const [businessForm, setBusinessForm] = useState<BusinessProfileFormData>({
    businessName: '',
    description: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
    website: ''
  })
  const [deletePassword, setDeletePassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState('user')

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  useEffect(() => {
    if (!user) return

    const fetchProfile = async () => {
      setIsProfileLoading(true)
      try {
        const userProfile = await UserService.getUserByEmail(user.email)
        setProfile(userProfile)
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
      } finally {
        setIsProfileLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  // Fetch business profile for owners
  useEffect(() => {
    if (!user) return

    const fetchBusinessProfile = async () => {
      try {
        // Check if user is owner
        const prefs = (user.prefs as any)?.preferences || [];
        const rolePref = prefs.find((pref: any) => pref.key === 'role');
        const isOwner = rolePref?.value === 'owner';

        if (isOwner) {
          const profile = await BusinessProfileService.getBusinessProfileByOwner(user.$id);

          if (profile) {
            setBusinessProfile(profile);
            setBusinessForm({
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
            setBusinessForm({
              businessName: defaultProfile.businessName,
              description: defaultProfile.description || '',
              location: defaultProfile.location || '',
              contactEmail: defaultProfile.contactEmail,
              contactPhone: defaultProfile.contactPhone || '',
              website: defaultProfile.website || ''
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch business profile:', error);
      }
    }

    fetchBusinessProfile();
  }, [user])

  // Initialize form data from current user
  useEffect(() => {
    if (user) {
      const nameParts = user.name?.split(' ') || ['', ''];
      setUserForm({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || ''
      })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    }
  }, [user])

  // Handle user profile update
  const handleUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setIsLoading(true)

      // Update name
      const profileData: UserProfileFormData = {
        displayName: `${userForm.firstName} ${userForm.lastName}`.trim(),
        photoURL: (user.prefs as any)?.photoURL || ''
      }

      await UserProfileService.updateProfile(profileData)

      await refreshUser()

      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      })
    } catch (error: any) {
      handleAppwriteError(error, 'handleUserUpdate', toast)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setIsLoading(true)

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Passwords do not match'
        })
        return
      }

      const passwordData: PasswordChangeFormData = {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      }

      await UserProfileService.changePassword(passwordData)

      toast({
        title: 'Success',
        description: 'Password changed successfully'
      })

      // Reset password fields
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      handleAppwriteError(error, 'handlePasswordChange', toast)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!user || !deletePassword) return

    try {
      setIsDeleting(true)
      await UserProfileService.deleteAccount(deletePassword)

      toast({
        title: 'Success',
        description: 'Account deleted successfully'
      })

      // Redirect to login page after deletion
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error: any) {
      handleAppwriteError(error, 'deleteAccount', toast)
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setDeletePassword('')
    }
  }

  // Business Profile handlers
  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessProfile || !user) return;

    try {
      await BusinessProfileService.updateBusinessProfile(businessProfile.$id, businessForm);

      // Refresh profile data
      const updatedProfile = await BusinessProfileService.getBusinessProfileByOwner(user.$id);
      setBusinessProfile(updatedProfile);

      toast({
        title: 'Success',
        description: 'Business profile updated successfully'
      });

      setIsBusinessDialogOpen(false);
    } catch (error) {
      console.error('Failed to update business profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update business profile'
      });
    }
  };

  // Business profile handlers
  const saveBusinessProfile = async () => {
    if (!businessProfile || !user) return;

    // Validation
    if (!businessForm.businessName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Business name is required'
      });
      return;
    }

    if (!businessForm.contactEmail.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Contact email is required'
      });
      return;
    }

    try {
      setIsBusinessLoading(true);
      await BusinessProfileService.updateBusinessProfile(businessProfile.$id, businessForm);

      // Refresh profile data
      const updatedProfile = await BusinessProfileService.getBusinessProfileByOwner(user.$id);
      setBusinessProfile(updatedProfile);

      toast({
        title: 'Success',
        description: 'Business profile updated successfully'
      });
    } catch (error) {
      console.error('Failed to update business profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update business profile'
      });
    } finally {
      setIsBusinessLoading(false);
    }
  };

  const resetBusinessForm = () => {
    if (businessProfile) {
      setBusinessForm({
        businessName: businessProfile.businessName,
        description: businessProfile.description || '',
        location: businessProfile.location || '',
        contactEmail: businessProfile.contactEmail,
        contactPhone: businessProfile.contactPhone || '',
        website: businessProfile.website || ''
      });
    }
  };

  const openBusinessDialog = () => {
    if (businessProfile) {
      setBusinessForm({
        businessName: businessProfile.businessName,
        description: businessProfile.description || '',
        location: businessProfile.location || '',
        contactEmail: businessProfile.contactEmail,
        contactPhone: businessProfile.contactPhone || '',
        website: businessProfile.website || ''
      });
    }
    setIsBusinessDialogOpen(true);
  };

  // Check if user is owner
  const isOwner = (() => {
    const prefs = (user?.prefs as any)?.preferences || [];
    const rolePref = prefs.find((pref: any) => pref.key === 'role');
    return rolePref?.value === 'owner';
  })();

  // Reset active tab if business tab is not available
  useEffect(() => {
    if (!isOwner && activeTab === 'business') {
      setActiveTab('user');
    }
  }, [isOwner, activeTab]);

  // Get user initials for avatar
  const getUserInitials = () => {
    const firstName = userForm.firstName || user?.name?.split(' ')[0] || ''
    const lastName = userForm.lastName || user?.name?.split(' ')[1] || ''
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`.trim() || 'U'
  }

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-background pb-20 md:pb-0">
      <SidebarNav />

      <main className="flex-1 md:ml-0 pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${isOwner ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="user" className="flex items-center gap-2">
                User
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="business" className="flex items-center gap-2">
                  Business Profile
                </TabsTrigger>
              )}
              <TabsTrigger value="security" className="flex items-center gap-2">
                Security
              </TabsTrigger>
            </TabsList>

            {/* User Tab */}
            <TabsContent value="user" className="space-y-6">
              {/* Profile Card */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-semibold">
                      {getUserInitials()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold">{userForm.firstName} {userForm.lastName}</h2>
                    </div>
                  </div>

                  <form onSubmit={handleUserUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={userForm.firstName}
                          onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={userForm.lastName}
                          onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        placeholder="Enter your email"
                        disabled
                      />
                      {/* <p className="text-sm text-muted-foreground">
                        Email cannot be changed here. Contact support if you need to update your email.
                      </p> */}
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full sm:w-auto" size="sm">
                      {isLoading ? 'Saving...' : 'Update Profile'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

            </TabsContent>

            {/* Business Profile Tab */}
            <TabsContent value="business">
              {isOwner ? (
                businessProfile ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            Business Profile
                          </CardTitle>
                          <CardDescription>
                            Manage your business information
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Business Name and Description */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="businessName">Business Name</Label>
                          <Input
                            id="businessName"
                            value={businessForm.businessName}
                            onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                            placeholder="Enter business name"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={businessForm.description}
                            onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value })}
                            placeholder="Describe your business"
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Contact Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="location">Location</Label>
                            <Input
                              id="location"
                              value={businessForm.location}
                              onChange={(e) => setBusinessForm({ ...businessForm, location: e.target.value })}
                              placeholder="Business location"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="contactEmail">Contact Email</Label>
                            <Input
                              id="contactEmail"
                              type="email"
                              value={businessForm.contactEmail}
                              onChange={(e) => setBusinessForm({ ...businessForm, contactEmail: e.target.value })}
                              placeholder="business@example.com"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="contactPhone">Contact Phone</Label>
                            <Input
                              id="contactPhone"
                              type="tel"
                              value={businessForm.contactPhone}
                              onChange={(e) => setBusinessForm({ ...businessForm, contactPhone: e.target.value })}
                              placeholder="+1 (555) 123-4567"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="website">Website</Label>
                            <Input
                              id="website"
                              type="url"
                              value={businessForm.website}
                              onChange={(e) => setBusinessForm({ ...businessForm, website: e.target.value })}
                              placeholder="https://example.com"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button
                          onClick={saveBusinessProfile}
                          disabled={isBusinessLoading}
                          className="w-full sm:w-auto"
                          size="sm"
                        >
                          {isBusinessLoading ? 'Updating...' : 'Update Profile'}
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <h3 className="text-lg font-semibold mb-2">No Business Profile</h3>
                      <p className="text-muted-foreground mb-4">
                        Create a business profile to start offering services
                      </p>
                      <Button onClick={openBusinessDialog}>
                        Create Business Profile
                      </Button>
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <h3 className="text-lg font-semibold mb-2">Business Profile Not Available</h3>
                    <p className="text-muted-foreground mb-4">
                      Business profiles are only available for business owners
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your account security and privacy
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Change Password</h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            placeholder="Enter current password"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            placeholder="Enter new password"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            placeholder="Confirm new password"
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                        {isLoading ? 'Updating Password...' : 'Update Password'}
                      </Button>
                    </form>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Account Actions</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Delete Account</p>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete your account and all data
                          </p>
                        </div>
                        <Button
                          onClick={() => setDeleteDialogOpen(true)}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </main>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleDeleteAccount(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Password</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password to confirm deletion"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isDeleting || !deletePassword}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Business Profile Edit Dialog */}
      {isOwner && (
        <Dialog open={isBusinessDialogOpen} onOpenChange={setIsBusinessDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Business Profile</DialogTitle>
              <DialogDescription>
                Update your business information
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleBusinessSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessForm.businessName}
                  onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                  placeholder="Enter business name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={businessForm.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBusinessForm({ ...businessForm, description: e.target.value })}
                  placeholder="Describe your business"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={businessForm.location}
                  onChange={(e) => setBusinessForm({ ...businessForm, location: e.target.value })}
                  placeholder="Business location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={businessForm.contactEmail}
                  onChange={(e) => setBusinessForm({ ...businessForm, contactEmail: e.target.value })}
                  placeholder="business@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={businessForm.contactPhone}
                  onChange={(e) => setBusinessForm({ ...businessForm, contactPhone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={businessForm.website}
                  onChange={(e) => setBusinessForm({ ...businessForm, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsBusinessDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
