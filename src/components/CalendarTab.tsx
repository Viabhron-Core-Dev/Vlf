import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, ArrowLeft, Trash2, Activity, Wallet, Calendar as CalendarIcon, Check, Search, Filter, List, ChevronDown, StickyNote, Book, HeartPulse, X } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { VianEvent, Habit, HabitRecord, Expense, Note, JournalEntry } from '../types';
import { eventsGetAll, eventSave, eventDelete, habitsGetAll, habitRecordsForHabit, expenseGetAll, expenseDelete, notesGetAll, notesDelete, journalGetAll, journalSave, journalDelete } from '../lib/db';

import { useApp } from '../AppContext';

interface CalendarTabProps {}

type CalendarView = 'month' | 'list' | 'actions' | 'notes' | 'journals' | 'medical';

const CalendarTab: React.FC<CalendarTabProps> = () => {
  const { triggerAdd } = useApp();
  const [view, setView] = useState<CalendarView>('month');
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<'all' | 'notes' | 'journals' | 'expenses'>('all');
  const { journalTags } = useApp();
  
  const [events, setEvents] = useState<VianEvent[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitRecords, setHabitRecords] = useState<Record<string, HabitRecord>>({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: 'event' | 'journal' | 'medical', data: any } | null>(null);
  const [showDateActions, setShowDateActions] = useState(false);
  const [showNotesInList, setShowNotesInList] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setShowAdd(false);
      setShowViewMenu(false);
      setShowDateActions(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleAddModal = (open: boolean, item: { type: 'event' | 'journal' | 'medical', data: any } | null = null) => {
    if (open) {
      setEditingItem(item);
      window.history.pushState({ calendarAdd: true }, '', '#calendar-add');
      setShowAdd(true);
    } else {
      if (showAdd) window.history.back();
    }
  };

  const toggleViewMenu = (open: boolean) => {
    if (open) {
      window.history.pushState({ calendarView: true }, '', '#calendar-view');
      setShowViewMenu(true);
    } else {
      if (showViewMenu) window.history.back();
    }
  };

  useEffect(() => {
    if (triggerAdd > 0) toggleAddModal(true);
  }, [triggerAdd]);

  const fetchData = async () => {
    const [allEvents, allHabits, allExpenses, allNotes, allJournals] = await Promise.all([
      eventsGetAll(),
      habitsGetAll(),
      expenseGetAll(),
      notesGetAll(),
      journalGetAll()
    ]);

    setEvents((allEvents || []).filter(e => !e.deleted));
    setHabits((allHabits || []).filter(h => !h.deleted));
    setExpenses((allExpenses || []).filter(e => !e.deleted));
    setNotes((allNotes || []).filter(n => !n.deleted));
    setJournals((allJournals || []).filter(j => !j.deleted));

    const allRecords: Record<string, HabitRecord> = {};
    for (const h of (allHabits || [])) {
      if (h.id) {
        const recs = await habitRecordsForHabit(h.id);
        recs.forEach(r => {
          allRecords[`${h.id}-${r.date}`] = r;
        });
      }
    }
    setHabitRecords(allRecords);
  };

  useEffect(() => { fetchData(); }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  
  // Filtering logic
  const filteredEvents = events.filter(e => {
    const d = new Date(e.date);
    const inDate = isSameDay(d, selectedDate);
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (e.body || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return (view === 'month' ? inDate : true) && matchesSearch && (searchCategory === 'all');
  });

  const filteredExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    const inDate = isSameDay(d, selectedDate);
    const matchesSearch = e.item?.toLowerCase().includes(searchQuery.toLowerCase()) || e.shop?.toLowerCase().includes(searchQuery.toLowerCase());
    return (view === 'month' ? inDate : true) && matchesSearch && (searchCategory === 'all' || searchCategory === 'expenses');
  });

  const filteredNotes = notes.filter(n => {
    const d = new Date(n.createdAt);
    const inDate = isSameDay(d, selectedDate);
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (n.body || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (n.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return (view === 'month' ? inDate : true) && matchesSearch && (searchCategory === 'all' || searchCategory === 'notes');
  });

  const filteredJournals = journals.filter(j => {
    const d = new Date(j.date);
    const inDate = isSameDay(d, selectedDate);
    const matchesSearch = j.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (j.body || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (j.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return (view === 'month' ? inDate : true) && matchesSearch && (searchCategory === 'all' || searchCategory === 'journals');
  });

  const dayHabits = habits.filter(h => habitRecords[`${h.id}-${selectedDateStr}`]?.value > 0);

  const totalPoints = filteredEvents.length + filteredExpenses.length + dayHabits.length;

  const [isSwiping, setIsSwiping] = useState(false);

  const handleMonthChange = (direction: 'next' | 'prev') => {
    setCurrentMonth(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  return (
    <div className="flex flex-col h-full bg-[#E5E5E5] touch-pan-y overflow-hidden">
      {/* Search Bar */}
      <div className="bg-white px-3 py-2 flex flex-col gap-2 shadow-sm relative z-20">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 border border-black/5">
          <Search size={16} className="text-black/30" />
          <input 
            className="flex-1 bg-transparent text-sm font-bold outline-none placeholder-black/20" 
            placeholder="Search diary, notes, expenses..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && <X size={16} className="text-black/30 cursor-pointer" onClick={() => setSearchQuery('')} />}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
           {(['all', 'notes', 'journals', 'expenses'] as const).map(cat => (
             <button 
                key={cat} 
                onClick={() => setSearchCategory(cat)}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${searchCategory === cat ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white text-black/30 border-black/5'}`}
             >
                {cat}
             </button>
           ))}
        </div>
      </div>

      {/* View Switcher Header */}
      <div className="bg-white border-b border-black/5 px-4 py-2 flex items-center justify-between z-20 sticky top-0">
        <div className="relative">
          <button 
            onClick={() => toggleViewMenu(!showViewMenu)}
            className="flex items-center gap-2 font-black text-xs uppercase tracking-tight text-black/60 hover:text-black"
          >
            {view} View <ChevronDown size={14} />
          </button>
          <AnimatePresence>
            {showViewMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => toggleViewMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-2xl py-2 z-50 border border-gray-100"
                >
                  {(['month', 'list', 'actions', 'notes', 'journals', 'medical'] as CalendarView[]).map(v => (
                    <button 
                      key={v} 
                      onClick={() => { setView(v); setShowViewMenu(false); }}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${view === v ? 'bg-gray-50 text-black font-black' : 'text-gray-500 font-bold'}`}
                    >
                      <span className="text-xs uppercase tracking-[0.2em]">{v}</span>
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {view === 'month' && (
          <div className="flex items-center gap-2">
             <button onClick={() => handleMonthChange('prev')} className="p-1"><ChevronLeft size={20}/></button>
             <span className="text-[11px] font-black uppercase tracking-widest min-w-[100px] text-center">{format(currentMonth, 'MMM yyyy')}</span>
             <button onClick={() => handleMonthChange('next')} className="p-1"><ChevronRight size={20}/></button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {view === 'month' && (
          <motion.div 
            key={format(currentMonth, 'yyyy-MM')}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col bg-white overflow-hidden relative"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            dragDirectionLock
            onDragEnd={(_, info) => {
              if (info.offset.y < -80) handleMonthChange('next');
              if (info.offset.y > 80) handleMonthChange('prev');
            }}
          >
            <div className="grid grid-cols-7 border-b border-black/5 bg-white">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center py-4 text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">{day}</div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-black/5 p-[1px]">
              {calendarDays.slice(0, 42).map((day, i) => {
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const hasData = events.some(e => isSameDay(new Date(e.date), day)) || 
                                expenses.some(e => isSameDay(new Date(e.date), day)) ||
                                habits.some(h => habitRecords[`${h.id}-${format(day, 'yyyy-MM-dd')}`]?.value > 0);
                
                return (
                  <button 
                    key={i} 
                    onClick={() => {
                      setSelectedDate(day);
                      setShowDateActions(true);
                      window.history.pushState({ calendarActions: true }, '', `#calendar-actions-${format(day, 'yyyy-MM-dd')}`);
                    }}
                    className={`bg-white relative flex flex-col items-center justify-center transition-all ${!isCurrentMonth ? 'bg-gray-50/40' : ''}`}
                  >
                    {isSelected && (
                      <motion.div layoutId="dayHighlight" className="absolute inset-2 bg-[#FBC02D] rounded-sm shadow-sm" />
                    )}
                    <span className={`relative z-10 text-lg font-black tracking-tighter ${isSelected ? 'text-white' : isCurrentMonth ? 'text-black/80' : 'text-black/10'}`}>
                      {format(day, 'd')}
                    </span>
                    {hasData && (
                      <div className={`mt-2 w-2 h-2 rounded-full relative z-10 ${isSelected ? 'bg-white shadow-sm' : 'bg-[#FBC02D]'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {view !== 'month' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden touch-pan-y bg-white">
            <div className="p-4 space-y-4 pb-24">
              {view === 'list' && (
                <div className="flex items-center justify-between mb-4 border-b border-black/5 pb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/60">Include Notes & Checklists</span>
                  <button onClick={() => setShowNotesInList(!showNotesInList)} className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${showNotesInList ? 'bg-black' : 'bg-black/10'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showNotesInList ? 'translate-x-4 shadow-sm' : 'translate-x-0'}`} />
                  </button>
                </div>
              )}

              {(view === 'list' || view === 'actions' || view === 'medical') && filteredEvents.filter(e => {
                if (view === 'medical') return e.icon === '🏥';
                return true;
              }).map(event => (
                <div key={event.id} className="relative group">
                  <PointCard 
                    icon={event.icon === '🏥' ? <HeartPulse size={18} /> : event.icon || '📅'} 
                    title={event.title} 
                    sub={event.time} 
                    accent={event.icon === '🏥' ? 'bg-red-400' : 'bg-white text-black/60'}
                    onClick={() => toggleAddModal(true, { type: event.type || 'event', data: event } as any)}
                  />
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Delete this event?')) {
                        await eventDelete(event.id!);
                        fetchData();
                      }
                    }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-red-500 shadow-sm bg-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 active:scale-90"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
              {(view === 'list' || view === 'actions') && dayHabits.map(habit => (
                <PointCard key={habit.id} icon={<Activity size={18}/>} title={habit.name} sub="Habit Complete" accent="bg-teal-500" />
              ))}
              {(view === 'list' || view === 'actions') && filteredExpenses.map(exp => (
                <div key={exp.id} className="relative group">
                  <PointCard icon={<Wallet size={18}/>} title={exp.item || 'Expense'} sub={`₹${exp.price}`} accent="bg-red-500" />
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Delete this expense?')) {
                        await expenseDelete(exp.id!);
                        fetchData();
                      }
                    }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-red-500 shadow-sm bg-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 active:scale-90"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
              {(view === 'notes' || (view === 'list' && showNotesInList)) && filteredNotes.map(note => (
                <div key={note.id} className="relative group">
                  <PointCard 
                    icon={<StickyNote size={18}/>} 
                    title={note.title} 
                    sub="New Note" 
                    accent="bg-[#FBC02D]" 
                    tags={note.tags}
                    onClick={() => {/* Handled by App activeNote state potentially, but for now we follow pattern */}}
                  />
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Delete this note?')) {
                        await notesDelete(note.id!);
                        fetchData();
                      }
                    }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-red-500 shadow-sm bg-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 active:scale-90"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
              {(view === 'list' || view === 'journals' || view === 'actions') && filteredJournals.map(journal => (
                <div key={journal.id} className="relative group">
                  <PointCard 
                    icon={<Book size={18}/>} 
                    title={journal.title || 'Journal Entry'} 
                    sub={journal.time} 
                    accent="bg-indigo-500" 
                    tags={journal.tags}
                    onClick={() => toggleAddModal(true, { type: 'journal', data: journal })}
                  />
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Delete this journal entry?')) {
                        await journalDelete(journal.id!);
                        fetchData();
                      }
                    }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-red-500 shadow-sm bg-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 active:scale-90"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDateActions && (
          <DateActionsOverlay 
            date={selectedDate}
            onClose={() => setShowDateActions(false)}
            onAdd={() => { setShowDateActions(false); toggleAddModal(true); }}
            onViewList={() => { setShowDateActions(false); setView('list'); }}
            events={filteredEvents}
            expenses={filteredExpenses}
            habits={dayHabits}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && (
          <EventForm 
            date={selectedDate}
            initialData={editingItem}
            onClose={() => toggleAddModal(false)}
            onSave={async (type, data) => { 
              if (type === 'event' || type === 'medical') await eventSave(data);
              else if (type === 'journal') await journalSave(data);
              toggleAddModal(false); 
              fetchData(); 
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const PointCard: React.FC<{ icon: React.ReactNode, title: string, sub: string, accent?: string, onClick?: () => void, tags?: string[] }> = ({ icon, title, sub, accent = 'bg-white', onClick, tags = [] }) => (
  <div 
    onClick={onClick}
    className="bg-white p-4 rounded-xl border border-black/5 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer"
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-black/60 shadow-inner shrink-0 ${accent === 'bg-white' ? 'bg-gray-50' : accent + ' text-white'}`}>
      {typeof icon === 'string' ? <span className="text-xl">{icon}</span> : icon}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-black text-[13px] text-black uppercase tracking-tight truncate leading-tight">{title}</h4>
      <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mt-0.5">{sub}</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map(t => (
            <span key={t} className="px-1.5 py-0.5 bg-black/5 rounded text-[8px] font-black uppercase tracking-tight text-black/40">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
    <ChevronRight size={18} className="text-black/10 shrink-0" />
  </div>
);

const DateActionsOverlay: React.FC<{ 
  date: Date, 
  onClose: () => void, 
  onAdd: () => void,
  onViewList: () => void,
  events: VianEvent[],
  expenses: Expense[],
  habits: Habit[]
}> = ({ date, onClose, onAdd, onViewList, events, expenses, habits }) => {
  const totalItems = events.length + expenses.length + habits.length;

  return createPortal(
    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }} 
        className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden relative z-10 shadow-2xl flex flex-col"
      >
        <div className="p-8 pb-6">
          <div className="mb-6">
             <h3 className="text-2xl font-black text-gray-900 leading-tight tracking-tight uppercase">
               {format(date, 'MMMM d')}
             </h3>
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">What's the plan?</p>
          </div>

          <div className="space-y-3 mb-8">
             {totalItems === 0 ? (
               <div className="py-4 text-center">
                 <p className="text-sm font-bold text-gray-400 italic">No scheduled points for this day yet.</p>
               </div>
             ) : (
               <div className="space-y-2">
                 {events.slice(0, 2).map(e => (
                   <div key={e.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                     <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-lg">{e.icon || '📅'}</div>
                     <span className="text-[11px] font-black uppercase tracking-tight text-gray-700 truncate">{e.title}</span>
                   </div>
                 ))}
                 {totalItems > 2 && (
                   <p className="text-[9px] font-black text-center text-teal-600 uppercase tracking-widest">+{totalItems - 2} more items</p>
                 )}
               </div>
             )}
          </div>

          <div className="flex flex-col gap-3">
             <button 
                onClick={onAdd}
                className="w-full bg-[#FBC02D] hover:bg-[#F9A825] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-yellow-500/20 uppercase text-xs tracking-widest"
             >
                <Plus size={18} strokeWidth={3} />
                Add New Reminder
             </button>
             <button 
                onClick={onViewList}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors uppercase text-xs tracking-widest"
             >
                <List size={18} strokeWidth={3} />
                View Full Summary
             </button>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="w-full py-4 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-t border-gray-100 hover:bg-gray-100 transition-colors"
        >
          Dismiss
        </button>
      </motion.div>
    </div>,
    document.body
  );
};

const EventForm: React.FC<{ 
  date: Date, 
  initialData?: { type: 'event' | 'journal' | 'medical', data: any } | null,
  onClose: () => void, 
  onSave: (type: 'event' | 'journal' | 'medical', data: any) => void 
}> = ({ date, initialData, onClose, onSave }) => {
  const { journalTags } = useApp();
  const [type, setType] = useState<'event' | 'journal' | 'medical'>(initialData?.type || 'event');
  const [title, setTitle] = useState(initialData?.data?.title || '');
  const [content, setContent] = useState(initialData?.data?.body || '');
  const [time, setTime] = useState(initialData?.data?.time || format(new Date(), 'HH:mm'));
  const [icon, setIcon] = useState(initialData?.data?.icon || '📅');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.data?.tags || []);

  return createPortal(
    <motion.div 
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      className="fixed inset-0 z-[200000] bg-white flex flex-col"
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onMouseMove={e => e.stopPropagation()}
      onMouseUp={e => e.stopPropagation()}
    >
      <header className="h-16 bg-[#333333] text-white px-4 flex items-center justify-between shadow-lg">
        <button onClick={onClose} className="p-2 -ml-2"><ArrowLeft size={24}/></button>
        <h2 className="font-bold text-lg uppercase tracking-tight">{initialData ? 'Edit Point' : 'Add Point'}</h2>
        <button 
          onClick={() => onSave(type, { 
            ...(initialData?.data || {}),
            title, 
            date: format(date, 'yyyy-MM-dd'), 
            time, 
            icon, 
            body: content,
            tags: selectedTags,
            modifiedAt: Date.now(),
            createdAt: initialData?.data?.createdAt || Date.now()
          })}
          className="font-bold px-4 py-2 bg-[#FBC02D] text-black rounded text-[10px] uppercase tracking-widest"
        >SAVE</button>
      </header>

      <div className="flex-1 overflow-y-auto touch-pan-y p-6 space-y-6">
        <div className="flex gap-2 shrink-0 overflow-x-auto no-scrollbar pb-1">
           {(['event', 'journal', 'medical'] as const).map(t => (
             <button 
                key={t}
                onClick={() => { 
                  setType(t); 
                  if(t==='medical') setIcon('🏥'); 
                  if(t==='journal') setIcon('📖'); 
                }}
                className={`flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${type === t ? 'bg-[#333333] text-white border-[#333333]' : 'bg-gray-50 text-black/30 border-black/5'}`}
             >
                {t}
             </button>
           ))}
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Title</label>
          <input 
            autoFocus
            className="w-full bg-gray-50 border-none rounded-lg p-4 outline-none font-bold text-lg placeholder-black/10"
            placeholder={type === 'journal' ? "How was your day?" : "Family Dinner..."}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {type === 'journal' && (
          <>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Journal Tags</label>
              <div className="flex flex-wrap gap-2">
                {journalTags.map(tag => {
                  const isSelected = selectedTags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setSelectedTags(prev => 
                          isSelected ? prev.filter(t => t !== tag.name) : [...prev, tag.name]
                        );
                      }}
                      className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight border transition-all ${isSelected ? 'bg-black text-white border-black' : 'bg-white text-black/40 border-black/5'}`}
                    >
                      {isSelected ? '✓ ' : '+ '}{tag.name}
                    </button>
                  );
                })}
                {journalTags.length === 0 && (
                  <p className="text-[10px] font-medium text-black/20 italic ml-1">No journal tags defined. Add them in Settings.</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Entry Content</label>
              <textarea 
                className="w-full bg-gray-50 border-none rounded-lg p-4 outline-none font-medium h-40 resize-none text-lg"
                placeholder="Start writing..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="block text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Time</label>
          <input 
            type="time"
            className="w-full bg-gray-50 border-none rounded-lg p-4 outline-none font-bold"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
        </div>

        <div className="space-y-4 pt-2">
           <label className="block text-[10px] font-black text-black/30 uppercase tracking-widest ml-1">Icon Representation</label>
           <div className="grid grid-cols-5 gap-3">
             {['📅', '🍽️', '✈️', '🎬', '🏋️', '🏥', '🎂', '📖', '🛒', '💊', '✨', '🔥', '🌈', '🎨', '🚀'].map(i => (
               <button 
                 key={i}
                 onClick={() => setIcon(i)}
                 className={`aspect-square text-2xl flex items-center justify-center rounded-xl transition-all border-2 ${icon === i ? 'bg-[#333333] text-white border-[#333333]' : 'bg-white border-black/5'}`}
               >
                 {i}
               </button>
             ))}
           </div>
        </div>
      </div>
    </motion.div>,
    document.body
  );
};

export default CalendarTab;
