import React from 'react';
import { Calendar as CalendarIcon, Dumbbell, Trophy, User } from 'lucide-react';

export type TabType = 'calendar' | 'workout' | 'prs' | 'profile';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'calendar' as TabType, label: 'Calendar', icon: CalendarIcon },
    { id: 'workout' as TabType, label: 'Workout', icon: Dumbbell },
    { id: 'prs' as TabType, label: 'PRs', icon: Trophy },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-4 py-2 shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center py-1 px-4 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-cyan-400 bg-cyan-500/10 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={22} className={isActive ? 'scale-110 transition-transform' : ''} />
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
