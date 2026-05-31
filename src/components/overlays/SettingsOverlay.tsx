import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface SettingsOverlayProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ title, onClose, children }) => (
  <motion.div 
    initial={{ x: '100%' }} 
    animate={{ x: 0 }} 
    exit={{ x: '100%' }} 
    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    className="fixed inset-0 bg-white z-[200] flex flex-col"
  >
    <div className="h-16 bg-[#333333] text-white flex items-center px-4 gap-4 shrink-0 shadow-lg">
      <button onClick={onClose} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={24}/></button>
      <h2 className="font-black text-lg uppercase tracking-tight">{title}</h2>
    </div>
    <div className="flex-1 overflow-y-auto p-6">
      {children}
    </div>
  </motion.div>
);
