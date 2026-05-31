import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListFilter, MoreVertical, Download, Palette, Trash2, Archive, Settings as SettingsIcon } from 'lucide-react';
import { useApp } from '../../AppContext';
import { SortOption, MenuOption } from '../ui/common';

export const Header: React.FC = () => {
  const { activeTab, isArchive, sortType, setSortType, openOverlay } = useApp();
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const toggleSortMenu = (open: boolean) => {
    if (open) {
      window.history.pushState({ sort: true }, '', '#sort');
      setShowSortMenu(true);
    } else {
      if (showSortMenu) window.history.back();
      setShowSortMenu(false);
    }
  };

  const toggleOptionsMenu = (open: boolean) => {
    if (open) {
      window.history.pushState({ options: true }, '', '#options');
      setShowOptionsMenu(true);
    } else {
      if (showOptionsMenu) window.history.back();
      setShowOptionsMenu(false);
    }
  };

  const handleOpenOverlay = (type: 'settings' | 'theme' | 'backup' | 'trash' | 'archive') => {
    openOverlay(type);
    setShowOptionsMenu(false);
  };

  return (
    <header className="h-16 bg-[#333333] text-white flex items-center justify-between px-6 z-50 shrink-0 shadow-md">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
          <span className="w-2 h-6 bg-[#FBC02D] rounded-full mr-1" />
          {isArchive ? 'ARCHIVE' : (activeTab === 'habits' ? 'TRACKER' : activeTab)}
        </h1>
        {isArchive && (
          <button onClick={() => window.history.back()} className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-1 rounded">
            Exit
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <div className="relative">
          <button 
            onClick={() => toggleSortMenu(!showSortMenu)}
            className="p-2 text-white/50 hover:text-white transition-all"
          >
            <ListFilter size={24} />
          </button>
          <AnimatePresence>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => toggleSortMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-2xl py-2 z-[110] border border-gray-100"
                >
                  <SortOption selected={sortType === 'modified'} label="Date Modified" onClick={() => { setSortType('modified'); setShowSortMenu(false); }} />
                  <SortOption selected={sortType === 'created'} label="Date Created" onClick={() => { setSortType('created'); setShowSortMenu(false); }} />
                  <SortOption selected={sortType === 'alphabetical'} label="Alphabetical" onClick={() => { setSortType('alphabetical'); setShowSortMenu(false); }} />
                  <SortOption selected={sortType === 'color'} label="Color" onClick={() => { setSortType('color'); setShowSortMenu(false); }} />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => toggleOptionsMenu(!showOptionsMenu)}
            className="p-2 text-white/50 hover:text-white transition-all"
          >
            <MoreVertical size={24} />
          </button>

          <AnimatePresence>
            {showOptionsMenu && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => toggleOptionsMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-2xl py-2 z-[110] border border-gray-100"
                >
                  <MenuOption icon={<Download size={18}/>} label="Export Backup" onClick={() => handleOpenOverlay('backup')} />
                  <MenuOption icon={<Palette size={18}/>} label="App Theme" onClick={() => handleOpenOverlay('theme')} />
                  <MenuOption icon={<Archive size={18}/>} label="Archive" onClick={() => handleOpenOverlay('archive')} />
                  <MenuOption icon={<Trash2 size={18}/>} label="Trash Bin" onClick={() => handleOpenOverlay('trash')} />
                  <MenuOption icon={<SettingsIcon size={18}/>} label="Settings" onClick={() => handleOpenOverlay('settings')} />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
