import React, { useState, useEffect } from 'react';
import {
  User,
  LogOut,
  Trash2,
  History,
  AlertTriangle,
  Scale,
  Ruler,
  Key,
} from 'lucide-react';
import type { UserProfile, BodyweightLogEntry } from '../types';
import { formatDateLabel } from '../utils/dateUtils';

interface ProfileViewProps {
  userEmail?: string | null;
  profile: UserProfile;
  bodyweightLogs: BodyweightLogEntry[];
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onLogout: () => Promise<void>;
  onDeleteAccount: (reauthPassword?: string) => Promise<void>;
  onError: (msg: string) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userEmail,
  profile,
  bodyweightLogs,
  onUpdateProfile,
  onLogout,
  onDeleteAccount,
  onError,
}) => {
  const [heightStr, setHeightStr] = useState<string>(String(profile.height));
  const [bodyweightStr, setBodyweightStr] = useState<string>(String(profile.bodyweight));
  const [ageStr, setAgeStr] = useState<string>(String(profile.age));
  const [gender, setGender] = useState(profile.gender);
  const [unit, setUnit] = useState(profile.unit);
  const [formError, setFormError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [requiresReauthPass, setRequiresReauthPass] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setHeightStr(String(profile.height));
    setBodyweightStr(String(profile.bodyweight));
    setAgeStr(String(profile.age));
    setGender(profile.gender);
    setUnit(profile.unit);
  }, [profile]);

  const handleSaveProfile = async () => {
    const h = parseFloat(heightStr.trim());
    const bw = parseFloat(bodyweightStr.trim());
    const a = parseInt(ageStr.trim(), 10);

    if (heightStr.trim() === '' || isNaN(h) || h <= 0) {
      setFormError('Please enter a valid height greater than 0.');
      return;
    }
    if (bodyweightStr.trim() === '' || isNaN(bw) || bw <= 0) {
      setFormError('Please enter a valid bodyweight greater than 0.');
      return;
    }
    if (ageStr.trim() === '' || isNaN(a) || a <= 0) {
      setFormError('Please enter a valid age greater than 0.');
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      await onUpdateProfile({
        height: h,
        bodyweight: bw,
        age: a,
        gender,
        unit,
      });
    } catch (err: any) {
      onError(err?.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccountClick = async () => {
    setIsDeleting(true);
    try {
      await onDeleteAccount(reauthPassword);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      if (err?.message?.includes('Re-authentication required') || err?.code === 'auth/requires-recent-login') {
        setRequiresReauthPass(true);
      } else {
        onError(err?.message || 'Failed to delete account');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full space-y-6 shadow-2xl animate-in fade-in zoom-in-95 font-['Outfit',sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/20">
            <User size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-white">Profile & Settings</h3>
            <p className="text-xs text-slate-400 truncate max-w-[220px]">{userEmail || 'Account'}</p>
          </div>
        </div>
      </div>

      {/* Inline Form Validation Error */}
      {formError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
          {formError}
        </div>
      )}

      {/* Profile Inputs */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
              <Ruler size={13} className="text-cyan-400" /> Height (cm)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={heightStr}
              onChange={(e) => {
                setFormError(null);
                setHeightStr(e.target.value);
              }}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
              <Scale size={13} className="text-cyan-400" /> Bodyweight ({unit})
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={bodyweightStr}
              onChange={(e) => {
                setFormError(null);
                setBodyweightStr(e.target.value);
              }}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Age</label>
            <input
              type="text"
              inputMode="numeric"
              value={ageStr}
              onChange={(e) => {
                setFormError(null);
                setAgeStr(e.target.value);
              }}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'kg' | 'lb')}
              className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none font-bold text-cyan-400"
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition"
        >
          {isSaving ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </div>

      {/* Bodyweight Log History */}
      {bodyweightLogs.length > 0 && (
        <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 max-h-36 overflow-y-auto">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <History size={14} className="text-cyan-400" /> Bodyweight History Log
          </h4>
          <div className="space-y-1">
            {bodyweightLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-xs text-slate-400">
                <span>{formatDateLabel(log.date)}</span>
                <span className="font-semibold text-white">
                  {log.weight} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons: Logout & Delete Account */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-400 hover:text-red-300 border border-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
        >
          <LogOut size={18} /> Logout
        </button>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2 rounded-xl text-slate-500 hover:text-red-400 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-red-500/10 transition"
          >
            <Trash2 size={14} /> Delete My Account & All Data
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
              <AlertTriangle size={16} /> Confirm Permanent Account Deletion
            </div>
            <p className="text-[11px] text-slate-300">
              This will permanently delete your profile and ALL logged workouts and custom exercises.
            </p>

            {requiresReauthPass && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-300 font-semibold flex items-center gap-1">
                  <Key size={12} /> Please enter your password to confirm:
                </label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccountClick}
                disabled={isDeleting}
                className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
