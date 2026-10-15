import React, { useState, useRef } from 'react';
import type { AppUser, UserRole } from '../types/inventory';
import {
  X,
  ShieldCheck,
  UserCheck,
  Check,
  Plus,
  Trash,
  AlertCircle,
  Edit,
  LogOut,
  Camera,
  UploadCloud,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  User,
} from './HugeIcons';
import { verifyPassword, hashPassword, isPasswordHashed } from '../utils/security';
import { compressImage } from '../utils/image';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onSwitchUser: (user: AppUser) => void;
  users: AppUser[];
  onAddUser?: (user: Omit<AppUser, 'id'>) => Promise<boolean> | void;
  onUpdateUser?: (user: AppUser) => Promise<boolean> | void;
  onDeleteUser?: (userId: string) => Promise<boolean> | void;
  onLogout?: () => void;
  globalCoverPhoto?: string | null;
  onUpdateGlobalCoverPhoto?: (url: string | null) => Promise<boolean> | boolean | void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onLogout,
  globalCoverPhoto,
  onUpdateGlobalCoverPhoto,
}) => {
  // Navigation Tabs: 'account' (My Profile & Settings), 'switch' (Sign In / Switch Officer), 'manage' (Team Roster & System)
  const [activeTab, setActiveTab] = useState<'account' | 'switch' | 'manage'>('account');

  // ---------------------------------------------------------------------------
  // Tab 1: "My Account" Form State (Active Officer)
  // ---------------------------------------------------------------------------
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileUsername, setProfileUsername] = useState(currentUser.username);
  const [profilePassword, setProfilePassword] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(currentUser.avatarUrl);
  const [profileCover, setProfileCover] = useState<string | undefined>(currentUser.coverPhotoUrl);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Hidden file input refs for My Account
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Tab 2: "Sign In / Switch Officer" Form State
  // ---------------------------------------------------------------------------
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ---------------------------------------------------------------------------
  // Tab 3: "Team Roster & System" State (Admin & Roster)
  // ---------------------------------------------------------------------------
  // New User Registration Form State (Admin Only)
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('IT_OFFICER');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Admin Edit Other User State
  const [editingOtherUser, setEditingOtherUser] = useState<AppUser | null>(null);
  const [editOtherName, setEditOtherName] = useState('');
  const [editOtherUsername, setEditOtherUsername] = useState('');
  const [editOtherPassword, setEditOtherPassword] = useState('');
  const [showOtherPassword, setShowOtherPassword] = useState(false);
  const [editOtherRole, setEditOtherRole] = useState<UserRole>('IT_OFFICER');
  const [editOtherAvatar, setEditOtherAvatar] = useState<string | undefined>(undefined);
  const [editOtherError, setEditOtherError] = useState<string | null>(null);
  const [isSubmittingOtherEdit, setIsSubmittingOtherEdit] = useState(false);
  const otherAvatarInputRef = useRef<HTMLInputElement>(null);

  // Global Cover Photo State (Admin Only)
  const [globalCoverMsg, setGlobalCoverMsg] = useState<string | null>(null);
  const [isUploadingGlobalCover, setIsUploadingGlobalCover] = useState(false);
  const globalCoverInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // My Account Handlers
  // ---------------------------------------------------------------------------
  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProfileError(null);
      // Compress avatar to circular crop friendly 300x300 WebP (~20-40KB)
      const compressedDataUrl = await compressImage(file, 300, 300, 0.85);
      setProfileAvatar(compressedDataUrl);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to process avatar image.');
    } finally {
      // Reset input value so same file can be re-selected if desired
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setProfileAvatar(undefined);
  };

  const handleCoverFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProfileError(null);
      // Compress cover photo to crisp 1920x800 WebP (~150-250KB)
      const compressedDataUrl = await compressImage(file, 1920, 800, 0.82);
      setProfileCover(compressedDataUrl);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to process cover photo.');
    } finally {
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleResetPersonalCover = () => {
    setProfileCover(undefined);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = profileName.trim().toUpperCase();
    const cleanUser = profileUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const cleanPass = profilePassword.trim();

    if (!cleanName) {
      setProfileError('Full name is required.');
      return;
    }

    if (!cleanUser || cleanUser.length < 3) {
      setProfileError('Username must be at least 3 characters.');
      return;
    }

    if (cleanPass && cleanPass.length < 4) {
      setProfileError('New password must be at least 4 characters.');
      return;
    }

    // Check username collisions with other users
    const collision = users.some(
      (u) => u.id !== currentUser.id && u.username.toLowerCase() === cleanUser
    );
    if (collision) {
      setProfileError(`Username @${cleanUser} is already in use by another staff member.`);
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      let hashedPassword: string | undefined = undefined;
      if (cleanPass) {
        hashedPassword = await hashPassword(cleanPass);

        // Sync password to Supabase Auth session if active
        try {
          await supabase.auth.updateUser({ password: cleanPass });
        } catch (sbErr) {
          console.warn('[Supabase Auth] Password update notice:', sbErr);
        }
      }

      const updatedUser: AppUser = {
        ...currentUser,
        name: cleanName,
        username: cleanUser,
        avatarUrl: profileAvatar,
        coverPhotoUrl: profileCover,
        ...(hashedPassword ? { password: hashedPassword } : {}),
      };

      if (onUpdateUser) {
        await onUpdateUser(updatedUser);
      }

      setProfilePassword('');
      setProfileSuccess('Profile and settings saved successfully!');
      setTimeout(() => setProfileSuccess(null), 3500);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to save changes.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Sign In / Switch Account Handlers
  // ---------------------------------------------------------------------------
  const handleSelectUser = (user: AppUser) => {
    setLoginUsername(user.username);
    setLoginPassword('');
    setLoginError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = loginUsername.trim().toLowerCase();
    const cleanPass = loginPassword.trim();

    if (!cleanUser) {
      setLoginError('Enter username');
      return;
    }

    const matched = users.find(
      (u) => u.username.toLowerCase() === cleanUser
    );

    if (!matched) {
      setLoginError('User account not found');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      // Enterprise PBKDF2 constant-time verification
      const isPasswordValid = await verifyPassword(cleanPass, matched.password || 'password123');
      if (!isPasswordValid) {
        setLoginError('Incorrect password');
        setIsLoggingIn(false);
        return;
      }

      // Auto-upgrade legacy plaintext password if needed
      let activeUser = matched;
      if (!isPasswordHashed(matched.password)) {
        try {
          const secureHash = await hashPassword(cleanPass);
          activeUser = { ...matched, password: secureHash };
          if (onUpdateUser) {
            await onUpdateUser(activeUser);
          }
        } catch (err) {
          console.warn('[Security] Failed to auto-upgrade password hash:', err);
        }
      }

      // Synchronize Supabase Auth session
      try {
        const userEmail = activeUser.email || `${cleanUser}@himu.paranaque.gov.ph`;
        const { error: sbAuthError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: cleanPass,
        });

        if (
          sbAuthError &&
          (sbAuthError.message?.toLowerCase().includes('invalid login credentials') ||
            sbAuthError.message?.toLowerCase().includes('user not found'))
        ) {
          await supabase.auth.signUp({
            email: userEmail,
            password: cleanPass,
            options: {
              data: {
                role: activeUser.role,
                name: activeUser.name,
                username: cleanUser,
              },
            },
          });
        }
      } catch (authErr) {
        console.warn('[Supabase Auth] Session notice:', authErr);
      }

      onSwitchUser(activeUser);
      // Synchronize "My Account" fields to newly switched user
      setProfileName(activeUser.name);
      setProfileUsername(activeUser.username);
      setProfileAvatar(activeUser.avatarUrl);
      setProfileCover(activeUser.coverPhotoUrl);
      setProfilePassword('');
      onClose();
    } catch (err: any) {
      setLoginError(err?.message || 'Authentication failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Admin Handlers: Register & Edit Other Officers
  // ---------------------------------------------------------------------------
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim().toUpperCase();
    const cleanUser = newUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const cleanPass = newPassword.trim();

    if (!cleanName) {
      setFormError('Full name is required.');
      return;
    }

    if (!cleanUser || cleanUser.length < 3) {
      setFormError('Username must be at least 3 characters.');
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setFormError('Password must be at least 4 characters.');
      return;
    }

    const collision = users.some((u) => u.username.toLowerCase() === cleanUser);
    if (collision) {
      setFormError(`Username @${cleanUser} already exists.`);
      return;
    }

    setIsSubmittingNew(true);
    setFormError(null);

    try {
      const hashedPassword = await hashPassword(cleanPass);
      const email = `${cleanUser}@himu.paranaque.gov.ph`;

      if (onAddUser) {
        await onAddUser({
          name: cleanName,
          username: cleanUser,
          password: hashedPassword,
          role: newRole,
          email,
        });
      }

      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('IT_OFFICER');
      setIsAdding(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to register account.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleStartEditOther = (user: AppUser) => {
    // If not admin, non-admin officers can only edit themselves (which is handled in My Account)
    if (currentUser.role !== 'ADMIN' && currentUser.id !== user.id) {
      alert('Access Denied: Only administrators can modify other staff profiles.');
      return;
    }

    if (user.id === currentUser.id) {
      // Direct to My Account tab
      setActiveTab('account');
      return;
    }

    setEditingOtherUser(user);
    setEditOtherName(user.name);
    setEditOtherUsername(user.username);
    setEditOtherPassword('');
    setEditOtherRole(user.role);
    setEditOtherAvatar(user.avatarUrl);
    setEditOtherError(null);
  };

  const handleSaveOtherEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOtherUser) return;

    const cleanName = editOtherName.trim().toUpperCase();
    const cleanUser = editOtherUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const cleanPass = editOtherPassword.trim();

    if (!cleanName) {
      setEditOtherError('Full name is required.');
      return;
    }

    if (!cleanUser || cleanUser.length < 3) {
      setEditOtherError('Username must be at least 3 characters.');
      return;
    }

    if (cleanPass && cleanPass.length < 4) {
      setEditOtherError('New password must be at least 4 characters.');
      return;
    }

    const collision = users.some(
      (u) => u.id !== editingOtherUser.id && u.username.toLowerCase() === cleanUser
    );
    if (collision) {
      setEditOtherError(`Username @${cleanUser} is already in use.`);
      return;
    }

    setIsSubmittingOtherEdit(true);
    setEditOtherError(null);

    try {
      let hashedPassword: string | undefined = undefined;
      if (cleanPass) {
        hashedPassword = await hashPassword(cleanPass);
      }

      const updatedUser: AppUser = {
        ...editingOtherUser,
        name: cleanName,
        username: cleanUser,
        role: editOtherRole,
        avatarUrl: editOtherAvatar,
        ...(hashedPassword ? { password: hashedPassword } : {}),
      };

      if (onUpdateUser) {
        await onUpdateUser(updatedUser);
      }

      setEditingOtherUser(null);
    } catch (err: any) {
      setEditOtherError(err?.message || 'Failed to update profile.');
    } finally {
      setIsSubmittingOtherEdit(false);
    }
  };

  const handleDeleteUserClick = async (userId: string, userName: string) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Access Denied: Only administrators can remove staff accounts.');
      return;
    }

    if (userId === currentUser.id) {
      alert('Cannot delete active session.');
      return;
    }

    if (window.confirm(`Remove ${userName} from authorized staff?`)) {
      if (onDeleteUser) {
        await onDeleteUser(userId);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Admin Global Cover Photo Handlers
  // ---------------------------------------------------------------------------
  const handleGlobalCoverSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentUser.role !== 'ADMIN') {
      alert('Administrator privileges required to change global cover.');
      return;
    }

    setIsUploadingGlobalCover(true);
    setGlobalCoverMsg(null);

    try {
      const compressedDataUrl = await compressImage(file, 1920, 800, 0.82);
      if (onUpdateGlobalCoverPhoto) {
        await onUpdateGlobalCoverPhoto(compressedDataUrl);
      }
      setGlobalCoverMsg('Global team cover photo updated successfully!');
      setTimeout(() => setGlobalCoverMsg(null), 3500);
    } catch (err: any) {
      setGlobalCoverMsg(err?.message || 'Failed to upload global cover photo.');
    } finally {
      setIsUploadingGlobalCover(false);
      if (globalCoverInputRef.current) globalCoverInputRef.current.value = '';
    }
  };

  const handleResetGlobalCover = async () => {
    if (currentUser.role !== 'ADMIN') return;
    if (window.confirm('Reset the global cover photo to the default HIMU operations banner?')) {
      if (onUpdateGlobalCoverPhoto) {
        await onUpdateGlobalCoverPhoto(null);
      }
      setGlobalCoverMsg('Reverted global cover to default HIMU banner.');
      setTimeout(() => setGlobalCoverMsg(null), 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white border-t sm:border border-neutral-200 p-4 sm:p-6 shadow-2xl transition-all pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[92vh] flex flex-col">
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-2xs">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Staff Account & Cover Photo
              </h3>
              <p className="text-[11px] text-neutral-500">
                Manage officer credentials, circular avatar, and hero banner
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Main Navigation Tabs */}
        {!editingOtherUser && (
          <div className="grid grid-cols-3 border-b border-neutral-200 mt-2 shrink-0 text-center">
            <button
              onClick={() => setActiveTab('account')}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition border-b-2 ${
                activeTab === 'account'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <User className="h-4 w-4" />
              <span>My Account</span>
            </button>
            <button
              onClick={() => setActiveTab('switch')}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition border-b-2 ${
                activeTab === 'switch'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Switch User</span>
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition border-b-2 ${
                activeTab === 'manage'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Team Roster</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-4">
          
          {/* ================================================================= */}
          {/* SUB-VIEW: ADMIN EDITING ANOTHER OFFICER                           */}
          {/* ================================================================= */}
          {editingOtherUser ? (
            <form
              onSubmit={handleSaveOtherEdit}
              className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <div>
                  <div className="text-xs font-bold text-neutral-900">
                    Edit Staff Profile
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500">
                    @{editingOtherUser.username}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingOtherUser(null);
                    setEditOtherError(null);
                  }}
                  className="text-neutral-400 hover:text-neutral-700 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              {editOtherError && (
                <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{editOtherError}</span>
                </div>
              )}

              {/* Avatar Preview & Upload for this officer */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-neutral-200">
                {editOtherAvatar ? (
                  <img
                    src={editOtherAvatar}
                    alt={editOtherName}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-500/70 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 font-bold text-base border border-neutral-200 shrink-0">
                    {editOtherName.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-neutral-800">Officer Avatar</div>
                  <div className="text-[10px] text-neutral-400">Circular staff picture</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    ref={otherAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const compressed = await compressImage(file, 300, 300, 0.85);
                        setEditOtherAvatar(compressed);
                      } catch (err: any) {
                        setEditOtherError(err?.message || 'Failed to process avatar');
                      }
                      if (otherAvatarInputRef.current) otherAvatarInputRef.current.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => otherAvatarInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2 py-1 text-[11px] font-bold transition"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Upload</span>
                  </button>
                  {editOtherAvatar && (
                    <button
                      type="button"
                      onClick={() => setEditOtherAvatar(undefined)}
                      className="rounded-lg p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove avatar"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editOtherName}
                  onChange={(e) => setEditOtherName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-900 uppercase focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={editOtherUsername}
                  onChange={(e) => setEditOtherUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-mono text-neutral-900 lowercase focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">
                  Reset Password (Optional)
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showOtherPassword ? 'text' : 'password'}
                    value={editOtherPassword}
                    onChange={(e) => setEditOtherPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 pr-8 text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOtherPassword(!showOtherPassword)}
                    className="absolute right-2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showOtherPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  Only enter if resetting this user's password (min. 4 characters)
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 mb-1 uppercase tracking-wider">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditOtherRole('IT_OFFICER')}
                    className={`rounded-lg py-1.5 px-2 text-xs font-bold border transition ${
                      editOtherRole === 'IT_OFFICER'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-neutral-200 bg-white text-neutral-600'
                    }`}
                  >
                    IT OFFICER
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditOtherRole('ADMIN')}
                    className={`rounded-lg py-1.5 px-2 text-xs font-bold border transition ${
                      editOtherRole === 'ADMIN'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600'
                        : 'border-neutral-200 bg-white text-neutral-600'
                    }`}
                  >
                    ADMIN
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingOtherUser(null);
                    setEditOtherError(null);
                  }}
                  className="flex-1 rounded-lg border border-neutral-200 bg-white py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOtherEdit}
                  className="flex-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white py-2 text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmittingOtherEdit ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          ) : activeTab === 'account' ? (
            
            /* =============================================================== */
            /* TAB 1: MY ACCOUNT (PROFILE, CIRCULAR AVATAR, PASSWORD, COVER)    */
            /* =============================================================== */
            <form onSubmit={handleSaveProfile} className="space-y-4">
              
              {/* Feedback messages */}
              {profileError && (
                <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{profileError}</span>
                </div>
              )}
              {profileSuccess && (
                <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {/* SECTION A: CIRCULAR PROFILE AVATAR UPLOADER */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
                <div className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-2.5">
                  Circular Profile Picture
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {/* Avatar Circular Preview */}
                  <div className="relative group shrink-0">
                    {profileAvatar ? (
                      <img
                        src={profileAvatar}
                        alt={profileName}
                        className="h-20 w-20 rounded-full object-cover ring-4 ring-emerald-500/30 shadow-md transition-all group-hover:brightness-90"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-900 text-white text-2xl font-bold ring-4 ring-neutral-200 shadow-md">
                        {profileName.charAt(0) || 'O'}
                      </div>
                    )}

                    {/* Camera icon button overlay */}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition active:scale-90"
                      title="Upload circular avatar"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Upload Actions & Instructions */}
                  <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
                    <div>
                      <div className="text-xs font-bold text-neutral-900">
                        {profileName || 'IT Officer'}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500">
                        @{profileUsername} • <span className="font-semibold text-emerald-700">{currentUser.role}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-400">
                      Upload a circular portrait photo. It will display in the system header navigation and staff roster.
                    </div>

                    {/* Hidden Avatar File Input */}
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileSelected}
                    />

                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>{profileAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                      </button>

                      {profileAvatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white hover:bg-rose-50 text-neutral-600 hover:text-rose-600 px-2.5 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
                        >
                          <Trash className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: OFFICER CREDENTIALS & PASSWORD */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
                <div className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Account Credentials
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs font-semibold text-neutral-900 uppercase focus:bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={profileUsername}
                      onChange={(e) => setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs font-mono text-neutral-900 lowercase focus:bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>

                {/* Change Password Input */}
                <div className="pt-1">
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                    Change Password
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-neutral-400">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type={showProfilePassword ? 'text' : 'password'}
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      placeholder="Leave blank to keep current password"
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 pl-9 pr-9 py-2 text-xs font-mono text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowProfilePassword(!showProfilePassword)}
                      className="absolute right-3 text-neutral-400 hover:text-neutral-700 transition"
                      tabIndex={-1}
                    >
                      {showProfilePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-1">
                    Enter at least 4 characters if you wish to change your login password.
                  </span>
                </div>
              </div>

              {/* SECTION C: PERSONAL CUSTOM COVER PHOTO */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                    Hero Cover Photo
                  </div>
                  {profileCover ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      <Check className="h-3 w-3" />
                      <span>Custom Cover Active</span>
                    </span>
                  ) : globalCoverPhoto ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                      <span>Using Global Team Cover</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                      <span>Default HIMU Banner</span>
                    </span>
                  )}
                </div>

                {/* Banner Mini Preview */}
                <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-200 shadow-2xs">
                  <img
                    src={profileCover || globalCoverPhoto || '/himu-team-banner-1920.webp'}
                    alt="Active Cover Photo Preview"
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                    <span className="text-[10px] font-bold text-white tracking-wide drop-shadow-sm">
                      HEALTH INFORMATION MANAGEMENT UNIT
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500">
                  Customize the top banner that appears across your session. If reset, it automatically defaults to the system global cover.
                </p>

                {/* Hidden Cover File Input */}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverFileSelected}
                />

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>{profileCover ? 'Change Custom Cover' : 'Upload Custom Cover'}</span>
                  </button>

                  {profileCover && (
                    <button
                      type="button"
                      onClick={handleResetPersonalCover}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 px-2.5 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
                      title="Reset to global team cover photo"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset to Default</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SAVE BUTTONS */}
              <div className="flex items-center gap-2 pt-1">
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 px-4 py-2.5 text-xs font-bold transition active:scale-95"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white py-2.5 px-4 text-xs font-bold transition shadow-xs disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          ) : activeTab === 'switch' ? (
            
            /* =============================================================== */
            /* TAB 2: SIGN IN / SWITCH OFFICER                                  */
            /* =============================================================== */
            <div className="space-y-4">
              
              {/* Active User Card with Circular Avatar */}
              <div className="rounded-2xl bg-neutral-50 p-3.5 border border-neutral-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-500/70 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white font-bold text-sm shrink-0">
                      {currentUser.name.charAt(0) || 'O'}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                      Active Officer Session
                    </div>
                    <div className="font-bold text-xs text-neutral-900 truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500">
                      @{currentUser.username}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      currentUser.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                  {onLogout && (
                    <button
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      title="Sign Out"
                      className="rounded-lg p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 transition"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Login Credentials Form */}
              <form onSubmit={handleLogin} className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4">
                <div className="text-xs font-bold text-neutral-800">
                  Switch to Another Account
                </div>

                {loginError && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => {
                      setLoginUsername(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder="Username"
                    required
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                  <div className="relative flex items-center">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setLoginError(null);
                      }}
                      placeholder="Password"
                      required
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 pr-9 text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 text-neutral-400 hover:text-neutral-700"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white py-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isLoggingIn ? 'Verifying...' : 'Sign In as Officer'}
                </button>
              </form>

              {/* Quick Select Account List */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Quick Select Officer
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {users.map((user) => {
                    const isCurrent = currentUser.id === user.id;
                    const isSelected = loginUsername.toLowerCase() === user.username.toLowerCase();
                    const isAdmin = user.role === 'ADMIN';

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className={`w-full flex items-center justify-between rounded-xl p-2.5 text-left transition ${
                          isSelected
                            ? 'bg-neutral-900 text-white shadow-xs'
                            : 'bg-white hover:bg-neutral-50 border border-neutral-200/80 text-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-neutral-300"
                            />
                          ) : (
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : isAdmin
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {isAdmin ? (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">
                              {user.name}
                            </div>
                            <div
                              className={`text-[10px] font-mono truncate ${
                                isSelected ? 'text-white/70' : 'text-neutral-400'
                              }`}
                            >
                              @{user.username}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[9px] font-bold rounded px-1.5 py-0.5 ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : isAdmin
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {user.role}
                          </span>
                          {isCurrent && (
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                                isSelected ? 'bg-white text-neutral-900' : 'bg-emerald-500 text-white'
                              }`}
                            >
                              <Check className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            
            /* =============================================================== */
            /* TAB 3: TEAM ROSTER & ADMIN GLOBAL SETTINGS                       */
            /* =============================================================== */
            <div className="space-y-4">
              
              {/* ADMIN ONLY: GLOBAL COVER PHOTO MANAGEMENT */}
              {currentUser.role === 'ADMIN' && (
                <div className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-600 text-white text-xs">
                        <UploadCloud className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-purple-950">
                          Global System Cover Photo
                        </div>
                        <div className="text-[10px] text-purple-700">
                          Admin Global Hero Banner Control
                        </div>
                      </div>
                    </div>

                    {globalCoverPhoto ? (
                      <span className="rounded-full bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 text-[10px] font-bold">
                        Custom Global Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 text-neutral-600 px-2 py-0.5 text-[10px] font-bold">
                        Default HIMU Banner
                      </span>
                    )}
                  </div>

                  {/* Global Cover Mini Preview */}
                  <div className="relative w-full h-20 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-200 shadow-2xs">
                    <img
                      src={globalCoverPhoto || '/himu-team-banner-1920.webp'}
                      alt="Global System Cover Banner"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  <p className="text-[11px] text-neutral-600 leading-relaxed">
                    This banner will be shown by default to all officers and visitors unless an officer uploads their own personal cover photo in their account settings.
                  </p>

                  {globalCoverMsg && (
                    <div className="p-2 rounded-lg bg-purple-100/80 border border-purple-200 text-purple-900 text-[11px] font-semibold">
                      {globalCoverMsg}
                    </div>
                  )}

                  <input
                    ref={globalCoverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGlobalCoverSelected}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isUploadingGlobalCover}
                      onClick={() => globalCoverInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95 disabled:opacity-50"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>{isUploadingGlobalCover ? 'Uploading...' : 'Change Global Cover'}</span>
                    </button>

                    {globalCoverPhoto && (
                      <button
                        type="button"
                        onClick={handleResetGlobalCover}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 px-2.5 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reset to Default HIMU Banner</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ADMIN ONLY: REGISTER OFFICER BUTTON / FORM */}
              {currentUser.role === 'ADMIN' ? (
                !isAdding ? (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white py-2.5 text-xs font-bold transition shadow-xs active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Register New Officer</span>
                  </button>
                ) : (
                  <form
                    onSubmit={handleCreateUser}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-3 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                      <span className="text-xs font-bold text-neutral-900">
                        Register New Staff Account
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdding(false);
                          setFormError(null);
                        }}
                        className="text-neutral-400 hover:text-neutral-700 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    {formError && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1 uppercase">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. JUAN DELA CRUZ"
                        className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-900 uppercase focus:outline-none focus:border-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1 uppercase">
                        Username
                      </label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                        placeholder="e.g. jdelacruz"
                        className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-mono text-neutral-900 lowercase focus:outline-none focus:border-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1 uppercase">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 4 characters"
                        className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1 uppercase">
                        Role
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewRole('IT_OFFICER')}
                          className={`rounded-lg py-1.5 px-2 text-xs font-bold border transition ${
                            newRole === 'IT_OFFICER'
                              ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600'
                              : 'border-neutral-200 bg-white text-neutral-600'
                          }`}
                        >
                          IT OFFICER
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewRole('ADMIN')}
                          className={`rounded-lg py-1.5 px-2 text-xs font-bold border transition ${
                            newRole === 'ADMIN'
                              ? 'border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600'
                              : 'border-neutral-200 bg-white text-neutral-600'
                          }`}
                        >
                          ADMIN
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingNew}
                      className="w-full rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white py-2 text-xs font-bold transition disabled:opacity-50"
                    >
                      {isSubmittingNew ? 'Saving...' : 'Register Officer'}
                    </button>
                  </form>
                )
              ) : (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 text-center">
                  <div className="text-xs font-bold text-neutral-700">Staff Roster Directory</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    Registering new officers requires Administrator privileges.
                  </div>
                </div>
              )}

              {/* ROSTER LIST WITH CIRCULAR AVATARS */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Registered Staff ({users.length})
                </div>

                <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white overflow-hidden max-h-56 overflow-y-auto">
                  {users.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    const isAdmin = user.role === 'ADMIN';

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2.5 hover:bg-neutral-50 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-neutral-300"
                            />
                          ) : (
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                                isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-neutral-900 truncate flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="rounded bg-neutral-200 px-1 text-[9px] font-bold text-neutral-700">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-400 truncate">
                              @{user.username}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[9px] font-bold rounded px-1.5 py-0.5 ${
                              isAdmin
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {user.role}
                          </span>

                          {(currentUser.role === 'ADMIN' || isSelf) && (
                            <button
                              onClick={() => handleStartEditOther(user)}
                              title={isSelf ? 'Edit my profile in My Account' : `Edit ${user.name}`}
                              className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {currentUser.role === 'ADMIN' && onDeleteUser && (
                            <button
                              onClick={() => handleDeleteUserClick(user.id, user.name)}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot delete active session' : `Remove ${user.name}`}
                              className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
