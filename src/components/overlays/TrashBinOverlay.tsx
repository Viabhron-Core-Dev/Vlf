import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Trash2, StickyNote, Wallet, Check, Book, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { trashGetAll, trashRestore, trashPermanentDelete } from '../../lib/db';

interface TrashBinOverlayProps {
  onClose: () => void;
}

export const TrashBinOverlay: React.FC<TrashBinOverlayProps> = ({ onClose }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = async () => {
    setLoading(true);
    const data = await trashGetAll();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (trashId: string) => {
    await trashRestore(trashId);
    fetchTrash();
  };

  const handlePermanentDelete = async (trashId: string) => {
    await trashPermanentDelete(trashId);
    fetchTrash();
  };

  return (
    <motion.div 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }} 
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[#F5F5F5] z-[200] flex flex-col"
    >
      <div className="h-16 bg-[#333333] text-white flex items-center px-4 gap-4 shrink-0 shadow-lg">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={24}/></button>
        <h2 className="font-black text-lg uppercase tracking-tight">Trash Bin</h2>
        <div className="flex-1" />
        <button onClick={fetchTrash} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-12 text-center">
            <Trash2 size={64} strokeWidth={1} className="mb-4 opacity-20" />
            <p className="font-bold text-lg">Your trash is empty</p>
            <p className="text-sm">Items you delete will appear here for recovery.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5 bg-white">
            {items.map((item) => (
              <div key={item.trashId} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {item.trashType === 'note' && <StickyNote size={20} className="text-gray-400" />}
                  {item.trashType === 'expense' && <Wallet size={20} className="text-gray-400" />}
                  {item.trashType === 'habit' && <Check size={20} className="text-gray-400" />}
                  {item.trashType === 'journal' && <Book size={20} className="text-gray-400" />}
                  {item.trashType === 'event' && <CalendarIcon size={20} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                      {item.trashType}
                    </span>
                    <span className="text-xs text-gray-400 font-bold">
                      {item.deletedAt ? format(item.deletedAt, 'MMM d, h:mm a') : 'Unknown date'}
                    </span>
                  </div>
                  <h4 className="font-bold text-[#333333] truncate">
                    {item.trashType === 'note' 
                      ? (item.title || (item.type === 'checklist' ? `[${format(item.createdAt, 'yyyy-MM-dd')}]` : (item.body?.split('\n').find((l: string) => l.trim() !== '') || `[${format(item.createdAt, 'yyyy-MM-dd')}]`)))
                      : (item.title || item.name || item.item || 'Untitled Item')}
                  </h4>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleRestore(item.trashId)}
                    className="p-3 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                    title="Restore"
                  >
                    <RotateCcw size={20} />
                  </button>
                  <button 
                    onClick={() => handlePermanentDelete(item.trashId)}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Permanent Delete"
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
