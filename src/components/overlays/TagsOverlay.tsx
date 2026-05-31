import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Tag, Book, StickyNote } from 'lucide-react';
import { useApp } from '../../AppContext';
import { tagAdd, tagDelete } from '../../lib/db';
import { SettingsOverlay } from './SettingsOverlay';

export const TagsOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { journalTags, noteTags, refreshTags } = useApp();
  const [activeTab, setActiveTab] = useState<'journal' | 'note'>('journal');
  const [newTagName, setNewTagName] = useState('');

  const currentTags = activeTab === 'journal' ? journalTags : noteTags;

  const handleAdd = async () => {
    if (!newTagName.trim()) return;
    await tagAdd(activeTab, newTagName.trim());
    setNewTagName('');
    refreshTags();
  };

  const handleDelete = async (id: number) => {
    await tagDelete(id);
    refreshTags();
  };

  return (
    <SettingsOverlay title="Manage Tags" onClose={onClose}>
      <div className="flex flex-col h-full space-y-6">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
           <button 
             onClick={() => setActiveTab('journal')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'journal' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
           >
             <Book size={14} />
             Journal
           </button>
           <button 
             onClick={() => setActiveTab('note')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'note' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
           >
             <StickyNote size={14} />
             Notes
           </button>
        </div>

        <div className="flex gap-2">
           <input 
             className="flex-1 bg-gray-50 border border-black/5 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
             placeholder={`Add new ${activeTab} tag...`}
             value={newTagName}
             onChange={e => setNewTagName(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && handleAdd()}
           />
           <button 
             onClick={handleAdd}
             className="bg-black text-white w-12 h-12 flex items-center justify-center rounded-xl active:scale-95 transition-transform"
           >
             <Plus size={20} />
           </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
           {currentTags.length === 0 ? (
             <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <Tag size={24} className="text-gray-300" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No {activeTab} tags yet</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-2">
                {currentTags.map(tag => (
                   <motion.div 
                     layout
                     key={tag.id}
                     className="flex items-center justify-between p-4 bg-white rounded-2xl border border-black/5 shadow-sm group"
                   >
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-black/10" />
                         <span className="text-xs font-black uppercase tracking-tight text-gray-800">{tag.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDelete(tag.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                   </motion.div>
                ))}
             </div>
           )}
        </div>

        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100/50">
           <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] leading-relaxed">
             These tags will be available for selection when creating or editing your {activeTab === 'journal' ? 'journals' : 'notes & checklists'}.
           </p>
        </div>
      </div>
    </SettingsOverlay>
  );
};
