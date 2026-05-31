import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tab, SortType } from './types';
import { tagsGetAll } from './lib/db';

interface AppContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  sortType: SortType;
  setSortType: (sort: SortType) => void;
  isArchive: boolean;
  setIsArchive: (archived: boolean) => void;
  activeOverlay: 'settings' | 'theme' | 'backup' | 'trash' | 'tags' | 'archive' | 'logs' | null;
  openOverlay: (type: 'settings' | 'theme' | 'backup' | 'trash' | 'tags' | 'archive' | 'logs') => void;
  closeOverlay: () => void;
  triggerAdd: number;
  handleGlobalAdd: () => void;
  journalTags: { id: number, name: string }[];
  noteTags: { id: number, name: string }[];
  refreshTags: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<Tab>('notes');
  const [sortType, setSortType] = useState<SortType>('modified');
  const [isArchive, setIsArchive] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<'settings' | 'theme' | 'backup' | 'trash' | 'tags' | 'archive' | 'logs' | null>(null);
  const [triggerAdd, setTriggerAdd] = useState(0);
  const [journalTags, setJournalTags] = useState<{ id: number, name: string }[]>([]);
  const [noteTags, setNoteTags] = useState<{ id: number, name: string }[]>([]);

  const TABS: Tab[] = ['notes', 'expenses', 'habits', 'calendar'];

  const openOverlay = (type: 'settings' | 'theme' | 'backup' | 'trash' | 'tags' | 'archive' | 'logs') => {
    window.history.pushState({ overlay: type }, '', `#${type}`);
    setActiveOverlay(type);
  };

  const closeOverlay = () => {
    if (activeOverlay) window.history.back();
  };

  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab);
    setTriggerAdd(0);
    setIsArchive(false);
    if (window.location.hash !== `#${tab}`) {
      window.history.pushState({ tab }, '', `#${tab}`);
    }
  };

  const handleGlobalAdd = () => {
    setTriggerAdd(Date.now());
  };

  const refreshTags = async () => {
    const [jTags, nTags] = await Promise.all([
      tagsGetAll('journal'),
      tagsGetAll('note')
    ]);
    setJournalTags(jTags as { id: number, name: string }[]);
    setNoteTags(nTags as { id: number, name: string }[]);
  };

  useEffect(() => {
    refreshTags();
  }, []);

  // Handle browser back button and initial state
  useEffect(() => {
    const syncStateFromUrl = () => {
      const hash = window.location.hash.replace('#', '');
      console.log('popstate hash:', hash);
      if (TABS.includes(hash as Tab)) {
        setActiveTabState(hash as Tab);
        setIsArchive(false);
        setActiveOverlay(null);
      } else if (hash === 'notes-archive' || hash === 'archive') {
        setActiveTabState('notes');
        setIsArchive(true);
        setActiveOverlay('archive');
      } else if (['settings', 'theme', 'backup', 'trash', 'tags', 'archive', 'logs'].includes(hash)) {
        setActiveOverlay(hash as any);
      } else {
        if (!window.location.hash) {
          window.history.replaceState({ tab: 'notes' }, '', '#notes');
        }
        setActiveOverlay(null);
      }
    };

    window.addEventListener('popstate', syncStateFromUrl);
    syncStateFromUrl();

    return () => window.removeEventListener('popstate', syncStateFromUrl);
  }, []);

  return (
    <AppContext.Provider 
      value={{ 
        activeTab, 
        setActiveTab, 
        sortType, 
        setSortType, 
        isArchive, 
        setIsArchive,
        activeOverlay,
        openOverlay,
        closeOverlay,
        triggerAdd,
        handleGlobalAdd,
        journalTags,
        noteTags,
        refreshTags
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
