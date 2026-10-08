import React from 'react';
import type { AppUser } from '../types/inventory';
import { DEFAULT_USERS } from '../data/mockData';
import { X, ShieldCheck, UserCheck, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onSwitchUser: (user: AppUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser,
}) => {
  if (!isOpen) return null;

  const handleRoleSelect = (user: AppUser) => {
    onSwitchUser(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-neutral-200/90 p-6 shadow-2xl transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-neutral-900">
                HIMU Security & Access
              </h3>
              <p className="text-xs text-neutral-500">
                2 Authorized System Roles • City of Parañaque
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current User Status Pill */}
        <div className="my-4 rounded-2xl bg-white/70 p-3.5 border border-white/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
              Active Signed-In Account
            </span>
            <span className="font-semibold text-xs text-neutral-900">
              {currentUser.name}
            </span>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            currentUser.role === 'ADMIN'
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {currentUser.role === 'ADMIN' ? 'ADMIN' : 'IT OFFICER'}
          </span>
        </div>

        {/* 1-Click Role Switcher */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
            Select Role (Instant Switch)
          </label>

          {DEFAULT_USERS.map((user) => {
            const isSelected = currentUser.role === user.role;
            const isAdmin = user.role === 'ADMIN';

            return (
              <button
                key={user.id}
                onClick={() => handleRoleSelect(user)}
                className={`w-full flex items-center justify-between rounded-2xl p-3.5 text-left transition-all ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-md'
                    : 'bg-white/80 hover:bg-white text-neutral-800 border border-black/[0.06] hover:shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : isAdmin ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {isAdmin ? <ShieldCheck className="h-4.5 w-4.5" /> : <UserCheck className="h-4.5 w-4.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold">
                      {user.name}
                    </div>
                    <div className={`text-[11px] ${isSelected ? 'text-white/70' : 'text-neutral-400'}`}>
                      {isAdmin ? 'Full System Admin Permissions' : 'Equipment Transfers & Scanning'}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-neutral-900">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Security Note */}
        <p className="mt-4 text-[11px] text-neutral-500 text-center leading-relaxed">
          Integrated with City of Parañaque HIMU access protocols. Only <strong>ADMIN</strong> and <strong>IT OFFICER</strong> accounts are permitted to record transfers.
        </p>
      </div>
    </div>
  );
};
