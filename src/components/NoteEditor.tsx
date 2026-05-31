import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { 
  ArrowLeft, Check, Palette, MoreVertical, Plus, X, List, Type, Share2, Tag, 
  Calendar, Image as ImageIcon, RotateCcw, RotateCw, Paperclip, 
  ChevronUp, ChevronDown, Edit2, Search, Copy, Trash2, Lock, Send, Bell, Archive,
  Grid, PenTool, Columns, GripHorizontal, GripVertical
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { Note, ChecklistItem } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { useApp } from '../AppContext';

const COLOR_PALETTE = [
  { name: 'red', bg: '#FF8A80', border: '#D32F2F' },
  { name: 'orange', bg: '#FFD180', border: '#F57C00' },
  { name: 'yellow', bg: '#FFFF8D', border: '#FBC02D' },
  { name: 'green', bg: '#CCFF90', border: '#388E3C' },
  { name: 'blue', bg: '#80D8FF', border: '#1976D2' },
  { name: 'purple', bg: '#B388FF', border: '#7B1FA2' },
  { name: 'black', bg: '#212121', border: '#000000', text: 'white' },
  { name: 'gray', bg: '#9E9E9E', border: '#616161' },
  { name: 'white', bg: '#FFFFFF', border: '#E0E0E0' },
];

interface NoteEditorProps {
  note: Note;
  onSave: (note: Note) => void;
  onClose: () => void;
}

const BlockTextArea: React.FC<{ 
  value: string, isEditing: boolean, 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void,
  onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void,
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void,
  onDoubleClick?: (e: React.MouseEvent<HTMLTextAreaElement>) => void,
  isLast?: boolean,
  shouldFocus?: boolean,
  focusTrigger?: number
}> = ({ value, isEditing, onChange, onSelect, onKeyDown, onDoubleClick, isLast, shouldFocus, focusTrigger }) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (!ref.current) return;
    ref.current.style.height = '48px'; 
    const h = ref.current.scrollHeight;
    const lines = Math.max(1, Math.ceil(h / 48));
    ref.current.style.height = `${lines * 48}px`;
  };

  useEffect(() => { adjustHeight(); }, [value]);

  useEffect(() => {
    if (shouldFocus && ref.current && document.activeElement !== ref.current) {
      ref.current.focus();
    }
  }, [shouldFocus, focusTrigger]);

  return <textarea
    ref={ref}
    readOnly={!isEditing}
    value={value}
    onChange={e => { onChange(e); adjustHeight(); }}
    onSelect={onSelect}
    onClick={(e) => {
      e.stopPropagation();
      onSelect(e);
      if (!isEditing && e.detail === 2 && onDoubleClick) {
        onDoubleClick(e);
      }
    }}
    onDoubleClick={onDoubleClick}
    onKeyDown={onKeyDown}
    className={`w-full py-0 px-4 bg-transparent border-none outline-none resize-none text-2xl font-medium leading-[48px] text-black ${!isEditing ? 'cursor-default caret-transparent' : ''}`}
    style={{ overflow: 'hidden', minHeight: '48px' }}
    placeholder={isEditing && isLast ? "Type here..." : ""}
  />
};

const AttachmentBlock: React.FC<{ 
  attachment: any, 
  isEditing: boolean, 
  update: (data: any) => void, 
  remove: () => void 
}> = ({ attachment, isEditing, update, remove }) => {
  if (!attachment) return null;

  // -- Resizing Logic for Height and Width --
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ startX: number, startY: number, startW: number, startH: number } | null>(null);
  const [overrideHeight, setOverrideHeight] = useState<number | null>(null);
  const [overrideWidth, setOverrideWidth] = useState<number | null>(null);

  const overrideHeightRef = useRef(overrideHeight);
  overrideHeightRef.current = overrideHeight;
  const overrideWidthRef = useRef(overrideWidth);
  overrideWidthRef.current = overrideWidth;

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const h = attachment.height || (attachment.type === 'kanban' ? 384 : 288);
    const rect = containerRef.current?.getBoundingClientRect();
    const w = attachment.width || (rect ? rect.width : 300);
    setDragState({ startX: e.clientX, startY: e.clientY, startW: parseFloat(w as string), startH: h });
    setOverrideHeight(h);
    setOverrideWidth(parseFloat(w as string));
  };

  useEffect(() => {
    if (!dragState) return;
    let frame: number;
    const onMove = (e: PointerEvent) => {
      frame = requestAnimationFrame(() => {
        const diffX = e.clientX - dragState.startX;
        const diffY = e.clientY - dragState.startY;
        setOverrideWidth(Math.max(200, dragState.startW + diffX));
        setOverrideHeight(Math.max(96, dragState.startH + diffY));
      });
    };
    const onUp = () => {
      cancelAnimationFrame(frame);
      const updates: any = {};
      if (overrideHeightRef.current !== null) {
        updates.height = Math.max(96, Math.round(overrideHeightRef.current / 48) * 48);
      }
      if (overrideWidthRef.current !== null) {
        updates.width = overrideWidthRef.current;
      }
      if (Object.keys(updates).length > 0) {
        update(updates);
      }
      setOverrideHeight(null);
      setOverrideWidth(null);
      setDragState(null);
    };
    
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragState, update]);

  // -- Table Column Logic --
  const [activeColMenu, setActiveColMenu] = useState<number | null>(null);
  
  if (attachment.type === 'table') {
    const rows = attachment.rows || 3;
    const cols = attachment.cols || 3;
    const colWidths = attachment.colWidths || Array(cols).fill(`${100 / cols}%`);
    const tableData = attachment.tableData || Array(rows).fill(Array(cols).fill(''));
    const headers = attachment.headers || Array(cols).fill('Header');

    // Height calculation based strictly on content
    const height = (rows + 1) * 48; 
    const customWidth = overrideWidth !== null ? `${overrideWidth}px` : (attachment.width ? `${attachment.width}px` : '100%');

    return (
      <div 
        ref={containerRef}
        className="attachment-block relative px-4" 
        style={{ height: `${height}px`, width: customWidth, minWidth: '200px', maxWidth: '100%' }}
      >
        {isEditing && (
           <div className="absolute top-1 right-5 flex gap-2 z-10">
             <button onClick={remove} className="bg-red-500 text-white p-1 rounded-sm shadow-lg"><X size={16}/></button>
           </div>
        )}
        <div className="w-full h-full border-2 border-black/80 rounded-sm overflow-hidden flex flex-col bg-white/90 backdrop-blur-sm shadow-sm relative z-0">
          {/* Header */}
          <div className="flex bg-black/85 text-white h-[48px] shrink-0">
             {Array.from({length: cols}).map((_, i) => (
                <div key={i} className="relative border-r border-white/20 flex items-center font-bold" style={{ width: colWidths[i] || `${100 / cols}%` }}>
                  {isEditing ? (
                    <input 
                      className="w-full h-full bg-transparent outline-none px-2 text-center" 
                      placeholder="Header" 
                      value={headers[i] || ''}
                      onChange={e => {
                        const newH = [...headers];
                        newH[i] = e.target.value;
                        update({ headers: newH });
                      }}
                      onContextMenu={e => {
                        e.preventDefault();
                        setActiveColMenu(activeColMenu === i ? null : i);
                      }}
                    />
                  ) : (
                    <div className="px-2 w-full text-center overflow-hidden text-ellipsis whitespace-nowrap">{headers[i] || ''}</div>
                  )}
                  {activeColMenu === i && isEditing && (
                    <div className="absolute top-12 left-0 bg-white text-black p-3 rounded-lg shadow-xl border border-black/10 z-20 flex flex-col gap-3 min-w-[140px]">
                       <span className="text-sm font-bold text-center">Column Width</span>
                       <input type="range" min={10} max={100} value={parseInt(colWidths[i]) || 50} onChange={e => {
                           const arr = [...colWidths]; arr[i] = `${e.target.value}%`; update({ colWidths: arr });
                       }}/>
                       <button onClick={() => {
                          if (cols <= 1) return;
                          const newC = [...colWidths]; newC.splice(i, 1);
                          const newH = [...headers]; newH.splice(i, 1);
                          const newD = tableData.map((r: any) => { const nr = [...r]; nr.splice(i, 1); return nr; });
                          update({ cols: cols - 1, colWidths: newC, headers: newH, tableData: newD });
                       }} className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold p-2 rounded">Delete Column</button>
                    </div>
                  )}
                </div>
             ))}
          </div>
          {/* Body */}
          <div className="flex-1 flex flex-col">
             {Array.from({length: rows}).map((_, r) => (
               <div key={r} className="flex-1 flex border-t border-black/20 h-[48px] shrink-0">
                 {Array.from({length: cols}).map((_, c) => (
                   <div key={c} className="border-r border-black/20 flex items-center relative" style={{ width: colWidths[c] || `${100 / cols}%` }}>
                     {isEditing ? (
                       <input 
                         className="w-full h-full bg-transparent outline-none px-2 text-center" 
                         value={tableData[r]?.[c] || ''}
                         onChange={e => {
                           const newD = tableData.map((rowArr: any, ri: number) => ri === r ? [...rowArr] : rowArr);
                           if (!newD[r]) newD[r] = Array(cols).fill('');
                           newD[r][c] = e.target.value;
                           update({ tableData: newD });
                         }}
                       />
                     ) : (
                       <span className="px-2 w-full text-center overflow-hidden text-ellipsis whitespace-nowrap">{tableData[r]?.[c] || ''}</span>
                     )}
                   </div>
                 ))}
               </div>
             ))}
          </div>
        </div>

        {/* Inline Add buttons */}
        {isEditing && (
          <>
            <button onClick={() => {
               const newD = [...tableData, Array(cols).fill('')];
               update({ rows: rows + 1, tableData: newD });
            }} className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-teal-500 rounded-full text-white shadow-lg flex items-center justify-center z-10 active:scale-95"><Plus size={18} strokeWidth={3}/></button>
            <button onClick={() => {
               const newC = [...colWidths, `${100 / (cols+1)}%`];
               const newH = [...headers, 'Header'];
               const newD = tableData.map((rowArr: any) => [...rowArr, '']);
               update({ cols: cols + 1, colWidths: newC, headers: newH, tableData: newD });
            }} className="absolute top-1/2 right-0 w-8 h-8 bg-teal-500 rounded-full text-white shadow-lg flex items-center justify-center z-10 active:scale-95"><Plus size={18} strokeWidth={3}/></button>
            {rows > 1 && (
               <button onClick={() => {
                 const newD = tableData.slice(0, -1);
                 update({ rows: rows - 1, tableData: newD });
               }} className="absolute bottom-0 mb-1 left-2 text-xs text-red-500 bg-white/80 rounded px-1 font-bold z-10">Remove Row</button>
            )}
            
            <div 
               className="absolute bottom-0 right-4 w-10 h-10 cursor-ew-resize justify-center items-center flex z-20 bg-black/10 hover:bg-black/20 rounded-tl-lg rounded-br-lg shadow-sm"
               style={{ touchAction: 'none' }}
               onPointerDown={startDrag}
            >
               <div className="w-3 h-3 border-r-2 border-b-2 border-black/50 opacity-0" />
               <GripVertical size={20} className="text-black/50 absolute" />
            </div>
          </>
        )}
      </div>
    );
  }

  // --- Image, Drawing, Kanban Height Resizer ---
  let content = null;
  const customHeight = overrideHeight !== null ? overrideHeight : (attachment.height || (attachment.type === 'kanban' ? 384 : 288));

  if (attachment.type === 'image') {
    content = (
      <div 
        className="w-full h-full bg-zinc-200 border-2 border-dashed border-zinc-400 rounded-lg flex items-center justify-center text-zinc-500 overflow-hidden relative cursor-pointer hover:bg-zinc-300 transition-colors"
        onClick={() => {
          if (isEditing) {
             const input = document.createElement('input');
             input.type = 'file';
             input.accept = 'image/*';
             input.onchange = (e: any) => {
               const file = e.target.files[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onload = (re) => {
                   update({ data: re.target?.result });
                 };
                 reader.readAsDataURL(file);
               }
             };
             input.click();
          }
        }}
      >
        {attachment.data ? (
           <img src={attachment.data} alt="" className="w-full h-full object-cover pointer-events-none" />
        ) : (
           <div className="flex flex-col items-center pointer-events-none">
              <ImageIcon size={48} className="opacity-50 mb-2" />
              <span className="font-bold opacity-50">Upload Image / Photo</span>
           </div>
        )}
      </div>
    );
  } else if (attachment.type === 'drawing') {
    content = (
      <div className="w-full h-full bg-[#FAFAFA] border-2 border-black/20 rounded-lg flex items-center justify-center text-black/30 overflow-hidden relative">
        <div className="flex flex-col items-center pointer-events-none">
          <PenTool size={48} className="opacity-50 mb-2" />
          <span className="font-bold opacity-50">Doodle Canvas Placeholder</span>
        </div>
      </div>
    );
  } else if (attachment.type === 'kanban') {
    content = (
      <div className="w-full h-full flex gap-4 p-2 bg-black/5 rounded-xl pr-12 overflow-x-auto relative z-0">
        {attachment.kanbanColumns?.map((col: any) => (
          <div key={col.id} className="w-[250px] shrink-0 bg-white rounded-lg shadow-sm border border-black/10 flex flex-col overflow-hidden">
            <div className="p-3 font-bold border-b border-black/5 text-lg">{col.name}</div>
            <div className="flex-1 p-2 overflow-y-auto"></div>
            {isEditing && <button className="p-2 text-center text-black/40 font-bold active:bg-black/5 rounded-b-lg border-t border-black/5">+ Card</button>}
          </div>
        ))}
      </div>
    );
  }
  
  if (content) {
    const customWidth = overrideWidth !== null ? `${overrideWidth}px` : (attachment.width ? `${attachment.width}px` : '100%');
    
    return (
      <div 
        ref={containerRef}
        className="attachment-block relative px-4" 
        style={{ height: `${customHeight}px`, width: customWidth, minWidth: '200px', maxWidth: '100%' }}
      >
         {isEditing && (
           <button onClick={remove} className="absolute top-2 right-6 bg-red-500 text-white p-1 rounded-full z-10 shadow-lg"><X size={20}/></button>
         )}
         {content}
         
         {isEditing && (
           <div 
             className="absolute bottom-0 right-4 w-10 h-10 cursor-nwse-resize justify-center items-center flex z-20 bg-black/10 hover:bg-black/20 rounded-tl-lg rounded-br-lg shadow-sm"
             style={{ touchAction: 'none' }}
             onPointerDown={startDrag}
           >
             <div className="w-3 h-3 border-r-2 border-b-2 border-black/50" />
           </div>
         )}
      </div>
    );
  }

  return null;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onClose }) => {
  const { noteTags } = useApp();
  const [editedNote, setEditedNote] = useState<Note>(() => {
    // Ensure all items have IDs for reordering
    const itemsWithIds = note.items?.map(item => ({
      ...item,
      id: item.id || Math.random().toString(36).substr(2, 9)
    }));
    return { ...note, items: itemsWithIds, tags: note.tags || [] };
  });
  const [isEditing, setIsEditing] = useState(note.id === undefined);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [activeItemMenu, setActiveItemMenu] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog state for adding/editing checklist items
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [dialogValue, setDialogValue] = useState('');
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  
  // Attachments state
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ index: number, selectionStart: number, focusTrigger?: number }>({ index: 0, selectionStart: 0, focusTrigger: 0 });

  // History for Undo/Redo
  const [history, setHistory] = useState<Note[]>([{ ...note }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dialogInputRef = useRef<HTMLTextAreaElement>(null);

  const savedRef = useRef(false);
  const shouldDiscardRef = useRef(false);
  const noteRef = useRef(editedNote);
  const isNewNote = useRef(note.id === undefined);

  const blocks = React.useMemo(() => {
    const body = editedNote.body || '';
    if (!body) return [{ type: 'text', content: '', key: 0 }];
    const parts = body.split(/(\{\{ATTACHMENT:[^}]+\}\})/g);
    return parts.map((part, i) => {
       const match = part.match(/\{\{ATTACHMENT:([^}]+)\}\}/);
       if (match) return { type: 'attachment', id: match[1], key: i };
       return { type: 'text', content: part, key: i };
    });
  }, [editedNote.body]);

  const addAttachment = (type: 'image' | 'drawing' | 'table' | 'kanban') => {
    const attId = Math.random().toString(36).substr(2, 9);
    const newAttachment: any = { id: attId, type };
    if (type === 'table') {
       newAttachment.rows = 3;
       newAttachment.cols = 3;
       newAttachment.tableData = Array(3).fill(Array(3).fill(''));
       newAttachment.headers = Array(3).fill('Header');
    } else if (type === 'kanban') {
       newAttachment.kanbanColumns = [
         { id: '1', name: 'To Do', cards: [] },
         { id: '2', name: 'In Progress', cards: [] },
         { id: '3', name: 'Done', cards: [] }
       ];
    }
    
    const newAttachments = [...(editedNote.attachments || []), newAttachment];
    
    const currentText = blocks[cursorPos.index]?.type === 'text' ? blocks[cursorPos.index].content : '';
    const before = currentText.slice(0, cursorPos.selectionStart);
    const after = currentText.slice(cursorPos.selectionStart);
    
    const newBlocks = [...blocks];
    newBlocks.splice(cursorPos.index, 1, 
      { type: 'text', content: before, key: -1 },
      { type: 'attachment', id: attId, key: -2 },
      { type: 'text', content: after, key: -3 }
    );
    
    const newBody = newBlocks.map(b => b.type === 'text' ? b.content : `{{ATTACHMENT:${b.id}}}`).join('');
    
    handleStateChange({ ...editedNote, body: newBody, attachments: newAttachments });
    setShowAttachmentMenu(false);
  };

  const handleTextChange = (keyIndex: number, newContent: string) => {
    const newBlocks = [...blocks];
    newBlocks[keyIndex] = { ...newBlocks[keyIndex], content: newContent };
    const newBody = newBlocks.map(b => b.type === 'text' ? b.content : `{{ATTACHMENT:${b.id}}}`).join('');
    handleStateChange({ ...editedNote, body: newBody });
  };

  const removeAttachment = (index: number) => {
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    const newBody = newBlocks.map(b => b.type === 'text' ? b.content : `{{ATTACHMENT:${b.id}}}`).join('');
    handleStateChange({ ...editedNote, body: newBody });
  };

  const updateAttachment = (id: string, updates: any) => {
    if (!editedNote.attachments) return;
    const newAttachments = editedNote.attachments.map(att => att.id === id ? { ...att, ...updates } : att);
    handleStateChange({ ...editedNote, attachments: newAttachments });
  };

  const isNoteEmpty = (note: Note) => {
    const isTitleEmpty = !note.title.trim();
    if (note.type === 'text') {
      return isTitleEmpty && !(note.body || '').trim();
    } else {
      return isTitleEmpty && (!note.items || note.items.length === 0);
    }
  };

  useEffect(() => {
    noteRef.current = editedNote;
  }, [editedNote]);

  const isEditingRef = useRef(isEditing);
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    if (isNewNote.current) {
      window.history.pushState({ overlay: 'note_edit' }, '', '#note-edit');
    } else {
      window.history.pushState({ overlay: 'note_view' }, '', '#note');
    }

    const handlePopState = () => {
      if (shouldDiscardRef.current) {
        onClose();
        return;
      }

      const hash = window.location.hash;

      if (hash === '#note') {
        setIsEditing(false);
        if (!isNoteEmpty(noteRef.current)) {
          onSave(noteRef.current);
        }
      } else if (hash === '#note-edit') {
        setIsEditing(true);
      } else {
        if (isEditingRef.current) {
          if (!isNoteEmpty(noteRef.current)) {
            onSave(noteRef.current);
          }
        }
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const enterEditMode = () => {
    if (!isEditing) {
      setIsEditing(true);
      window.history.pushState({ overlay: 'note_edit' }, '', '#note-edit');
    }
  };

  const exitEditMode = () => {
    if (isEditing) {
      const empty = isNoteEmpty(noteRef.current);
      if (!empty) {
        onSave(noteRef.current);
      }
      const hash = window.location.hash;
      if (hash === '#note-edit') {
        if (isNewNote.current) {
          if (empty) {
            window.history.back();
            return;
          }
          window.history.replaceState({ overlay: 'note_view' }, '', '#note');
          setIsEditing(false);
        } else {
          window.history.back(); // Triggers popstate
        }
      } else {
        setIsEditing(false);
      }
      isNewNote.current = false;
    }
  };

  const handleCloseAndDiscard = (saveFirst: boolean, noteToSave?: Note) => {
    if (saveFirst && noteToSave) onSave(noteToSave);
    shouldDiscardRef.current = true;
    
    // Safely jump back to the previous tab/state
    const steps = (!isNewNote.current && isEditingRef.current) ? -2 : -1;
    window.history.go(steps);
  };

  useEffect(() => {
    if (isEditing && editedNote.type === 'text') {
      setTimeout(() => bodyRef.current?.focus(), 50);
    }
  }, [isEditing]);

  const colorObj = COLOR_PALETTE.find(c => c.name === editedNote.color) || COLOR_PALETTE[2];

  const handleStateChange = (newNote: Note) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ ...newNote });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setEditedNote(newNote);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setEditedNote({ ...prev });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setEditedNote({ ...next });
    }
  };

  const toggleItem = (index: number) => {
    if (!editedNote.items) return;
    const items = [...editedNote.items];
    items[index].done = !items[index].done;
    const nextNote = { ...editedNote, items, modifiedAt: Date.now() };
    handleStateChange(nextNote);
    if (!isEditing) onSave(nextNote);
  };

  const handleOpenDialog = (mode: 'add' | 'edit', index: number | null = null) => {
    setDialogMode(mode);
    setEditingItemIndex(index);
    setDialogValue(index !== null ? editedNote.items?.[index].text || '' : '');
    setShowItemDialog(true);
    setTimeout(() => dialogInputRef.current?.focus(), 50);
  };

  const confirmItemChange = (shouldClose: boolean) => {
    if (!dialogValue.trim()) {
      if (shouldClose) setShowItemDialog(false);
      return;
    }

    const items = [...(editedNote.items || [])];
    if (dialogMode === 'edit' && editingItemIndex !== null) {
      items[editingItemIndex].text = dialogValue.trim();
    } else {
      items.push({ 
        id: Math.random().toString(36).substr(2, 9),
        text: dialogValue.trim(), 
        done: false 
      });
    }

    handleStateChange({ ...editedNote, items });
    setDialogValue('');
    
    if (shouldClose) {
      setShowItemDialog(false);
      setEditingItemIndex(null);
    } else {
      setDialogMode('add');
      setEditingItemIndex(null);
      // Wait for re-render then focus
      setTimeout(() => dialogInputRef.current?.focus(), 20);
    }
  };

  const removeItem = (index: number) => {
    const items = editedNote.items?.filter((_, i) => i !== index);
    handleStateChange({ ...editedNote, items: items || [] });
    setActiveItemMenu(null);
  };

  const handleReorder = (newItems: ChecklistItem[]) => {
    handleStateChange({ ...editedNote, items: newItems, modifiedAt: Date.now() });
  };

  const handleDoubleClick = (e: React.MouseEvent | React.TouchEvent) => {
    enterEditMode();
  };

  const enterEditModeToLastLine = () => {
    enterEditMode();
    if (editedNote.type === 'text') {
      setTimeout(() => {
        setCursorPos({ index: blocks.length > 0 ? blocks.length - 1 : 0, selectionStart: blocks[blocks.length - 1]?.content?.length || 0 });
      }, 50);
    }
  };

  const editorContent = (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200000] flex flex-col font-sans select-none"
      style={{ backgroundColor: colorObj.bg }}
    >
      {/* Header */}
      <Header 
        isEditing={isEditing}
        onEdit={enterEditMode}
        onEditIcon={enterEditModeToLastLine}
        onDone={exitEditMode}
        onColorPicker={() => setShowColorPicker(true)}
        onShowMenu={() => setShowMoreMenu(true)}
        title={editedNote.title}
        setTitle={(t) => handleStateChange({ ...editedNote, title: t })}
        color={colorObj}
        noteType={editedNote.type}
        body={editedNote.body}
        createdAt={editedNote.createdAt}
      />

      {/* Info Bar */}
      <div className="px-3 h-10 flex justify-between items-center text-xl font-bold text-black/60 border-b border-black/10 shrink-0" style={{ backgroundColor: colorObj.bg }}>
         <span>{isEditing ? 'Editing' : 'Viewing'}</span>
         <span>{format(editedNote.modifiedAt, 'dd/MM/yy h:mm a').toLowerCase()}</span>
      </div>

      {/* Tags Selection Bar */}
      <div className="px-3 py-2 flex flex-wrap gap-1.5 border-b border-black/10 shrink-0 overflow-x-auto no-scrollbar" style={{ backgroundColor: colorObj.bg }}>
         <Tag size={16} className="text-black/30 mt-1" />
         {editedNote.tags.map(tag => (
           <button 
             key={tag}
             onClick={() => isEditing && handleStateChange({ ...editedNote, tags: editedNote.tags.filter(t => t !== tag) })}
             className="px-2 py-1 bg-black/80 text-white rounded-md text-[10px] font-black uppercase tracking-tight flex items-center gap-1"
           >
             {tag}
             {isEditing && <X size={10} />}
           </button>
         ))}
         {isEditing && (
            <div className="flex flex-wrap gap-1">
              {noteTags.filter(t => !editedNote.tags.includes(t.name)).map(tag => (
                <button 
                  key={tag.id}
                  onClick={() => handleStateChange({ ...editedNote, tags: [...editedNote.tags, tag.name] })}
                  className="px-2 py-1 bg-white/40 text-black/60 border border-black/5 rounded-md text-[10px] font-black uppercase tracking-tight"
                >
                  + {tag.name}
                </button>
              ))}
            </div>
         )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" onClick={(e) => { 
        if (e.target === e.currentTarget || (e.target as HTMLElement).tagName?.toLowerCase() === 'div' && !(e.target as HTMLElement).closest('.attachment-block')) {
          if (isEditing && blocks.length > 0 && blocks[blocks.length-1].type === 'text') {
            setCursorPos({ index: blocks.length - 1, selectionStart: blocks[blocks.length-1].content?.length || 0, focusTrigger: Date.now() });
          }
        }
      }}>
        {editedNote.type === 'text' ? (
          <div className="min-h-full flex flex-col pb-32"
               style={{
                 backgroundImage: `repeating-linear-gradient(transparent, transparent 47px, ${colorObj.border}33 47px, ${colorObj.border}33 48px)`,
                 backgroundSize: '100% 48px',
                 backgroundPosition: '0 0px',
                 backgroundAttachment: 'local'
               }}>
            {blocks.map((block, i) => {
               if (block.type === 'text') {
                 return (
                   <BlockTextArea 
                     key={`block-${block.key}`}
                     value={block.content || ''}
                     isEditing={isEditing}
                     isLast={i === blocks.length - 1}
                     shouldFocus={cursorPos.index === i}
                     focusTrigger={cursorPos.index === i ? cursorPos.focusTrigger : undefined}
                     onChange={e => handleTextChange(i, e.target.value)}
                     onSelect={e => setCursorPos({ index: i, selectionStart: e.currentTarget.selectionStart })}
                     onKeyDown={e => {
                        if (e.key === 'Backspace' && e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
                           if (i > 0 && blocks[i-1].type === 'attachment') {
                              e.preventDefault();
                              removeAttachment(i-1);
                           }
                        }
                     }}
                     onDoubleClick={!isEditing ? handleDoubleClick : undefined}
                   />
                 )
               } else {
                 const att = editedNote.attachments?.find((a: any) => a.id === block.id);
                 return (
                   <div key={`att-${block.key}`} className="w-full flex shrink-0">
                     <AttachmentBlock 
                       attachment={att} 
                       isEditing={isEditing} 
                       update={(data: any) => updateAttachment(block.id, data)} 
                       remove={() => removeAttachment(i)} 
                     />
                     {isEditing && (
                       <div 
                         className="flex-1 cursor-text"
                         onPointerDown={(e) => {
                           e.preventDefault(); // prevents blurring the current active element prematurely if possible, though React handles focus.
                           e.stopPropagation();
                           setCursorPos({ index: Math.min(i + 1, blocks.length - 1), selectionStart: 0, focusTrigger: Date.now() });
                         }}
                       />
                     )}
                   </div>
                 )
               }
            })}
          </div>
        ) : (
          <>
            {/* Add Item Top */}
            {isEditing && (
              <button 
                onClick={() => handleOpenDialog('add')} 
                className="w-full flex items-center px-4 h-[64px] gap-6 active:bg-black/10 shrink-0 border-b border-black/10 transition-colors"
              >
                <div className="w-12 h-12 bg-black/80 rounded-full flex items-center justify-center shadow-lg">
                  <Plus size={36} className="text-white" strokeWidth={4} />
                </div>
                <span className="text-[28px] font-black text-black">Add Item</span>
              </button>
            )}

            <Reorder.Group 
              axis="y" 
              values={editedNote.items || []} 
              onReorder={handleReorder}
              className="flex flex-col"
            >
              {editedNote.items?.map((item, idx) => (
                <ReorderItemWrapper
                  key={item.id}
                  item={item}
                  idx={idx}
                  isEditing={isEditing}
                  toggleItem={() => toggleItem(idx)}
                  removeItem={() => removeItem(idx)}
                  handleOpenDialog={() => handleOpenDialog('edit', idx)}
                  activeItemMenu={activeItemMenu}
                  setActiveItemMenu={setActiveItemMenu}
                />
              ))}
            </Reorder.Group>

            {/* Add Item Bottom */}
            {isEditing && (
              <button 
                onClick={() => handleOpenDialog('add')} 
                className="w-full flex items-center px-4 h-[60px] gap-6 active:bg-black/10 shrink-0 border-t border-black/10 transition-colors"
              >
                <div className="w-12 h-12 bg-black/80 rounded-full flex items-center justify-center">
                  <Plus size={36} className="text-white" strokeWidth={4} />
                </div>
                <span className="text-[28px] font-black text-black">Add Item</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer (Editing Mode) */}
      {isEditing && (
        <div className="h-16 bg-[#EEEEEE] flex items-center justify-around px-2 border-t border-black/10 shrink-0">
          {showAttachmentMenu ? (
            <div className="w-full flex justify-around items-center px-4">
              <button onClick={() => addAttachment('image')} className="active:scale-95 transition-transform"><ImageIcon size={28}/></button>
              <button onClick={() => addAttachment('table')} className="active:scale-95 transition-transform"><Grid size={28}/></button>
              <button onClick={() => addAttachment('drawing')} className="active:scale-95 transition-transform"><PenTool size={28}/></button>
              <button onClick={() => addAttachment('kanban')} className="active:scale-95 transition-transform"><Columns size={28}/></button>
              <button onClick={() => setShowAttachmentMenu(false)} className="active:scale-95 transition-transform text-red-500 ml-4"><X size={32}/></button>
            </div>
          ) : (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    alert(`Selected file: ${e.target.files[0].name}`);
                  }
                }} 
              />
              <button 
                onClick={undo} 
                disabled={historyIndex === 0} 
                className={`p-3 rounded-full active:bg-black/10 transition-colors ${historyIndex === 0 ? 'opacity-20' : 'text-[#555555]'}`}
              >
                <RotateCcw size={32} strokeWidth={2.5} />
              </button>
              
              <button 
                onClick={() => editedNote.type === 'text' ? setShowAttachmentMenu(true) : fileInputRef.current?.click()}
                className="p-3 rounded-full active:bg-black/10 text-[#555555] transition-colors"
                title="Add Attachment"
              >
                <Plus size={32} strokeWidth={2.5} />
              </button>

              <button 
                onClick={redo} 
                disabled={historyIndex === history.length - 1} 
                className={`p-3 rounded-full active:bg-black/10 transition-colors ${historyIndex === history.length - 1 ? 'opacity-20' : 'text-[#555555]'}`}
              >
                <RotateCw size={32} strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Item Modal */}
      <AnimatePresence>
        {showItemDialog && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-[280px] shadow-2xl rounded-sm overflow-hidden"
            >
              <div className="p-5">
                <h3 className="text-xl font-bold text-black mb-4">Add Item</h3>
                <textarea 
                  ref={dialogInputRef as any}
                  className="w-full border-b-2 border-teal-600 outline-none p-1 text-lg font-bold min-h-[40px] resize-none"
                  value={dialogValue}
                  onChange={e => setDialogValue(e.target.value)}
                />
              </div>
              <div className="flex justify-end p-2 gap-4">
                <ActionButton label="NEXT" onClick={() => confirmItemChange(false)} />
                <ActionButton label="CANCEL" onClick={() => setShowItemDialog(false)} />
                <ActionButton label="OK" onClick={() => confirmItemChange(true)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* More Menu */}
      <AnimatePresence>
        {showMoreMenu && (
          <div className="fixed inset-0 z-[10002] flex items-start justify-end p-2 text-black">
            <div className="absolute inset-0" onClick={() => setShowMoreMenu(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, x: 20, y: -20 }} animate={{ scale: 1, opacity: 1, x: 0, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white shadow-2xl rounded-sm z-[10003] py-2 min-w-[180px] border border-black/10"
            >
              <MenuItem label="Reminder" icon={<Bell size={18}/>} onClick={() => setShowMoreMenu(false)} />
              <MenuItem 
                label={editedNote.archived ? "Restore" : "Archive"} 
                icon={<Archive size={18}/>} 
                onClick={() => {
                  const updated = { ...editedNote, archived: !editedNote.archived, modifiedAt: Date.now() };
                  handleCloseAndDiscard(true, updated);
                }} 
              />
              <MenuItem label="Send" icon={<Send size={18}/>} onClick={() => setShowMoreMenu(false)} />
              <MenuItem label="Lock" icon={<Lock size={18}/>} onClick={() => setShowMoreMenu(false)} />
              <MenuItem 
                label="Delete" 
                icon={<Trash2 size={18}/>} 
                isDamage
                onClick={async () => {
                  if (editedNote.id) {
                    const { notesDelete } = await import('../lib/db');
                    await notesDelete(editedNote.id);
                  }
                  handleCloseAndDiscard(false);
                }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Color Picker Grid */}
      <AnimatePresence>
        {showColorPicker && (
          <div className="fixed inset-0 z-[10004] flex items-center justify-center p-6 bg-black/40">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-4 shadow-2xl rounded-sm"
            >
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PALETTE.map(c => (
                  <button 
                    key={c.name}
                    onClick={() => { handleStateChange({ ...editedNote, color: c.name }); setShowColorPicker(false); }}
                    className={`w-16 h-16 border ${editedNote.color === c.name ? 'border-gray-400 ring-2 ring-gray-200' : 'border-black/5'}`}
                    style={{ backgroundColor: c.bg }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return createPortal(editorContent, document.body);
};

const ReorderItemWrapper: React.FC<{ 
  item: ChecklistItem, idx: number, isEditing: boolean, toggleItem: () => void, removeItem: () => void, 
  handleOpenDialog: () => void, activeItemMenu: number | null, setActiveItemMenu: (idx: number | null) => void 
}> = ({ item, idx, isEditing, toggleItem, removeItem, handleOpenDialog, activeItemMenu, setActiveItemMenu }) => {
  const controls = useDragControls();

  return (
    <Reorder.Item 
      value={item} 
      dragListener={false} 
      dragControls={controls}
      whileDrag={{ backgroundColor: "rgba(0,0,0,0.05)", scale: 1.02 }}
      className={`h-[60px] flex items-center px-2 gap-4 border-b border-black/10 bg-transparent active:bg-black/5 ${item.done ? 'opacity-50' : ''}`}
    >
      {isEditing ? (
        <>
          <div 
            className="w-12 h-12 flex items-center justify-center text-black/70 cursor-grab active:cursor-grabbing hover:bg-black/10 transition-colors"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => controls.start(e)}
          >
            <div className="flex flex-col items-center">
              <ChevronUp size={28} strokeWidth={4} />
              <ChevronDown size={28} strokeWidth={4} className="-mt-4" />
            </div>
          </div>
          <button 
            onClick={handleOpenDialog} 
            className="flex-1 text-left text-[28px] font-bold text-black truncate py-1"
          >
            {item.text}
          </button>
          <button onClick={removeItem} className="w-14 h-14 flex items-center justify-center text-red-500 active:scale-90 transition-transform">
            <X size={44} strokeWidth={2.5} />
          </button>
        </>
      ) : (
        <>
          <div 
            className="flex-1 h-full flex items-center min-w-0"
            onClick={toggleItem}
          >
             <div className={`text-2xl font-bold truncate pl-2 ${item.done ? 'line-through text-black/30' : 'text-black'}`}>
               {item.text}
             </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setActiveItemMenu(idx); }}
            className="w-10 h-10 flex items-center justify-center text-black/30 active:bg-black/10 rounded-full"
          >
            <MoreVertical size={24} />
          </button>
        </>
      )}

      {/* Item Context Menu (Viewer Mode) */}
      <AnimatePresence>
        {activeItemMenu === idx && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setActiveItemMenu(null)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="absolute right-2 top-10 bg-white shadow-2xl rounded-sm z-50 py-2 min-w-[200px] border border-black/20"
            >
              <div className="px-4 py-2 border-b border-black/10 text-lg font-bold truncate text-black">{item.text}</div>
              <MenuItem label="Edit" icon={<Edit2 size={20}/>} onClick={() => { setActiveItemMenu(null); handleOpenDialog(); }} />
              <MenuItem label="Remove" icon={<Trash2 size={20}/>} onClick={removeItem} />
              <MenuItem label="Web Search" icon={<Search size={20}/>} onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(item.text)}`)} />
              <MenuItem label="Copy to Clipboard" icon={<Copy size={20}/>} onClick={() => { navigator.clipboard.writeText(item.text); setActiveItemMenu(null); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
};

const Header: React.FC<{ 
  isEditing: boolean, onEdit: () => void, onEditIcon: () => void, onDone: () => void, onColorPicker: () => void, onShowMenu: () => void, 
  title: string, setTitle: (t: string) => void, color: any,
  noteType: string, body?: string, createdAt: number
}> = ({ isEditing, onEdit, onEditIcon, onDone, onColorPicker, onShowMenu, title, setTitle, color, noteType, body, createdAt }) => (
  <div className="h-16 flex items-center px-2 gap-1 shrink-0 z-[10001] shadow-lg" style={{ backgroundColor: color.border }}>
     <div className="flex-1 min-w-0 h-[46px] flex items-center">
        <div className="bg-white/95 flex-1 h-full flex items-center px-3 mx-1 rounded-[1px] shadow-sm">
          {isEditing ? (
            <input 
              autoFocus
              className="w-full bg-transparent text-[22px] font-black border-none outline-none text-black placeholder-gray-400"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title"
            />
          ) : (
            <div className="flex-1 h-full flex items-center cursor-pointer" onClick={onEdit}>
              <h1 className="text-[22px] font-black text-black truncate">
                {title || (noteType === 'checklist' ? `[${format(createdAt, 'yyyy-MM-dd')}]` : (body?.split('\n').find(l => l.trim() !== '') || `[${format(createdAt, 'yyyy-MM-dd')}]`))}
              </h1>
            </div>
          )}
        </div>
     </div>

     {isEditing ? (
       <button 
         onClick={onColorPicker} 
         className="p-1 active:bg-white/10 rounded-sm transition-colors mx-0.5"
         title="Change Color"
       >
         <div className="w-10 h-10 shadow-sm" style={{ backgroundColor: color.bg, border: `4px solid ${color.border}` }} />
       </button>
     ) : (
       <button 
         onClick={onEditIcon} 
         className="p-3 text-white active:bg-white/10 transition-colors"
         title="Edit"
       >
         <Edit2 size={24} strokeWidth={2.5} />
       </button>
     )}
     
     {isEditing ? (
       <button onClick={onDone} className="p-3 text-white active:bg-white/10 transition-colors">
         <Check size={32} strokeWidth={3} />
       </button>
     ) : (
       <button onClick={onShowMenu} className="p-3 text-white active:bg-white/10 transition-colors">
         <MoreVertical size={32} strokeWidth={3} />
       </button>
     )}
  </div>
);

const MenuItem: React.FC<{ label: string, icon: React.ReactNode, onClick: () => void, isDamage?: boolean }> = ({ label, icon, onClick, isDamage }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-100 text-lg font-bold ${isDamage ? 'text-red-500' : 'text-gray-800'}`}>
    <span className={isDamage ? 'text-red-300' : 'text-gray-500'}>{icon}</span>
    {label}
  </button>
);

const ActionButton: React.FC<{ label: string, onClick: () => void }> = ({ label, onClick }) => (
  <button onClick={onClick} className="px-4 py-2 text-sm font-black text-black hover:bg-gray-100 uppercase">
    {label}
  </button>
);

export default NoteEditor;

