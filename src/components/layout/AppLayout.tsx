import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useApp } from '../../AppContext';
import { Tab } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { activeTab, setActiveTab } = useApp();
  const [direction, setDirection] = useState(0);

  const TABS: Tab[] = ['notes', 'expenses', 'habits', 'calendar'];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.98
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.98
    })
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white overflow-hidden select-none relative font-sans">
      <Header />

      <main className="flex-1 relative overflow-hidden bg-gray-50/50">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeTab}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 overflow-hidden touch-pan-y"
            style={{ overscrollBehaviorY: 'contain' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
};
