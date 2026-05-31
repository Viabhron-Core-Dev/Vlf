import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, List, Type, MoreVertical, Archive, Trash2, StickyNote, ChevronDown, Check, X, Share2, Palette, Bell, MoreHorizontal, Maximize2, MoveVertical } from 'lucide-react';
import { Note, NoteType } from '../types';
import { notesGetAll, notesSave, notesDelete, dbPut, dbGet } from '../lib/db';
import { NOTE_COLORS } from '../constants';
import NoteEditor from './NoteEditor';
import { format, formatDistanceToNow } from 'date-fns';

import { useApp } from '../AppContext';

interface NotesGridProps {}

const NotesGrid: React.FC<NotesGridProps> = () => {
  const { triggerAdd, sortType, isArchive: showArchive } = useApp();
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeNoteMenu, setActiveNoteMenu] = useState<Note | null>(null);
  
  // Selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      // NOTE: We do NOT setEditingNote(null) here anymore.
      // NoteEditor.tsx manages its own history layer and will call onClose -> setEditingNote(null)
      setShowAddMenu(false);
      setIsSelectMode(false);
      setShowColorPicker(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleAddMenu = (open: boolean) => {
    if (open) {
      if (window.location.hash !== '#note-add') {
        window.history.pushState({ noteAddMenu: true }, '', '#note-add');
      }
      setShowAddMenu(true);
    } else {
      if (showAddMenu) {
        setShowAddMenu(false);
        if (window.location.hash === '#note-add') {
          window.history.back();
        }
      }
    }
  };

  const toggleSelectMode = (open: boolean) => {
    if (open) {
      if (window.location.hash !== '#note-select') {
        window.history.pushState({ noteSelect: true }, '', '#note-select');
      }
      setIsSelectMode(true);
    } else {
      if (isSelectMode) {
        setIsSelectMode(false);
        setSelectedIds(new Set());
        if (window.location.hash === '#note-select') {
          window.history.back();
        }
      }
    }
  };

  const handleLongPress = (id: number) => {
    if (!isSelectMode) {
      toggleSelectMode(true);
      setSelectedIds(new Set([id]));
    }
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      if (newSelected.size === 0) {
        toggleSelectMode(false);
      }
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === notes.length) {
      setSelectedIds(new Set());
      toggleSelectMode(false);
    } else {
      setSelectedIds(new Set(notes.map(n => n.id!)));
    }
  };

  const fetchNotes = async () => {
    let data = await notesGetAll();
    
    // Support archive view
    if (showArchive) {
      data = data.filter(n => n.archived);
    } else {
      data = data.filter(n => !n.archived);
    }
    
    // Sort
    if (sortType === 'modified') {
      data.sort((a, b) => b.modifiedAt - a.modifiedAt);
    } else if (sortType === 'created') {
      data.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortType === 'alphabetical') {
      data.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortType === 'color') {
      const colorOrder = NOTE_COLORS.map(c => c.name);
      data.sort((a, b) => colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color));
    }
    
    setNotes(data);
  };

  useEffect(() => {
    fetchNotes();
  }, [sortType, showArchive]);

  const toggleColorPicker = (open: boolean) => {
    if (open) {
      if (window.location.hash !== '#note-color') {
        window.history.pushState({ noteColor: true }, '', '#note-color');
      }
      setShowColorPicker(true);
    } else {
      if (showColorPicker) {
        setShowColorPicker(false);
        if (window.location.hash === '#note-color') {
          window.history.back();
        }
      }
    }
  };

  const openEditor = (note: Note) => {
    setEditingNote(note);
  };

  const closeEditor = () => {
    if (editingNote) {
      setEditingNote(null);
      fetchNotes();
    }
  };

  useEffect(() => {
    if (triggerAdd > 0) {
      toggleAddMenu(true);
    }
  }, [triggerAdd]);

  const handleBulkAction = async (action: string, value?: any) => {
    if (selectedIds.size === 0) return;
    
    if (action === 'delete') {
      for (const id of Array.from(selectedIds)) {
        await notesDelete(id as number);
      }
    } else if (action === 'color') {
      for (const id of Array.from(selectedIds)) {
        const note = notes.find(n => n.id === id);
        if (note) {
          await notesSave({ ...note, color: value, modifiedAt: Date.now() });
        }
      }
    } else if (action === 'archive') {
      for (const id of Array.from(selectedIds)) {
        const note = notes.find(n => n.id === id);
        if (note) {
          // If already archived, unarchive it
          await notesSave({ ...note, archived: !showArchive, modifiedAt: Date.now() });
        }
      }
    }

    toggleSelectMode(false);
    fetchNotes();
  };

  const filteredNotes = notes;

  const handleAddNote = (type: NoteType) => {
    const newNote: Note = {
      title: '',
      body: '',
      items: [],
      type,
      color: 'yellow',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      archived: false,
      deleted: false,
      tags: []
    };
    toggleAddMenu(false);
    setTimeout(() => {
      openEditor(newNote);
    }, 100);
  };

  const handleSave = async (note: Note) => {
    await notesSave(note);
    fetchNotes();
  };

  return (
    <div className="flex flex-col h-full bg-[#E5E5E5] touch-pan-y overflow-hidden">
      {/* Selection Top Bar */}
      {createPortal(
        <AnimatePresence>
          {isSelectMode && (
            <motion.div 
              initial={{ y: -60 }}
              animate={{ y: 0 }}
              exit={{ y: -60 }}
              className="fixed top-0 left-0 right-0 h-16 bg-[#CCCCCC] shadow-md z-[99999] flex items-center px-2 gap-4 border-b border-black/10"
            >
              <button onClick={() => toggleSelectMode(false)} className="p-3 active:bg-black/10">
                <X size={32} className="text-[#333333]" strokeWidth={3} />
              </button>
              <span className="font-black text-2xl flex-1 text-[#333333] ml-2">
                 {selectedIds.size}/{notes.length}
              </span>
              <button onClick={selectAll} className="p-3 active:bg-black/10">
                <div className="w-8 h-8 border-4 border-[#999999] border-dashed rounded-[2px]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Notes List */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden touch-pan-y divide-y divide-black/5 pt-2 pb-24"
        onTouchStart={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
      >
        {filteredNotes.map((note) => {
          const colorObj = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
          const isSelected = selectedIds.has(note.id!);
          
            return (
              <LongPressItem
                key={note.id}
                onLongPress={() => handleLongPress(note.id!)}
                onClick={() => isSelectMode ? toggleSelection(note.id!) : openEditor(note)}
              >
                <div
                  className={`relative mx-0.5 my-0 px-5 py-4 flex justify-between items-center transition-all min-h-[5.5rem] border-b border-black/5 ${isSelected ? 'brightness-[0.8] contrast-[1.1]' : ''}`}
                  style={{ backgroundColor: colorObj.bg }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: colorObj.border }} />
                  
                  <div className="flex-1 min-w-0 pr-4 ml-2">
                    <h3 className="font-black text-[1.4rem] text-black leading-tight truncate">
                      {note.title || (note.type === 'checklist' ? `[${format(note.createdAt, 'yyyy-MM-dd')}]` : (note.body?.split('\n').find(l => l.trim() !== '') || `[${format(note.createdAt, 'yyyy-MM-dd')}]`))}
                    </h3>
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-3">
                    {note.type === 'checklist' && (
                       <Check size={20} className="text-black/60" strokeWidth={3} />
                    )}
                    <span className="text-[1rem] text-black/60 font-medium">
                      {format(note.modifiedAt, 'dd MMM')}
                    </span>
                  </div>
                </div>
              </LongPressItem>
            );
        })}
      </div>

      {filteredNotes.length === 0 && (
        <div className="flex flex-col items-center justify-center p-20 text-gray-400">
          <StickyNote size={64} className="mb-4 opacity-5" />
          <p className="text-gray-500 font-medium">No notes available</p>
        </div>
      )}

      {/* Floating Action Bars */}
      {createPortal(
        <AnimatePresence>
          {isSelectMode && (
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="fixed bottom-0 left-0 right-0 h-20 bg-[#EEEEEE] border-t border-black/10 z-[99999] flex items-center justify-around px-2"
            >
              <button onClick={() => handleBulkAction('archive')} className="flex flex-col items-center justify-center h-full flex-1 active:bg-black/5 gap-0.5">
                <Archive size={28} className="text-[#333333]" strokeWidth={2.5} />
                <span className="text-[13px] font-black uppercase text-[#333333]">{showArchive ? 'Restore' : 'Archive'}</span>
              </button>
              <button onClick={() => handleBulkAction('delete')} className="flex flex-col items-center justify-center h-full flex-1 active:bg-black/5 gap-0.5">
                <Trash2 size={28} className="text-[#333333]" strokeWidth={2.5} />
                <span className="text-[13px] font-black uppercase text-[#333333]">Delete</span>
              </button>
              <button onClick={() => toggleColorPicker(!showColorPicker)} className="flex flex-col items-center justify-center h-full flex-1 active:bg-black/5 gap-0.5">
                <Palette size={28} className="text-[#333333]" strokeWidth={2.5} />
                <span className="text-[13px] font-black uppercase text-[#333333]">Color</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Add Note Type Dialog */}
      {createPortal(
        <AnimatePresence>
          {showAddMenu && (
            <div className="fixed inset-0 z-[200000] flex items-center justify-center p-6 bg-black/40">
              <div className="absolute inset-0" onClick={() => toggleAddMenu(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white w-full max-w-[280px] shadow-2xl rounded-sm overflow-hidden relative z-50"
              >
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-black mb-6">Add</h3>
                  <div className="space-y-4">
                    <button 
                      onClick={() => handleAddNote('text')}
                      className="w-full flex items-center gap-4 active:bg-gray-100 p-1 rounded-sm"
                    >
                      <div className="w-10 h-10 bg-gray-600 rounded-sm flex items-center justify-center">
                        <List size={24} className="text-white" strokeWidth={3} />
                      </div>
                      <span className="text-2xl font-bold text-black">Text</span>
                    </button>
                    <button 
                      onClick={() => handleAddNote('checklist')}
                      className="w-full flex items-center gap-4 active:bg-gray-100 p-1 rounded-sm"
                    >
                      <div className="w-10 h-10 bg-gray-600 rounded-sm flex items-center justify-center p-1.5">
                        <div className="w-full h-full border-2 border-white rounded-sm flex items-center justify-center">
                          <Check size={16} className="text-white" strokeWidth={4} />
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-black">Checklist</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Bulk Color Picker */}
      {createPortal(
        <AnimatePresence>
          {showColorPicker && (
            <motion.div 
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 z-[100000] p-4 rounded-t-2xl shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold">Select Color</span>
                <button onClick={() => toggleColorPicker(false)}><X size={20}/></button>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {NOTE_COLORS.map(c => (
                  <button 
                    key={c.name} 
                    onClick={() => { handleBulkAction('color', c.name); setShowColorPicker(false); }}
                    className="w-full aspect-square rounded-full border-2 border-black/5" 
                    style={{ backgroundColor: c.bg }} 
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Note Editor Overlay */}
      <AnimatePresence mode="wait">
        {editingNote && (
          <NoteEditor 
            note={editingNote} 
            onSave={handleSave} 
            onClose={closeEditor} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuAction: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, isDamage?: boolean }> = ({ icon, label, onClick, isDamage }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-gray-50 transition-colors ${isDamage ? 'text-red-500' : 'text-[#333333]'}`}>
     <div className={`${isDamage ? 'text-red-500/40' : 'text-black/40'}`}>{icon}</div>
     <span className="font-bold text-sm uppercase tracking-tight">{label}</span>
  </button>
);

// Helper for long press detection
const LongPressItem: React.FC<{ children: React.ReactNode, onLongPress: () => void, onClick: () => void }> = ({ children, onLongPress, onClick }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const isMoved = useRef(false);

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
      className="select-none touch-pan-y"
    >
      {children}
    </div>
  );
};

export default NotesGrid;
