import React from 'react';
import { StickyNote, Activity, Wallet, Calendar, Plus } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Tab } from '../../types';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, handleGlobalAdd, openOverlay } = useApp();

  const handleArchiveLongPress = () => {
    if (activeTab === 'notes') {
      openOverlay('archive');
    }
  };

  return (
    <div className="relative shrink-0">
      <div className="absolute inset-x-0 bottom-18 top-[-35px] pointer-events-none z-10 overflow-visible">
        <svg width="100%" height="50" viewBox="0 0 100 50" preserveAspectRatio="none" className="drop-shadow-[0_-12px_15px_rgba(0,0,0,0.05)]">
          <path 
            d="M 0 50 L 0 15 L 30 15 C 36 15 38 48 50 48 C 62 48 64 15 70 15 L 100 15 L 100 50 Z" 
            fill="white" 
          />
        </svg>
      </div>

      <nav className="h-18 pb-safe bg-white flex items-center justify-around px-4 relative z-20 shrink-0">
        <NavButton 
          active={activeTab === 'notes'} 
          onClick={() => setActiveTab('notes')}
          icon={<StickyNote size={24} />}
          label="Notes"
        />
        <NavButton 
          active={activeTab === 'habits'} 
          onClick={() => setActiveTab('habits')}
          icon={<Activity size={24} />}
          label="Habits"
        />

        {/* Global Add Button positioned in Valley */}
        <div className="h-full w-18 relative">
          <LongPressButton 
            onLongPress={handleArchiveLongPress}
            onClick={handleGlobalAdd}
            className="absolute left-1/2 bottom-5 -translate-x-1/2 w-16 h-16 bg-[#00897B] text-white shadow-2xl flex items-center justify-center active:scale-90 hover:scale-105 transition-all outline-none rounded-full z-30"
          >
            <Plus size={40} strokeWidth={4} />
          </LongPressButton>
        </div>

        <NavButton 
          active={activeTab === 'expenses'} 
          onClick={() => setActiveTab('expenses')}
          icon={<Wallet size={24} />}
          label="Expense"
        />
        <NavButton 
          active={activeTab === 'calendar'} 
          onClick={() => setActiveTab('calendar')}
          icon={<Calendar size={24} />}
          label="Calendar"
        />
      </nav>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${active ? 'text-[#333333]' : 'text-gray-300 hover:text-gray-400'}`}
    >
      <div className={`p-1 ${active ? 'scale-110' : ''} transition-transform`}>
        {icon}
      </div>
    </button>
  );
};

const LongPressButton: React.FC<{ children: React.ReactNode, onLongPress: () => void, onClick: () => void, className?: string }> = ({ children, onLongPress, onClick, className }) => {
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = React.useRef(false);
  const startPos = React.useRef({ x: 0, y: 0 });
  const isMoved = React.useRef(false);

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    startPos.current = { x: clientX, y: clientY };
    isMoved.current = false;
    isLongPressActive.current = false;

    timerRef.current = setTimeout(() => {
      if (!isMoved.current) {
        onLongPress();
        isLongPressActive.current = true;
      }
    }, 750);
  };

  const stop = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMoved.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dist = Math.sqrt(
      Math.pow(clientX - startPos.current.x, 2) + 
      Math.pow(clientY - startPos.current.y, 2)
    );

    if (dist > 10) {
      isMoved.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActive.current = false;
      return;
    }
    onClick();
  };

  return (
    <div 
      onMouseDown={start}
      onMouseUp={stop}
      onMouseMove={handleMove}
      onTouchStart={start}
      onTouchEnd={stop}
      onTouchMove={handleMove}
      onContextMenu={(e) => {
        if (isLongPressActive.current || timerRef.current) {
          e.preventDefault();
        }
      }}
      onClick={handleClick}
      className={`${className} select-none touch-none`}
    >
      {children}
    </div>
  );
};
