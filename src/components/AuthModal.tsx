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

  // New User Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('IT_OFFICER');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleRoleSelect = (user: AppUser) => {
    onSwitchUser(user);
    onClose();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim().toUpperCase();
    const cleanEmail = newEmail.trim().toLowerCase();

    if (!cleanName) {
      setFormError('Please enter the officer full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid official email address.');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      setFormError('An account with this email already exists.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (onAddUser) {
        await onAddUser({
          name: cleanName,
          email: cleanEmail,
          role: newRole,
        });
      }

      setNewName('');
      setNewEmail('');
      setNewRole('IT_OFFICER');
      setIsAdding(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      alert('You cannot delete the currently active signed-in session.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove ${userName} from authorized staff?`)) {
      if (onDeleteUser) {
        await onDeleteUser(userId);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-t-[32px] sm:rounded-3xl bg-white border-t sm:border border-neutral-200/90 p-5 sm:p-6 shadow-2xl transition-all pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[92vh] flex flex-col">
        {/* Mobile Native Drag Pill Handle */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-xs shrink-0">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all border-b-2 ${
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'manage'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Manage Team ({users.length})</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-3">
          {/* TAB 1: SWITCH ACTIVE USER */}
          {activeTab === 'switch' && (
            <div className="space-y-3">
              {/* Active User Card */}
              <div className="rounded-2xl bg-neutral-50 p-3.5 border border-neutral-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                    Current Active Session
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-neutral-900">
                    {currentUser.name}
                  </span>
                  <span className="text-[11px] text-neutral-500 block truncate">
                    {currentUser.email}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0 ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  {currentUser.role === 'ADMIN' ? 'ADMIN' : 'IT OFFICER'}
                </span>
              </div>

              {/* Roster of users */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Select Identity (1-Click Switch)
                </label>

                {users.map((user) => {
                  const isSelected = currentUser.id === user.id;
                  const isAdmin = user.role === 'ADMIN';

                  return (
                    <button
                      key={user.id}
                      onClick={() => handleRoleSelect(user)}
                      className={`w-full flex items-center justify-between rounded-2xl p-3 text-left transition-all ${
                        isSelected
                          ? 'bg-neutral-900 text-white shadow-md'
                          : 'bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200/90 shadow-2xs hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : isAdmin
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {isAdmin ? (
                            <ShieldCheck className="h-4.5 w-4.5" />
                          ) : (
                            <UserCheck className="h-4.5 w-4.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">
                            {user.name}
                          </div>
                          <div
                            className={`text-[11px] truncate ${
                              isSelected ? 'text-white/70' : 'text-neutral-500'
                            }`}
                          >
                            {user.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : isAdmin
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {user.role}
                        </span>
                        {isSelected && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-neutral-900">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE ACCOUNTS (ADMIN / STAFF ROSTER) */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* Add User Toggle Button */}
              {!isAdding ? (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white p-3 text-xs font-bold transition shadow-xs active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Register New Staff Officer / Admin</span>
                </button>
              ) : (
                /* Inline Add User Form */
                <form
                  onSubmit={handleCreateUser}
                  className="rounded-2xl border border-neutral-300 bg-neutral-50/80 p-4 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                    <span className="text-xs font-bold text-neutral-900">
                      New Officer Registration
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
                    <div className="flex items-center gap-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Full Name:
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. CHAN PEREZ or KEN LLAGUNO"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 uppercase focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Official Email Address:
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. chan.perez@paranaque.gov.ph"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 lowercase focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      System Role & Permissions:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewRole('IT_OFFICER')}
                        className={`rounded-xl p-2 text-left border text-xs font-semibold transition ${
                          newRole === 'IT_OFFICER'
                            ? 'border-blue-500 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/30'
                            : 'border-neutral-200 bg-white text-neutral-700'
                        }`}
                      >
                        <div className="font-bold">IT OFFICER</div>
                        <div className="text-[10px] text-neutral-500">Dispatch & Scanner</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewRole('ADMIN')}
                        className={`rounded-xl p-2 text-left border text-xs font-semibold transition ${
                          newRole === 'ADMIN'
                            ? 'border-purple-500 bg-purple-50/80 text-purple-900 ring-2 ring-purple-500/30'
                            : 'border-neutral-200 bg-white text-neutral-700'
                        }`}
                      >
                        <div className="font-bold">ADMIN</div>
                        <div className="text-[10px] text-neutral-500">Full System Control</div>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white py-2.5 text-xs font-bold transition shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Registering...' : 'Save & Register Officer'}
                  </button>
                </form>
              )}

              {/* Roster Table of Users */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Registered HIMU Officers Roster ({users.length})
                </span>

                <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200/90 bg-white overflow-hidden shadow-2xs">
                  {users.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    const isAdmin = user.role === 'ADMIN';

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 hover:bg-neutral-50/80 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-neutral-900 truncate flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="rounded bg-neutral-200/80 px-1 py-0.2 text-[9px] font-bold text-neutral-700">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-500 truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                              isAdmin ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {user.role}
                          </span>

                          {onDeleteUser && (
                            <button
                              onClick={() => handleDelete(user.id, user.name)}
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
