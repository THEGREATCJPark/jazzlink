import React from 'react';
import { ViewType } from '../types.ts';
import HomeIcon from './icons/HomeIcon.tsx';
import UserIcon from './icons/UserIcon.tsx';
import CogIcon from './icons/CogIcon.tsx';
import CalendarIcon from './icons/CalendarIcon.tsx';

interface BottomNavProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const navItems: { view: ViewType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { view: '홈', label: '홈', icon: HomeIcon },
  { view: '일정', label: '일정', icon: CalendarIcon },
  { view: '프로필', label: '프로필', icon: UserIcon },
  { view: '설정', label: '설정', icon: CogIcon },
];

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-white dark:bg-jazz-blue-800 border-t border-gray-200 dark:border-jazz-blue-700 max-w-md mx-auto">
      <div className="flex justify-around items-center h-full">
        {navItems.map(({ view, label, icon: Icon }) => {
          const isActive = currentView === view;
          return (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${isActive ? 'text-jazz-blue-900 dark:text-white' : 'text-gray-500 dark:text-jazz-gray-400 hover:text-jazz-blue-900 dark:hover:text-white'}`}
            >
              <Icon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;