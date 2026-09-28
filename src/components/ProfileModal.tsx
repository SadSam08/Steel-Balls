import React from 'react';
import { X } from 'lucide-react';
import type { UserProfile, BodyweightLogEntry } from '../types';
import { ProfileView } from './ProfileView';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  profile: UserProfile;
  bodyweightLogs: BodyweightLogEntry[];
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onLogout: () => Promise<void>;
  onDeleteAccount: (reauthPassword?: string) => Promise<void>;
  onError: (msg: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  profile,
  bodyweightLogs,
  onUpdateProfile,
  onLogout,
  onDeleteAccount,
  onError,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-md my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 shadow-lg transition"
          aria-label="Close profile"
        >
          <X size={18} />
        </button>
        <ProfileView
          userEmail={userEmail}
          profile={profile}
          bodyweightLogs={bodyweightLogs}
          onUpdateProfile={async (updates) => {
            await onUpdateProfile(updates);
            onClose();
          }}
          onLogout={onLogout}
          onDeleteAccount={async (pass) => {
            await onDeleteAccount(pass);
            onClose();
          }}
          onError={onError}
        />
      </div>
    </div>
  );
};
