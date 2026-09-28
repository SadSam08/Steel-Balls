import React from 'react';
import { User } from 'lucide-react';
import type { UserProfile } from '../types';
import { SteelBallsIcon } from './SteelBallsIcon';

interface HeaderProps {
  profile: UserProfile | null;
  onOpenProfile: () => void;
  userEmail?: string | null;
}

export const Header: React.FC<HeaderProps> = ({ onOpenProfile, userEmail }) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-700/30 border border-slate-600/40">
          <SteelBallsIcon size={26} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            STEEL<span className="text-slate-300">BALLS</span>
          </h1>
          {userEmail && (
            <p className="text-[10px] text-slate-400 truncate max-w-[160px] sm:max-w-xs">
              {userEmail}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onOpenProfile}
        className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all border border-slate-700/50 active:scale-95"
        title="Open Profile"
        aria-label="Profile"
      >
        <User size={20} className="text-slate-300" />
      </button>
    </header>
  );
};
