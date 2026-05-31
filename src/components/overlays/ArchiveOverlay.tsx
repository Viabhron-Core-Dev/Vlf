import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Archive, StickyNote, Wallet, Check, Book, Calendar as CalendarIcon, RotateCcw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { archiveGetAll, archiveRestore, archiveDelete } from '../../lib/db';

interface ArchiveOverlayProps {
  onClose: () => void;
}

export const ArchiveOverlay: React.FC<ArchiveOverlayProps> = ({ onClose }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArchive = async () => {
    setLoading(true);
    const data = await archiveGetAll();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchArchive();
  }, []);

  const handleRestore = async (archiveId: string) => {
    await archiveRestore(archiveId);
    fetchArchive();
  };

  const handleDelete = async (archiveId: string) => {
    await archiveDelete(archiveId);
    fetchArchive();
  };

  return (
    <motion.div 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }} 
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[#F5F5F5] z-[200] flex flex-col"
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onMouseMove={e => e.stopPropagation()}
      onMouseUp={e => e.stopPropagation()}
    >
      <div className="h-16 bg-[#333333] text-white flex items-center px-4 gap-4 shrink-0 shadow-lg">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={24}/></button>
        <h2 className="font-black text-lg uppercase tracking-tight">Archive</h2>
        <div className="flex-1" />
        <button onClick={fetchArchive} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto touch-pan-y">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-12 text-center">
            <Archive size={64} strokeWidth={1} className="mb-4 opacity-20" />
            <p className="font-bold text-lg">Your archive is empty</p>
            <p className="text-sm">Items you archive will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5 bg-white">
            {items.map((item) => (
              <div key={item.archiveId} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {item.archiveType === 'note' && <StickyNote size={20} className="text-gray-400" />}
                  {item.archiveType === 'habit' && <Check size={20} className="text-gray-400" />}
                  {item.archiveType === 'event' && <CalendarIcon size={20} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                      {item.archiveType}
                    </span>
                    <span className="text-xs text-gray-400 font-bold">
                      {item.modifiedAt ? format(item.modifiedAt, 'MMM d, h:mm a') : (item.createdAt ? format(item.createdAt, 'MMM d, h:mm a') : 'Unknown date')}
                    </span>
                  </div>
                  <h4 className="font-bold text-[#333333] truncate">
                    {item.archiveType === 'note' 
                      ? (item.title || (item.type === 'checklist' ? `[${format(item.createdAt, 'yyyy-MM-dd')}]` : (item.body?.split('\n').find((l: string) => l.trim() !== '') || `[${format(item.createdAt, 'yyyy-MM-dd')}]`)))
                      : (item.title || item.name || item.item || 'Untitled Item')}
                  </h4>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleRestore(item.archiveId)}
                    className="p-3 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                    title="Restore"
                  >
                    <RotateCcw size={20} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.archiveId)}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Move to Trash"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
