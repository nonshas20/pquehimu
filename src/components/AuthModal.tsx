import React, { useState } from 'react';
import type { AppUser, UserRole } from '../types/inventory';
import { X, ShieldCheck, UserCheck, Check, Plus, Trash, AlertCircle } from './HugeIcons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onSwitchUser: (user: AppUser) => void;
  users: AppUser[];
  onAddUser?: (user: Omit<AppUser, 'id'>) => Promise<boolean> | void;
  onDeleteUser?: (userId: string) => Promise<boolean> | void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser,
  users,
  onAddUser,
  onDeleteUser,
}) => {
  const [activeTab, setActiveTab] = useState<'switch' | 'manage'>('switch');

  // Sign In / Switch State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // New User Registration Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('IT_OFFICER');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectUser = (user: AppUser) => {
    setLoginUsername(user.username);
    setLoginPassword('');
    setLoginError(null);
  };

  const handleLogin = (e: React.FormEvent) => {
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
      setLoginError('User not found');
      return;
    }

    // Verify password (default 'password123' if not yet defined)
    const expectedPassword = matched.password || 'password123';
    if (cleanPass !== expectedPassword) {
      setLoginError('Incorrect password');
      return;
    }

    onSwitchUser(matched);
    onClose();
  };

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

    if (users.some((u) => u.username.toLowerCase() === cleanUser)) {
      setFormError(`Username @${cleanUser} is already registered.`);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (onAddUser) {
        await onAddUser({
          name: cleanName,
          username: cleanUser,
          password: cleanPass,
          role: newRole,
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
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white border-t sm:border border-neutral-200 p-5 shadow-2xl transition-all pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[92vh] flex flex-col">
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

        {/* Minimal Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">
              User Accounts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200 mt-2 shrink-0">
          <button
            onClick={() => setActiveTab('switch')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition border-b-2 ${
              activeTab === 'switch'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Sign In</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition border-b-2 ${
              activeTab === 'manage'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Team Roster ({users.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-3">
          {/* TAB 1: SIGN IN / SWITCH */}
          {activeTab === 'switch' && (
            <div className="space-y-3">
              {/* Active User Session Pill */}
              <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-200 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                    Active Session
                  </div>
                  <div className="font-bold text-xs text-neutral-900 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500">
                    @{currentUser.username}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>

              {/* Login Credentials Form */}
              <form onSubmit={handleLogin} className="space-y-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3">
                <div className="text-[11px] font-bold text-neutral-700">
                  Officer Credentials
                </div>

                {loginError && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => {
                      setLoginUsername(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder="Username"
                    required
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder="Password"
                    required
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white py-2 text-xs font-bold transition active:scale-95"
                >
                  Sign In
                </button>
              </form>

              {/* Quick Select User List */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Select Account
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
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
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : isAdmin
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isAdmin ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </div>
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
          )}

          {/* TAB 2: MANAGE TEAM ROSTER */}
          {activeTab === 'manage' && (
            <div className="space-y-3">
              {/* Register Button or Form */}
              {!isAdding ? (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white py-2.5 text-xs font-bold transition shadow-xs active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Register Officer</span>
                </button>
              ) : (
                <form
                  onSubmit={handleCreateUser}
                  className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2.5 animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200">
                    <span className="text-xs font-bold text-neutral-900">
                      Register Officer
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
                    <label className="block text-[10px] font-bold text-neutral-600 mb-0.5 uppercase">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. CHAN PEREZ"
                      className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-900 uppercase focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-0.5 uppercase">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      placeholder="e.g. chanperez"
                      className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-mono text-neutral-900 lowercase focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-0.5 uppercase">
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
                    <label className="block text-[10px] font-bold text-neutral-600 mb-0.5 uppercase">
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
                    disabled={isSubmitting}
                    className="w-full rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white py-2 text-xs font-bold transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Register Officer'}
                  </button>
                </form>
              )}

              {/* Roster List */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Registered Staff ({users.length})
                </div>

                <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white overflow-hidden max-h-56 overflow-y-auto">
                  {users.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    const isAdmin = user.role === 'ADMIN';

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2.5 hover:bg-neutral-50 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </div>
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

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[9px] font-bold rounded px-1.5 py-0.5 ${
                              isAdmin
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {user.role}
                          </span>

                          {onDeleteUser && (
                            <button
                              onClick={() => handleDelete(user.id, user.name)}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot delete active session' : `Remove ${user.name}`}
                              className="rounded p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
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
