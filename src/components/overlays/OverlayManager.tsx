import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useApp } from '../../AppContext';
import { SettingsOverlay } from './SettingsOverlay';
import { TrashBinOverlay } from './TrashBinOverlay';
import { ArchiveOverlay } from './ArchiveOverlay';
import { TagsOverlay } from './TagsOverlay';
import { LogsOverlay } from './LogsOverlay';
import { Download, Palette, Tag, Terminal } from 'lucide-react';
import { SettingsRow } from '../ui/common';

export const OverlayManager: React.FC = () => {
  const { activeOverlay, openOverlay, closeOverlay } = useApp();

  return (
    <AnimatePresence>
      {activeOverlay === 'backup' && (
        <SettingsOverlay key="backup" title="Backup & Export" onClose={closeOverlay}>
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Export Options</p>
              <div className="space-y-2">
                <button onClick={() => alert('Data exported to JSON')} className="w-full text-left p-4 bg-white rounded-xl shadow-sm font-black text-xs uppercase tracking-tight flex items-center justify-between">
                  <span>Export to JSON</span>
                  <Download size={16} />
                </button>
                <button onClick={() => alert('Data exported to CSV')} className="w-full text-left p-4 bg-white rounded-xl shadow-sm font-black text-xs uppercase tracking-tight flex items-center justify-between">
                  <span>Export to CSV</span>
                  <Download size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
              <p className="text-xs font-black text-yellow-600 uppercase tracking-[0.2em] mb-2">Cloud Sync</p>
              <p className="text-[10px] font-bold text-yellow-900/60 leading-relaxed">Automatic cloud backup is currently disabled. Please export manually to prevent data loss.</p>
            </div>
          </div>
        </SettingsOverlay>
      )}

      {activeOverlay === 'theme' && (
        <SettingsOverlay key="theme" title="Appearance" onClose={closeOverlay}>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Color Mode</p>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-6 rounded-2xl bg-[#333333] text-white flex flex-col items-center gap-2 border-4 border-[#FBC02D]">
                  <span className="font-black text-[10px] uppercase tracking-widest">Dark Slate</span>
                </button>
                <button className="p-6 rounded-2xl bg-white text-gray-300 flex flex-col items-center gap-2 border-2 border-gray-100 opacity-50">
                  <span className="font-black text-[10px] uppercase tracking-widest">Light Paper</span>
                </button>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center italic">More themes coming in v3.0</p>
            </div>
          </div>
        </SettingsOverlay>
      )}

      {activeOverlay === 'trash' && <TrashBinOverlay key="trash" onClose={closeOverlay} />}

      {activeOverlay === 'archive' && <ArchiveOverlay key="archive" onClose={closeOverlay} />}

      {activeOverlay === 'tags' && <TagsOverlay key="tags" onClose={closeOverlay} />}

      {activeOverlay === 'settings' && (
        <SettingsOverlay key="settings" title="Settings" onClose={closeOverlay}>
           <div className="divide-y divide-gray-100">
              <SettingsRow label="Journal & Note Tags" value="Manage" isAction icon={<Tag size={18} />} onClick={() => openOverlay('tags')} />
              <SettingsRow label="App Debug Logs" value="Manage" isAction icon={<Terminal size={18} />} onClick={() => openOverlay('logs')} />
              <SettingsRow label="Notifications" value="Enabled" />
              <SettingsRow label="App Version" value="v2.5.1" />
              <SettingsRow label="Language" value="English" />
              <SettingsRow label="First Day of Week" value="Monday" />
              <SettingsRow label="Clear Cache" value="Action Required" isAction />
           </div>
        </SettingsOverlay>
      )}
      {activeOverlay === 'logs' && <LogsOverlay key="logs" onClose={closeOverlay} />}

    </AnimatePresence>
  );
};
