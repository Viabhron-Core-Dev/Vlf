import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export const SortOption: React.FC<{ selected: boolean, label: string, onClick: () => void }> = ({ selected, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${selected ? 'bg-gray-50' : ''}`}
  >
    <span className={`text-sm tracking-tight ${selected ? 'font-black text-[#333333]' : 'font-bold text-gray-500'}`}>{label}</span>
    {selected && <Check size={16} className="text-[#FBC02D]" />}
  </button>
);

export const MenuOption: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-gray-600 hover:text-black"
  >
    <div className="text-black/40">{icon}</div>
    <span className="text-sm font-bold tracking-tight">{label}</span>
  </button>
);

export const SettingsRow: React.FC<{ label: string, value: string, isAction?: boolean, onClick?: () => void }> = ({ label, value, isAction, onClick }) => (
  <div 
    onClick={onClick}
    className="py-4 flex items-center justify-between group cursor-pointer active:bg-gray-50 transition-colors rounded-xl px-2"
  >
    <div className="flex flex-col">
       <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</span>
       <span className={`text-sm font-bold tracking-tight mt-0.5 ${isAction ? 'text-red-500' : 'text-[#333333]'}`}>{value}</span>
    </div>
    <div className="text-gray-200 group-hover:text-gray-400">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.75 13.5L11.25 9L6.75 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  </div>
);
