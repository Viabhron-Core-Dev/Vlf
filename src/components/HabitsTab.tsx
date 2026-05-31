import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Check, ArrowLeft, MoreVertical, ListFilter, X, ChevronRight, ChevronDown, Trash2, Pencil, Calendar as CalendarIcon, Bell, BellOff, Pause, Play, Target, Zap, ArrowRight, GripVertical } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Habit, HabitRecord, SubHabit } from '../types';
import { habitsGetAll, habitSave, habitRecordSet, habitRecordsForHabit } from '../lib/db';
import { COMMON_ICONS } from '../constants';

import { useApp } from '../AppContext';

interface HabitsTabProps {}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HabitsTab: React.FC<HabitsTabProps> = () => {
  const { triggerAdd, sortType } = useApp();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [records, setRecords] = useState<Record<string, HabitRecord>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{habit: Habit, subIdx?: number} | null>(null);
  const [expandedHabits, setExpandedHabits] = useState<Record<number, boolean>>({});
  
  // Selection
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [showSelector, setShowSelector] = useState(false);
  const [initialMode, setInitialMode] = useState<'habit' | 'task' | undefined>(undefined);
  const [customInputCell, setCustomInputCell] = useState<{ habitId: number, dateStr: string, currentValue: number } | null>(null);

  const handleCustomInputSave = async () => {
    if (!customInputCell) return;
    const { habitId, dateStr, currentValue } = customInputCell;
    await habitRecordSet(habitId, dateStr, currentValue);
    setCustomInputCell(null);
    fetchHabits();
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state || {};
      setShowAdd(!!state.habitAdd);
      setEditingHabit(state.editingHabit || null);
      setInitialMode(state.initialMode || undefined);
      if (state.habitDetail) {
        const found = habits.find(h => h.id === state.habitDetail);
        setSelectedDetail(found ? { habit: found, subIdx: state.subIdx } : null);
      } else {
        setSelectedDetail(null);
      }
      setIsSelectMode(!!state.habitSelect);
      setShowSelector(!!state.habitSelector);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [habits]);

  const toggleSelector = (open: boolean) => {
    if (open) {
      if (window.location.hash !== '#habit-selector') {
        window.history.pushState({ habitSelector: true }, '', '#habit-selector');
      }
      setShowSelector(true);
    } else {
      if (showSelector) {
        setShowSelector(false);
        if (window.location.hash === '#habit-selector') {
          window.history.back();
        }
      }
    }
  };

  const toggleAddModal = (open: boolean, habit?: Habit) => {
    if (open) {
      if (window.location.hash !== '#habit-add') {
        window.history.pushState({ habitAdd: true, editingHabit: habit || null, initialMode: habit?.habitMode || initialMode }, '', '#habit-add');
      }
      if (habit) setEditingHabit(habit);
      else setShowAdd(true);
    } else {
      if (showAdd || editingHabit) {
        setShowAdd(false);
        setEditingHabit(null);
        setInitialMode(undefined);
        if (window.location.hash === '#habit-add') {
          window.history.back();
        }
      }
    }
  };

  const openDetail = (habit: Habit, subIdx?: number) => {
    const hash = `#habit-${habit.id}${subIdx !== undefined ? `-sub-${subIdx}` : ''}`;
    if (window.location.hash !== hash) {
      window.history.pushState({ habitDetail: habit.id, subIdx }, '', hash);
    }
    setSelectedDetail({ habit, subIdx });
  };

  const toggleSelectMode = (open: boolean) => {
    if (open) {
      if (window.location.hash !== '#habit-select') {
        window.history.pushState({ habitSelect: true }, '', '#habit-select');
      }
      setIsSelectMode(true);
    } else {
      if (isSelectMode) {
        setIsSelectMode(false);
        setSelectedIds(new Set());
        if (window.location.hash === '#habit-select') {
          window.history.back();
        }
      }
    }
  };

  useEffect(() => {
    if (triggerAdd > 0) toggleSelector(true);
  }, [triggerAdd]);

  const today = new Date();
  const weekDays = Array.from({ length: 4 }, (_, i) => subDays(today, i));

  const fetchHabits = async () => {
    const data = await habitsGetAll();
    let sorted = data.filter(h => !h.archived);
    
    if (sortType === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortType === 'created') {
      sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else {
      sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    setHabits(sorted);
    
    const allRecords: Record<string, HabitRecord> = {};
    for (const habit of sorted) {
      if (habit.id) {
        const habitRecs = await habitRecordsForHabit(habit.id);
        habitRecs.forEach(r => {
          allRecords[r.habitDate] = r;
        });
      }
    }
    setRecords(allRecords);
  };

  useEffect(() => { fetchHabits(); }, [sortType]);

  const getTotalTaskValue = (habit: Habit) => {
    let totalValue = 0;
    (Object.values(records) as HabitRecord[]).forEach(r => {
      if (r.habitId === habit.id) {
        totalValue += r.value;
      }
    });
    return totalValue;
  };

  const isTaskCompleted = (task: Habit) => {
    const total = getTotalTaskValue(task);
    if (task.type === 'yesno') return total >= 1;
    if (task.type === 'measurable') return task.targetTotal ? total >= task.targetTotal : false;
    return false;
  };

  const tasksList = React.useMemo(() => habits.filter(h => h.habitMode === 'task' && !isTaskCompleted(h)), [habits, records]);
  const habitsList = React.useMemo(() => habits.filter(h => h.habitMode !== 'task'), [habits]);

  const handleReorderTasks = async (newTasks: Habit[]) => {
    if (sortType !== 'order') return;
    const updated = newTasks.map((t, i) => ({ ...t, order: i }));
    setHabits([...updated, ...habitsList]);
    for (const h of updated) {
      await habitSave(h);
    }
  };

  const handleReorderHabits = async (newHabitsOrder: Habit[]) => {
    if (sortType !== 'order') return;
    const updated = newHabitsOrder.map((h, i) => ({ ...h, order: i + tasksList.length }));
    setHabits([...tasksList, ...updated]);
    for (const h of updated) {
      await habitSave(h);
    }
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      if (newSelected.size === 0) toggleSelectMode(false);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleLongPress = (id: number) => {
    if (isSelectMode) {
      toggleSelection(id);
    } else {
      toggleSelectMode(true);
      setSelectedIds(new Set([id]));
    }
  };

  const handleCellTap = async (habitId: number, dateStr: string, isMeasurable: boolean) => {
    const key = `${habitId}-${dateStr}`;
    const existing = records[key];
    const cur = existing?.value || 0;

    let newValue = 0;
    if (isMeasurable) {
      newValue = cur + 1;
    } else {
      newValue = cur > 0 ? 0 : 1;
    }

    await habitRecordSet(habitId, dateStr, newValue);
    fetchHabits();
  };

  const handleSubHabitTap = async (habitId: number, subIdx: number, dateStr: string, isMeasurable: boolean) => {
    const subDateStr = `sub-${subIdx}-${dateStr}`;
    const key = `${habitId}-${subDateStr}`;
    const existing = records[key];
    const cur = existing?.value || 0;
    
    let newValue = 0;
    if (isMeasurable) {
      newValue = cur + 1;
    } else {
      newValue = cur > 0 ? 0 : 1;
    }

    await habitRecordSet(habitId, subDateStr, newValue);
    fetchHabits();
  };

  const checkIsActive = (habit: Habit, date: Date) => {
    if (habit.archived || habit.deleted) return false;
    
    // Check start date constraint
    if (habit.startDate) {
      const hStart = new Date(habit.startDate);
      hStart.setHours(0, 0, 0, 0);
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      if (d < hStart) return false;
    }

    // Check deadline (end date) constraint
    if (habit.deadline) {
      const hEnd = new Date(habit.deadline);
      hEnd.setHours(0, 0, 0, 0);
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      if (d > hEnd) return false;
    }

    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') {
       // Our 'weekly' in this app implies any day, but often users mean 1/week.
       // However, we'll treat it as daily for now or until refined.
       return true;
    }
    if (habit.frequency === 'custom_days') {
       const day = date.getDay(); // 0 is Sunday
       return habit.selectedDays?.includes(day);
    }
    if (habit.frequency === 'specific_dates') {
       const dateStr = format(date, 'yyyy-MM-dd');
       return habit.specificDates?.includes(dateStr);
    }
    return true;
  };

  const calculateProgress = (habit: Habit, dateStr: string) => {
    if (habit.isPaused) return 0;
    
    // Check if active on this day
    if (!checkIsActive(habit, new Date(dateStr))) return 0;

    if (habit.type === 'combination' && habit.subHabits) {
      const activeSubHabits = habit.subHabits.filter(sub => !sub.isPaused);
      if (activeSubHabits.length === 0) return 0;
      
      let doneCount = 0;
      habit.subHabits.forEach((sub, idx) => {
        if (!sub.isPaused && records[`${habit.id}-sub-${idx}-${dateStr}`]?.value > 0) doneCount++;
      });
      return Math.round((doneCount / activeSubHabits.length) * 100);
    }

    const r = records[`${habit.id}-${dateStr}`];
    const val = r?.value || 0;

    if (habit.habitMode === 'task' && habit.targetTotal) {
       // For tasks, we might want to check total cumulative progress?
       // But the cell view usually shows daily state.
       // Let's keep the cell showing daily progress, but we can show total progress in detail.
    }

    if (habit.type === 'measurable') {
      return habit.target ? Math.round(Math.min(val / habit.target, 1) * 100) : (val > 0 ? 100 : 0);
    }
    return val > 0 ? 100 : 0;
  };

  const calculateTotalTaskProgress = (habit: Habit) => {
    if (habit.habitMode !== 'task' || !habit.targetTotal) return 0;
    const totalValue = getTotalTaskValue(habit);
    return Math.round(Math.min(totalValue / habit.targetTotal, 1) * 100);
  };

  const toggleExpand = (id: number) => {
    setExpandedHabits(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-full bg-[#E5E5E5] touch-pan-y touch-manipulation overflow-hidden" style={{ overscrollBehaviorY: 'contain' }}>
      {/* Selection Top Bar */}
      {createPortal(
        <AnimatePresence>
          {isSelectMode && (
            <motion.div 
              initial={{ y: -60 }}
              animate={{ y: 0 }}
              exit={{ y: -60 }}
              className="fixed top-0 left-0 right-0 h-16 bg-[#CCCCCC] shadow-md z-[99999] flex items-center px-4 gap-4 border-b border-black/10 touch-manipulation"
            >
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleSelectMode(false);
                }} 
                className="p-3 active:bg-black/10 touch-manipulation cursor-pointer"
              >
                <X size={32} className="text-[#333333]" strokeWidth={3} />
              </button>
              <span className="font-black text-2xl flex-1 text-[#333333] ml-2">
                 {selectedIds.size}/{habits.length}
              </span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Selection Bottom Bar */}
      {createPortal(
        <AnimatePresence>
          {isSelectMode && (
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="fixed bottom-0 left-0 right-0 h-20 bg-[#EEEEEE] border-t border-black/10 z-[99999] flex items-center justify-around px-2"
            >
              <button 
                onClick={async () => {
                  const { habitDelete } = await import('../lib/db');
                  for (const id of selectedIds) {
                    await habitDelete(id);
                  }
                  toggleSelectMode(false);
                  fetchHabits();
                }}
                className="flex flex-col items-center justify-center h-full flex-1 active:bg-black/5 gap-0.5"
              >
                <Trash2 size={28} className="text-[#333333]" strokeWidth={2.5} />
                <span className="text-[13px] font-black uppercase text-[#333333]">Delete</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden touch-pan-y pb-24">
        {/* Main Content Area */}

        {/* Days Header */}
        <div className="flex justify-end border-b border-black/5 bg-[#F5F5F5] sticky top-0 z-10">
          <div className="flex px-1">
            {weekDays.map(d => (
              <div key={d.toString()} className="w-14 py-2 flex flex-col items-center leading-none">
                <span className="text-[10px] font-black text-black/40 uppercase tracking-tight">{format(d, 'eee')}</span>
                <span className="text-[12px] font-black text-black/60 mt-0.5">{format(d, 'd')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white">
          <Reorder.Group axis="y" values={tasksList} onReorder={handleReorderTasks}>
            {tasksList.map(task => {
              const isSelected = selectedIds.has(task.id!);
              const isActiveToday = checkIsActive(task, new Date());
              const totalVal = getTotalTaskValue(task);
              const isDone = task.targetTotal ? totalVal >= task.targetTotal : (task.type === 'yesno' ? totalVal >= 1 : false);

              return (
                <Reorder.Item key={task.id} value={task} className="border-b border-black/5 relative bg-white truncate">
                  <div className={`flex flex-col transition-all ${isSelected ? 'bg-yellow-50' : ''}`}>
                    <LongPressItem 
                      onLongPress={() => task.id && handleLongPress(task.id)}
                      onClick={() => {
                        if (isSelectMode) toggleSelection(task.id!);
                        else openDetail(task);
                      }}
                    >
                      <div className="flex items-center min-h-[60px] cursor-pointer">
                        <div 
                          className="flex-1 flex items-center gap-2 pl-2 pr-1 py-2 min-w-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelectMode) toggleSelection(task.id!);
                            else openDetail(task);
                          }}
                        >
                           {sortType === 'order' && <GripVertical size={16} className="text-black/20 shrink-0 cursor-grab active:cursor-grabbing" />}
                           <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-sm shrink-0 border border-amber-100">
                             {task.icon}
                           </div>
                           <div className="flex flex-col min-w-0">
                             <span className={`font-bold text-[#333333] text-[15px] truncate leading-tight ${isDone ? 'line-through text-black/30' : ''}`}>
                               {task.name}
                             </span>
                             {task.targetTotal ? (
                               <span className={`text-[10px] font-black uppercase tracking-widest leading-none mt-0.5 ${isDone ? 'text-black/30' : 'text-amber-600'}`}>
                                 {totalVal} / {task.targetTotal} Total
                               </span>
                             ) : (
                               <span className={`text-[10px] font-black uppercase tracking-widest leading-none mt-0.5 ${isDone ? 'text-black/30' : 'text-amber-600'}`}>
                                 Mission
                               </span>
                             )}
                           </div>
                        </div>
                        
                        <div className="flex items-center px-1 shrink-0">
                           {weekDays.map(date => {
                             const dateStr = format(date, 'yyyy-MM-dd');
                             const isActive = checkIsActive(task, date);
                             const val = records[`${task.id}-${dateStr}`]?.value || 0;
                             
                             return (
                               <div key={dateStr} className="w-14 h-[60px] flex items-center justify-center">
                                  {!isActive ? (
                                    <div className="w-2 h-2 rounded-full border-2 border-black/10" />
                                  ) : task.type === 'yesno' ? (
                                    <button 
                                      className={`w-6 h-6 flex items-center justify-center rounded-sm transition-colors ${val > 0 ? 'bg-[#333333]' : 'bg-gray-100'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (task.id) handleCellTap(task.id, dateStr, false);
                                      }}
                                    >
                                      {val > 0 && <Check size={14} className="text-white" />}
                                    </button>
                                  ) : (
                                    <button 
                                      className={`px-3 py-1 font-black text-sm rounded-md transition-colors ${val > 0 ? 'bg-[#333333] text-white' : 'bg-gray-100 text-black/60'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (task.id) handleCellTap(task.id, dateStr, true);
                                      }}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        if (task.id) setCustomInputCell({ habitId: task.id, dateStr, currentValue: val });
                                      }}
                                    >
                                      {val > 0 ? val : '+'}
                                    </button>
                                  )}
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    </LongPressItem>
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>

          <Reorder.Group axis="y" values={habitsList} onReorder={handleReorderHabits}>
            {habitsList.map(habit => {
             const todayProg = calculateProgress(habit, format(today, 'yyyy-MM-dd'));
             const isExpanded = expandedHabits[habit.id!] || false;
             const isSelected = selectedIds.has(habit.id!);
             
              return (
                <Reorder.Item key={habit.id} value={habit} className="border-b border-black/5 relative bg-white truncate">
                  <div className={`flex flex-col transition-all ${isSelected ? 'bg-yellow-50' : ''} ${habit.isPaused ? 'opacity-40 grayscale' : ''}`}>
                    <LongPressItem 
                      onLongPress={() => habit.id && handleLongPress(habit.id)}
                      onClick={() => {
                        if (isSelectMode) toggleSelection(habit.id!);
                        else if (habit.type === 'combination') toggleExpand(habit.id!);
                        else openDetail(habit);
                      }}
                    >
                      <div className="flex items-center min-h-[60px] cursor-pointer">
                        {/* Left Info block (Tap name/icon to open detail page) */}
                        <div 
                          className="flex-1 flex items-center gap-2 pl-2 pr-1 py-2 min-w-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelectMode) toggleSelection(habit.id!);
                            else openDetail(habit);
                          }}
                        >
                           {sortType === 'order' && <GripVertical size={16} className="text-black/20 shrink-0 cursor-grab active:cursor-grabbing" />}
                           <ProgressRing 
                             progress={todayProg} 
                             size={24} 
                             icon={habit.icon} 
                           />
                           <div className="flex flex-col min-w-0">
                             <span className={`font-bold text-[#333333] text-[15px] truncate leading-tight ${todayProg >= 100 ? 'text-black/30' : ''}`}>
                               {habit.name}
                             </span>
                           </div>
                        </div>
                        
                        {/* Right side days cells */}
                        <div className="flex items-center px-1 shrink-0">
                           {weekDays.map(date => {
                             const dateStr = format(date, 'yyyy-MM-dd');
                             const isActive = checkIsActive(habit, date);
                             const prog = calculateProgress(habit, dateStr);
                             const val = records[`${habit.id}-${dateStr}`]?.value || 0;
                             
                             return (
                               <div key={dateStr} className="w-14 h-[60px] flex items-center justify-center">
                                  {!isActive ? (
                                    <div className="w-2 h-2 rounded-full border-2 border-black/10" />
                                  ) : habit.type === 'combination' ? (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isSelectMode) toggleSelection(habit.id!);
                                        else toggleExpand(habit.id!);
                                      }}
                                      className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-black/5 active:bg-black/10 rounded-lg border border-black/15 cursor-pointer focus:outline-none text-[12px] font-bold text-black/60 tracking-tighter"
                                    >
                                      {Math.round(prog)}%
                                    </button>
                                  ) : (
                                    <HabitCell 
                                      type={habit.type}
                                      value={val}
                                      isDone={prog >= 100}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (habit.id) handleCellTap(habit.id, dateStr, habit.type === 'measurable');
                                      }}
                                      onLongPress={() => {
                                        if (habit.id && habit.type === 'measurable') {
                                          setCustomInputCell({ habitId: habit.id, dateStr, currentValue: val });
                                        }
                                      }}
                                    />
                                  )}
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    </LongPressItem>

                    {/* Sub-habits rendered outside LongPressItem wrapper to completely prevent click/tap propagation issues */}
                    {habit.type === 'combination' && isExpanded && (
                      <div className="bg-gray-50/50 pl-14 pr-4 py-2 space-y-1">
                        {habit.subHabits?.map((sub, sIdx) => {
                          const isPaused = sub.isPaused;
                          return (
                            <div key={sIdx} className={`flex items-center justify-between py-1 ${isPaused ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                              <div 
                                className="flex-1 flex items-center gap-2 px-2 py-1 min-w-0 cursor-pointer hover:bg-black/5 active:bg-black/10 rounded-lg transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetail(habit, sIdx);
                                }}
                            >
                              <span className="text-xl bg-black/5 w-8 h-8 flex items-center justify-center rounded-lg">{sub.icon || '🔹'}</span>
                              <div className="min-w-0">
                                <span className={`font-black text-[13px] tracking-tight text-[#333333] truncate block ${isPaused ? 'opacity-50 line-through' : ''}`}>
                                  {sub.name}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {weekDays.map(date => {
                                const dStr = format(date, 'yyyy-MM-dd');
                                const val = records[`${habit.id}-sub-${sIdx}-${dStr}`]?.value || 0;
                                const isDone = sub.type === 'measurable' ? (sub.target ? (val / sub.target)*100 >= 100 : val > 0) : val > 0;
                                return (
                                  <div key={dStr} className="w-14 flex justify-center">
                                    <div className={isPaused ? 'opacity-50 pointer-events-none' : ''}>
                                      <HabitCell
                                        type={sub.type}
                                        value={val}
                                        isDone={isDone}
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          if (!isPaused && habit.id) {
                                            handleSubHabitTap(habit.id, sIdx, dStr, sub.type === 'measurable'); 
                                          }
                                        }}
                                        onLongPress={() => {
                                          if (habit.id && sub.type === 'measurable') {
                                            setCustomInputCell({ habitId: habit.id, dateStr: `sub-${sIdx}-${dStr}`, currentValue: val });
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>
      </div>

      <AnimatePresence>
        {selectedDetail && (
          <HabitDetailOverlay 
            habit={selectedDetail.habit} 
            subIdx={selectedDetail.subIdx}
            records={records}
            onClose={() => { setSelectedDetail(null); fetchHabits(); }} 
            onEdit={() => { 
              const h = selectedDetail.habit;
              setSelectedDetail(null);
              toggleAddModal(true, h); 
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(showAdd || editingHabit) && (
          <HabitForm 
            initialHabit={editingHabit || undefined}
            initialMode={editingHabit ? undefined : initialMode}
            onClose={() => toggleAddModal(false)} 
            onSave={async (h) => { await habitSave(h); toggleAddModal(false); fetchHabits(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSelector && (
          <div className="fixed inset-0 z-[200000] flex items-center justify-center p-6 bg-black/40">
            <div className="absolute inset-0" onClick={() => toggleSelector(false)} />
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
                       onClick={() => {
                         setInitialMode('habit');
                         window.history.replaceState({ habitAdd: true, editingHabit: null, initialMode: 'habit' }, '', '#habit-add');
                         setShowSelector(false);
                         setShowAdd(true);
                       }}
                       className="w-full flex items-center gap-4 active:bg-gray-100 p-1 rounded-sm text-left"
                     >
                       <div className="w-10 h-10 bg-gray-600 rounded-sm flex items-center justify-center">
                          <CalendarIcon size={24} className="text-white" strokeWidth={2} />
                       </div>
                       <span className="text-2xl font-bold text-black">Habit</span>
                     </button>
      
                     <button 
                       onClick={() => {
                         setInitialMode('task');
                         window.history.replaceState({ habitAdd: true, editingHabit: null, initialMode: 'task' }, '', '#habit-add');
                         setShowSelector(false);
                         setShowAdd(true);
                       }}
                       className="w-full flex items-center gap-4 active:bg-gray-100 p-1 rounded-sm text-left"
                     >
                       <div className="w-10 h-10 bg-gray-600 rounded-sm flex items-center justify-center">
                          <Plus size={24} className="text-white" strokeWidth={3} />
                       </div>
                       <span className="text-2xl font-bold text-black">Task</span>
                     </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {false && (
          <div className="fixed inset-0 z-[150] flex items-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => {}} className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="w-full bg-white rounded-t-3xl p-6 shadow-2xl relative z-10 space-y-1">
              <div className="flex justify-between items-center mb-4 px-2">
                 <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Habit Options</h3>
                 <button onClick={() => {}} className="p-2"><X size={20}/></button>
              </div>
              <MenuAction icon={<Plus size={20}/>} label="Edit Habit" onClick={() => { 
                const h = habits.find(h => h.id === null);
                if (h) toggleAddModal(true, h); 
              }} />
              <MenuAction icon={<X size={20}/>} label="Archive Habit" onClick={() => { alert('Habit archived'); }} />
              <MenuAction icon={<Trash2 size={20}/>} label="Delete Habit" isDamage onClick={() => { alert('Habit deleted'); }} />
              <MenuAction icon={<ListFilter size={20}/>} label="Reset Progress" onClick={() => { alert('Progress reset'); }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {customInputCell && (
          <div className="fixed inset-0 z-[300000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setCustomInputCell(null)} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl relative z-10 space-y-4"
            >
              <h3 className="text-xs font-black text-black/40 uppercase tracking-[0.2em] ml-1">Custom Value</h3>
              <input 
                type="number" 
                className="w-full bg-[#f5f5f5] rounded-2xl px-4 py-3.5 text-xl font-bold text-black outline-none border border-black/5"
                autoFocus
                value={customInputCell.currentValue}
                onChange={(e) => setCustomInputCell({ ...customInputCell, currentValue: Number(e.target.value) })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomInputSave();
                  }
                }}
              />
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  onClick={() => setCustomInputCell(null)} 
                  className="px-4 py-2.5 text-xs font-black text-black/50 hover:bg-black/5 rounded-xl uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCustomInputSave} 
                  className="px-5 py-2.5 text-xs font-black bg-black text-white rounded-xl uppercase tracking-wider active:scale-[0.98] transition-all"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
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

const HabitDetailOverlay: React.FC<{ habit: Habit, subIdx?: number, records: Record<string, HabitRecord>, onClose: () => void, onEdit: () => void }> = ({ habit, subIdx, records, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState<'week' | 'month'>('week');
  
  const sub = subIdx !== undefined ? habit.subHabits?.[subIdx] : undefined;
  const title = sub ? sub.name : habit.name;
  const isPaused = sub ? sub.isPaused : habit.isPaused;
  const target = sub ? (sub.type === 'measurable' ? sub.target : undefined) : habit.target;
  const type = sub ? sub.type : habit.type;

  // Calculate Stats
  const habitRecords = Object.values(records) as HabitRecord[];
  const relevantRecords = habitRecords.filter(r => {
    if (r.habitId !== habit.id) return false;
    if (subIdx !== undefined) return r.habitDate.includes(`sub-${subIdx}-`);
    // Main habit records should not have 'sub-' in the ID part if we want just parent.
    // However, relevantRecords is just used for totals/streaks.
    return !r.habitDate.includes('sub-');
  });

  const totalValue = relevantRecords.reduce((acc, r) => acc + r.value, 0);
  const totalProgress = (!sub && habit.targetTotal) ? Math.round(Math.min(totalValue / habit.targetTotal, 1) * 100) : 0;
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const thisMonthCount = relevantRecords.filter(r => r.habitDate.includes(currentMonth)).length;
  
  // Generate Chart Data
  const last30Days = Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), 29-i), 'yyyy-MM-dd'));
  const scoreData = last30Days.map(date => {
    const key = subIdx !== undefined ? `${habit.id}-sub-${subIdx}-${date}` : `${habit.id}-${date}`;
    const rec = records[key];
    return {
      date: format(new Date(date), 'dd MMM'),
      score: rec ? (target ? Math.min((rec.value / target) * 100, 100) : 100) : 0
    };
  });

  const historyData = last30Days.slice(-7).map(date => {
    const key = subIdx !== undefined ? `${habit.id}-sub-${subIdx}-${date}` : `${habit.id}-${date}`;
    const rec = records[key];
    return {
      date: format(new Date(date), 'EEE'),
      val: rec ? (type === 'measurable' ? rec.value : 1) : 0
    };
  });

  return createPortal(
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 bg-white z-[200000] flex flex-col">
       <div className="h-16 bg-[#333333] text-white flex items-center justify-between px-4 shrink-0 shadow-lg relative z-10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h2 className="font-black text-lg tracking-tight uppercase truncate max-w-[200px]">{title}</h2>
          </div>
          <div className="flex items-center gap-1">
             <button 
               onClick={async () => {
                 const { habitSave } = await import('../lib/db');
                 if (sub && subIdx !== undefined) {
                   const updatedSubHabits = [...(habit.subHabits || [])];
                   updatedSubHabits[subIdx] = { ...sub, isPaused: !sub.isPaused };
                   await habitSave({ ...habit, subHabits: updatedSubHabits });
                 } else {
                   await habitSave({ ...habit, isPaused: !habit.isPaused });
                 }
                 onClose();
               }}
               className="p-2 rounded-full hover:bg-white/10"
               title={isPaused ? "Resume" : "Pause"}
             >
               {isPaused ? <Play size={20}/> : <Pause size={20}/>}
             </button>
             <button onClick={onEdit} className="p-2 rounded-full hover:bg-white/10"><Pencil size={20}/></button>
             <button 
               onClick={async () => {
                 const { habitDelete } = await import('../lib/db');
                 if (habit.id) await habitDelete(habit.id);
                 onClose();
               }} 
               className="p-2 rounded-full hover:bg-white/10 text-red-300"
             >
               <Trash2 size={20}/>
             </button>
             <button className="p-2 rounded-full hover:bg-white/10"><MoreVertical size={20}/></button>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="bg-white border-b border-gray-100 p-4 pt-2">
             <div className="flex items-center gap-6 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                <div className="flex items-center gap-1.5">
                   <CalendarIcon size={12} className="text-teal-600" />
                   <span>Every day</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <Bell size={12} className="text-teal-600" />
                   <span>Off</span>
                </div>
             </div>
          </div>

          <div className="p-6 space-y-8">
             {habit.habitMode === 'task' && habit.targetTotal && (
               <section className="bg-black text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
                 <div className="relative z-10">
                   <div className="flex justify-between items-end mb-4">
                     <div>
                       <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Quota Progress</h3>
                       <div className="text-4xl font-black">{totalProgress}%</div>
                     </div>
                     <div className="text-right">
                       <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Status</div>
                       <div className="text-sm font-black uppercase tracking-widest text-amber-400">
                         {totalProgress >= 100 ? 'COMPLETED' : 'IN PROGRESS'}
                       </div>
                     </div>
                   </div>
                   <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${totalProgress}%` }} 
                        className="h-full bg-amber-500 rounded-full"
                     />
                   </div>
                   <div className="flex justify-between mt-3 text-[10px] font-black uppercase tracking-widest">
                     <span className="opacity-40">{totalValue} / {habit.targetTotal} UNITS</span>
                     {habit.deadline && (
                        <span className="text-blue-400">
                           {Math.ceil((new Date(habit.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} DAYS REMAINING
                        </span>
                     )}
                   </div>
                   
                   {totalValue > 0 && totalProgress < 100 && (
                     <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-40">Est. Completion</div>
                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                           {format(subDays(new Date(), -Math.ceil((habit.targetTotal - totalValue) / (totalValue / Math.max(1, (Date.now() - habit.createdAt)/(1000*60*60*24))))), 'dd MMM yyyy')}
                        </div>
                     </div>
                   )}
                 </div>
                 {/* Decorative background circle */}
                 <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
               </section>
             )}

             {/* Overview Stats */}
             <section>
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Overview</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                   <StatCard icon={<div className="w-8 h-8 rounded-full border-2 border-teal-500/20 flex items-center justify-center"><div className="w-4 h-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" /></div>} label="Daily" value={`${relevantRecords.length}d`} />
                   <StatCard icon={null} label="Score" value={totalProgress > 0 ? `${totalProgress}%` : '---'} />
                   <StatCard icon={null} label="Mo/Avg" value={relevantRecords.length > 0 ? (totalValue/relevantRecords.length).toFixed(1) : '0'} />
                   <StatCard icon={null} label="Total" value={totalValue.toString()} />
                </div>
             </section>

             {/* Score Chart */}
             <section>
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Score</h3>
                   <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button onClick={() => setActiveTab('week')} className={`px-4 py-1 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'week' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>Week</button>
                      <button onClick={() => setActiveTab('month')} className={`px-4 py-1 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'month' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>Month</button>
                   </div>
                </div>
                <div className="h-64 w-full bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                         <XAxis dataKey="date" tick={{fontSize: 9, fontWeight: 900, fill: '#9CA3AF'}} stroke="none" hide={activeTab === 'month'} />
                         <YAxis 
                            domain={[0, 100]} 
                            tick={{fontSize: 9, fontWeight: 900, fill: '#9CA3AF'}} 
                            axisLine={false} 
                            tickLine={false}
                            formatContent={(v) => `${v}%`}
                         />
                         <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900, fontSize: '10px' }}
                         />
                         <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      </LineChart>
                   </ResponsiveContainer>
                </div>
             </section>

             {/* History Chart */}
             <section>
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">History</h3>
                </div>
                <div className="h-64 w-full bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historyData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                         <XAxis dataKey="date" tick={{fontSize: 9, fontWeight: 900, fill: '#9CA3AF'}} stroke="none" />
                         <YAxis hide />
                         <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 900, fontSize: '10px' }}
                         />
                         <Bar dataKey="val" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={16} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </section>
          </div>
       </div>
    </motion.div>,
    document.body
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, isTrend?: boolean }> = ({ icon, label, value, isTrend }) => (
  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
     {icon ? icon : <div className="h-2" />}
     <div className="mt-2 text-base font-black text-gray-900 leading-none">{value}</div>
     <div className="mt-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</div>
  </div>
);

const ProgressRing: React.FC<{ progress: number, size?: number, icon?: string, isTask?: boolean }> = ({ progress, size = 28, icon, isTask }) => {
  const radius = (size / 2) - 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      {icon && <span className="absolute text-[16px] z-0 opacity-80">{icon}</span>}
      <svg className="transform -rotate-90 relative z-10" width={size} height={size}>
        <circle className="text-gray-100" strokeWidth="2.5" stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
        <motion.circle
          className="transition-all duration-300" strokeWidth="2.5" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
          strokeLinecap="round" stroke={isTask ? "#F59E0B" : "#2196F3"} fill="transparent" r={radius} cx={size / 2} cy={size / 2}
        />
      </svg>
    </div>
  );
};

const HabitCell: React.FC<{ 
  type: 'yesno' | 'measurable' | 'combination', 
  value: number, 
  isDone: boolean, 
  onClick: (e: React.MouseEvent) => void,
  onLongPress?: () => void 
}> = ({ type, value, isDone, onClick, onLongPress }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const isMoved = useRef(false);

  const start = (e: React.PointerEvent) => {
    e.stopPropagation();
    isMoved.current = false;
    isLongPressActive.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };

    if (onLongPress) {
      timerRef.current = setTimeout(() => {
        if (!isMoved.current) {
          isLongPressActive.current = true;
          onLongPress();
        }
      }, 750);
    }
  };

  const stop = (e?: React.PointerEvent) => {
    if (e) e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (isMoved.current) return;
    const dist = Math.sqrt(
      Math.pow(e.clientX - startPos.current.x, 2) + 
      Math.pow(e.clientY - startPos.current.y, 2)
    );
    if (dist > 10) {
      isMoved.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLongPressActive.current) {
      e.preventDefault();
      // Reset for next time
      isLongPressActive.current = false;
      return;
    }
    // Only call onClick if it wasn't a long press
    if (!isLongPressActive.current) {
      onClick(e);
    }
  };

  return (
    <button 
      onPointerDown={start}
      onPointerUp={stop}
      onPointerMove={handleMove}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={handleClick}
      className="w-12 h-12 flex items-center justify-center transition-colors hover:bg-black/5 active:bg-black/10 rounded-lg text-[#333333] cursor-pointer focus:outline-none touch-manipulation"
    >
      {type === 'yesno' ? (
        isDone ? (
          <Check size={30} strokeWidth={4.5} className="text-[#333333]" />
        ) : (
          <X size={24} strokeWidth={3} className="text-black/20" />
        )
      ) : (
        <span className="text-xl tabular-nums tracking-tighter" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
          {value}
        </span>
      )}
    </button>
  );
};

const SubHabitForm: React.FC<{ initialSub?: SubHabit, onClose: () => void, onSave: (s: SubHabit) => void }> = ({ initialSub, onClose, onSave }) => {
  const [name, setName] = useState(initialSub?.name || '');
  const [question, setQuestion] = useState(initialSub?.question || '');
  const [type, setType] = useState<'yesno' | 'measurable'>(initialSub?.type || 'yesno');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom_days' | 'specific_dates'>(initialSub?.frequency || 'daily');
  const [selectedDays, setSelectedDays] = useState<number[]>(initialSub?.selectedDays || [1,3,5]);
  const [target, setTarget] = useState(initialSub?.target || 15);
  const [targetType, setTargetType] = useState<'at_least' | 'at_most' | 'exactly'>(initialSub?.targetType || 'at_least');
  const [unit, setUnit] = useState(initialSub?.unit || '');
  const [notes, setNotes] = useState(initialSub?.notes || '');
  const [icon, setIcon] = useState(initialSub?.icon || COMMON_ICONS[0]);

  const [showIconSelector, setShowIconSelector] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);

  return createPortal(
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-0 z-[250000] flex flex-col h-[100dvh] bg-[#f0f2f5] text-gray-900 border-l shadow-2xl">
      <div className="h-14 flex items-center justify-between px-2 shrink-0 bg-white text-black shadow-sm">
        <div className="flex items-center">
          <button onClick={onClose} className="p-3 active:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h2 className="font-semibold text-lg ml-2">{initialSub ? 'Edit routine habit' : 'Create routine habit'}</h2>
        </div>
        <button 
          onClick={() => {
            if (!name.trim()) return;
            onSave({
              id: initialSub?.id || Math.random().toString(36).substr(2, 9),
              name, question, type, frequency, 
              selectedDays: frequency === 'custom_days' ? selectedDays : undefined,
              target: type === 'measurable' ? target : undefined,
              targetType, unit, notes, icon, 
              color: initialSub?.color || '#2196F3',
              isPaused: initialSub?.isPaused || false,
              createdAt: initialSub?.createdAt || Date.now()
            });
          }}
          disabled={!name.trim()}
          className={`mr-2 px-4 py-2 font-bold text-sm tracking-widest text-blue-600 rounded ${!name.trim() ? 'opacity-50 cursor-not-allowed' : 'active:bg-blue-50'} border border-transparent`}
        >
          SAVE
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        <div className="flex gap-4 items-start">
          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
            <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Name</label>
            <input autoFocus className="w-full mt-2 text-lg font-bold text-black outline-none placeholder:text-gray-400" placeholder="e.g. Exercise" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div onClick={() => setShowIconSelector(!showIconSelector)} className="w-[84px] h-[64px] bg-white rounded-lg border border-gray-200 shadow-sm relative flex items-center justify-center cursor-pointer active:bg-gray-50 shrink-0">
            <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Icon</label>
            <div className="text-3xl mt-1">{icon}</div>
          </div>
        </div>
        {showIconSelector && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-lg z-10 animate-in fade-in zoom-in-95">
            <div className="flex flex-wrap gap-3 max-h-48 overflow-y-auto">
              {COMMON_ICONS.map((emoji) => (
                <button key={emoji} onClick={() => { setIcon(emoji); setShowIconSelector(false); }} className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-transform active:scale-90 ${icon === emoji ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}>{emoji}</button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
           <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Question</label>
           <input className="w-full mt-2 text-lg font-bold text-black outline-none placeholder:text-gray-400" placeholder="e.g. Did you exercise today?" value={question} onChange={e => setQuestion(e.target.value)} />
        </div>

        <div className="flex gap-4">
          <div className="flex-[2] bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
             <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Type</label>
             <CustomDropdown 
               value={type} 
               onChange={(val) => setType(val)} 
               options={[
                 { label: 'Tick (yes/no)', value: 'yesno' },
                 { label: 'Measurable', value: 'measurable' }
               ]} 
             />
          </div>

          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
            <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Frequency</label>
            <CustomDropdown 
              value={frequency} 
              onChange={(val) => setFrequency(val)} 
              options={[
                { label: 'Every day', value: 'daily' },
                { label: 'Weekly', value: 'weekly' },
                { label: 'Custom days', value: 'custom_days' }
              ]} 
            />
          </div>
        </div>

        {frequency === 'custom_days' && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm relative">
             <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Active Days</label>
             <div className="flex flex-wrap gap-1 pt-2 justify-between">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, index) => {
                   const isSelected = selectedDays.includes(index);
                   return (
                     <button 
                       key={index}
                       onClick={() => {
                         if (isSelected) setSelectedDays(selectedDays.filter(day => day !== index));
                         else setSelectedDays([...selectedDays, index].sort());
                       }}
                       className={`w-8 h-8 rounded-full font-bold text-xs transition-all focus:outline-none ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                     >
                       {d}
                     </button>
                   );
                })}
             </div>
          </div>
        )}

        {type === 'measurable' && (
          <div className="flex gap-4">
            <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
              <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Target</label>
              <input type="number" className="w-full mt-2 text-lg font-bold text-black outline-none placeholder:text-gray-400" placeholder="e.g. 15" value={target} onChange={e => setTarget(Number(e.target.value))} />
            </div>
            <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
              <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Unit</label>
              <input className="w-full mt-2 text-lg font-bold text-black outline-none placeholder:text-gray-400" placeholder="e.g. miles" value={unit} onChange={e => setUnit(e.target.value)} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
          <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Notes</label>
          <textarea className="w-full mt-2 text-lg font-bold text-black outline-none placeholder:text-gray-400 resize-none" placeholder="(Optional)" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>


      </div>
    </motion.div>,
    document.body
  );
};

const CustomDropdown: React.FC<{
  value: string;
  onChange: (val: any) => void;
  options: { label: string, value: string }[];
}> = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full">
      <div 
        className="w-full mt-2 text-lg font-bold text-black flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{options.find(o => o.value === value)?.label || value}</span>
        <ChevronDown size={20} className="text-gray-400 shrink-0" />
      </div>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-xl border border-gray-100 shadow-2xl z-[100] py-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95">
             {options.map(o => (
               <div 
                 key={o.value}
                 className={`px-4 py-3 mx-2 rounded-lg text-base font-bold cursor-pointer flex items-center justify-between transition-colors ${value === o.value ? 'text-blue-600 bg-blue-50' : 'text-gray-800 hover:bg-gray-50 active:bg-gray-100'}`}
                 onClick={() => { onChange(o.value); setIsOpen(false); }}
               >
                 <span>{o.label}</span>
                 {value === o.value && <Check size={18} className="text-blue-600" />}
               </div>
             ))}
          </div>
        </>
      )}
    </div>
  );
};

const HabitForm: React.FC<{ initialHabit?: Habit, initialMode?: 'habit' | 'task', onClose: () => void, onSave: (h: Habit) => void }> = ({ initialHabit, initialMode, onClose, onSave }) => {
  const [name, setName] = useState(initialHabit?.name || '');
  const [question, setQuestion] = useState(initialHabit?.question || '');
  const [habitMode, setHabitMode] = useState<'habit' | 'task'>(initialHabit?.habitMode || initialMode || 'habit');
  const [type, setType] = useState<'yesno' | 'measurable' | 'combination'>(initialHabit?.type || 'yesno');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom_days' | 'specific_dates'>(initialHabit?.frequency || 'daily');
  const [selectedDays, setSelectedDays] = useState<number[]>(initialHabit?.selectedDays || [1,3,5]); // Default Mon, Wed, Fri if custom
  const [specificDates, setSpecificDates] = useState<string[]>(initialHabit?.specificDates || []);
  const [target, setTarget] = useState(initialHabit?.target || 15);
  const [targetTotal, setTargetTotal] = useState(initialHabit?.targetTotal || 10);
  const [targetType, setTargetType] = useState<'at_least' | 'at_most' | 'exactly'>(initialHabit?.targetType || 'at_least');
  const [startDate, setStartDate] = useState(initialHabit?.startDate || format(new Date(), 'yyyy-MM-dd'));
  const [deadline, setDeadline] = useState(initialHabit?.deadline || '');
  const [hasDailyLimit, setHasDailyLimit] = useState(initialHabit?.target !== undefined);
  const [unit, setUnit] = useState(initialHabit?.unit || '');
  const [notes, setNotes] = useState(initialHabit?.notes || '');
  const [reminder, setReminder] = useState(initialHabit?.reminder || 'Off');
  const [icon, setIcon] = useState(initialHabit?.icon || COMMON_ICONS[0]);
  const [subHabits, setSubHabits] = useState<SubHabit[]>(() => {
    const subs = initialHabit?.subHabits || [];
    return subs.map(s => ({
      ...s,
      id: s.id || Math.random().toString(36).substr(2, 9),
      icon: s.icon || COMMON_ICONS[0],
      color: s.color || '#2196F3',
      createdAt: s.createdAt || Date.now()
    }));
  });
  const [isPaused, setIsPaused] = useState(initialHabit?.isPaused || false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubType, setNewSubType] = useState<'yesno' | 'measurable'>('yesno');
  const [newSubTarget, setNewSubTarget] = useState(1);
  const [newSubUnit, setNewSubUnit] = useState('');
  
  const [editingSubHabitIdx, setEditingSubHabitIdx] = useState<number | null>(null);

  const [showIconSelector, setShowIconSelector] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);

  // Handlers
  const addSubHabit = () => {
    if (!newSubName.trim()) return;
    const newSub: SubHabit = { 
      name: newSubName.trim(), 
      type: newSubType, 
      isPaused: false,
      target: newSubType === 'measurable' ? Number(newSubTarget) : undefined,
      unit: newSubType === 'measurable' ? newSubUnit : undefined,
      id: Math.random().toString(36).substr(2, 9),
      icon: COMMON_ICONS[0],
      color: '#2196F3',
      createdAt: Date.now()
    };
    setSubHabits(prev => [...prev, newSub]);
    setNewSubName('');
    setNewSubTarget(1);
    setNewSubUnit('');
  };

  const toggleSubPause = (index: number) => {
    const updated = [...subHabits];
    updated[index] = { ...updated[index], isPaused: !updated[index].isPaused };
    setSubHabits(updated);
  };

  return createPortal(
    <motion.div 
      initial={{ y: '100%' }} 
      animate={{ y: 0 }} 
      exit={{ y: '100%' }} 
      className="fixed inset-0 z-[200000] flex flex-col h-[100dvh] bg-[#f0f2f5] text-gray-900"
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-2 shrink-0 bg-[#1976d2] text-white shadow-md">
        <div className="flex items-center">
          <button onClick={onClose} className="p-3 active:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="font-semibold text-lg ml-2">
            {initialHabit ? `Edit ${habitMode === 'task' ? 'task' : 'habit'}` : `Create ${habitMode === 'task' ? 'task' : 'habit'}`}
          </h2>
        </div>
        <button 
          onClick={() => {
            if (!name.trim()) return;
            onSave({
              ...initialHabit,
              name, 
              icon, 
              type, 
              habitMode,
              frequency,
              selectedDays: frequency === 'custom_days' ? selectedDays : undefined,
              specificDates: frequency === 'specific_dates' ? specificDates : undefined,
              target: habitMode === 'task' ? (hasDailyLimit ? target : undefined) : target, 
              targetTotal: habitMode === 'task' ? targetTotal : undefined,
              startDate: habitMode === 'task' ? startDate : undefined,
              deadline: habitMode === 'task' ? deadline : undefined,
              unit, 
              color: '#1976d2', 
              order: initialHabit?.order || Date.now(), 
              archived: initialHabit?.archived || false, 
              isPaused,
              createdAt: initialHabit?.createdAt || Date.now(), 
              subHabits: type === 'combination' ? subHabits : undefined
            });
          }}
          disabled={!name.trim()}
          className={`mr-2 px-4 py-2 font-bold text-sm tracking-widest rounded ${!name.trim() ? 'opacity-50 cursor-not-allowed' : 'active:bg-white/10'} border border-transparent`}
        >
          SAVE
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        
        {habitMode === 'task' ? (
          <>
            <div className="flex gap-4 items-start">
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
                <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Task Name</label>
                <input 
                  autoFocus 
                  className="w-full mt-2 text-lg font-bold text-black outline-none placeholder:text-gray-400"
                  placeholder="e.g. Renew Passport"
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
              <div 
                onClick={() => setShowIconSelector(!showIconSelector)}
                className="w-[84px] h-[64px] bg-white rounded-lg border border-gray-200 shadow-sm relative flex items-center justify-center cursor-pointer active:bg-gray-50 shrink-0"
              >
                <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Icon</label>
                <div className="text-3xl mt-1">{icon}</div>
              </div>
            </div>

            {showIconSelector && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-lg z-10 animate-in fade-in zoom-in-95">
                <div className="flex flex-wrap gap-3 max-h-48 overflow-y-auto">
                  {COMMON_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { setIcon(emoji); setShowIconSelector(false); }}
                      className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-transform active:scale-90 ${icon === emoji ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
               <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Task Type</label>
               <CustomDropdown 
                 value={type} 
                 onChange={(val) => setType(val)} 
                 options={[
                   { label: 'One-Off (Tick check)', value: 'yesno' },
                   { label: 'Shared pool over time (Number based)', value: 'measurable' }
                 ]} 
               />
            </div>

            {type === 'measurable' && (
              <div className="bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
                <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Total Pool Required</label>
                <input 
                  type="number"
                  className="w-full mt-2 text-lg font-bold text-black outline-none placeholder:text-gray-400"
                  placeholder="e.g. 10 (times, hours, etc.)"
                  value={targetTotal || ''} 
                  onChange={e => setTargetTotal(Number(e.target.value) || 0)} 
                />
              </div>
            )}

            {type === 'measurable' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative flex flex-col gap-3">
                 <div className="flex justify-between items-center">
                   <label className="font-bold text-sm text-black">Has Daily Limit?</label>
                   <button 
                     className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors ${hasDailyLimit ? 'bg-blue-500' : 'bg-gray-200'}`}
                     onClick={() => setHasDailyLimit(!hasDailyLimit)}
                   >
                     <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-sm transform ${hasDailyLimit ? 'translate-x-5' : 'translate-x-0'}`} />
                   </button>
                 </div>
                 {hasDailyLimit && (
                   <div className="pt-2 border-t border-gray-100 flex flex-col pt-3">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Max Per Day</label>
                      <input 
                        type="number"
                        className="w-full text-lg font-bold text-black outline-none placeholder:text-gray-400"
                        placeholder="e.g. 5"
                        value={target || ''} 
                        onChange={e => setTarget(Number(e.target.value) || 0)} 
                      />
                   </div>
                 )}
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
                <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Start Date</label>
                <input 
                  type="date"
                  className="w-full mt-2 text-base font-bold text-black outline-none bg-transparent"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setFrequency('daily');
                  }}
                />
              </div>
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
                <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">End Date (Optional)</label>
                <input 
                  type="date"
                  className="w-full mt-2 text-base font-bold text-black outline-none bg-transparent"
                  value={deadline}
                  onChange={e => {
                    setDeadline(e.target.value);
                    setFrequency('daily');
                  }}
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 px-1 leading-snug">
              Tasks appear in the tracker daily between the Start and End date. Measuring options apply across these active days.
            </div>
          </>
        ) : (
          <>
        {/* Name and Icon Row */}
        <div className="flex gap-4 items-start">
          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
            <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Name</label>
            <input 
              autoFocus 
              className="w-full mt-2 text-lg font-bold text-black outline-none placeholder:text-gray-400"
              placeholder="e.g. Exercise"
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div 
            onClick={() => setShowIconSelector(!showIconSelector)}
            className="w-[84px] h-[64px] bg-white rounded-lg border border-gray-200 shadow-sm relative flex items-center justify-center cursor-pointer active:bg-gray-50 shrink-0"
          >
            <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Color</label>
            <div className="text-3xl mt-1">{icon}</div>
          </div>
        </div>

        {/* Icon selector dropdown */}
        {showIconSelector && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-lg z-10 animate-in fade-in zoom-in-95">
            <div className="flex flex-wrap gap-3 max-h-48 overflow-y-auto">
              {COMMON_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { setIcon(emoji); setShowIconSelector(false); }}
                  className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-transform active:scale-90 ${icon === emoji ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
           <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Question</label>
           <input 
             className="w-full mt-2 text-lg font-bold text-black outline-none placeholder:text-gray-400"
             placeholder="e.g. Did you exercise today?"
             value={question} 
             onChange={e => setQuestion(e.target.value)} 
           />
        </div>

        {/* Type selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
           <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Type</label>
           <CustomDropdown 
             value={type} 
             onChange={(val) => setType(val)} 
             options={[
               { label: 'Tick (yes/no)', value: 'yesno' },
               { label: 'Measurable', value: 'measurable' },
               { label: 'Routine (Combo)', value: 'combination' }
             ]} 
           />
        </div>

        {/* Measurable Unit */}
        {type === 'measurable' && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
            <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Unit</label>
            <input 
              className="w-full mt-2 text-lg font-bold text-black outline-none placeholder:text-gray-400"
              placeholder="e.g. miles"
              value={unit} 
              onChange={e => setUnit(e.target.value)} 
            />
          </div>
        )}

        {/* Combination sub-habits */}
        {type === 'combination' && (
           <div className="bg-white rounded-lg border border-gray-200 p-4 pt-4 shadow-sm relative space-y-4">
              <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Sub Habits</label>
              
              <div className="space-y-2 mt-2">
                {subHabits.map((sh, idx) => (
                  <div key={sh.id || idx} className={`flex flex-col p-3 rounded-lg border border-gray-200 bg-gray-50 ${sh.isPaused ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                       <div>
                         <div className="font-bold">{sh.name}</div>
                         <div className="text-xs text-gray-500 capitalize">{sh.type} {sh.type === 'measurable' && `- ${sh.target} ${sh.unit || ''}`}</div>
                       </div>
                       <div className="flex items-center gap-2">
                         <button onClick={() => setEditingSubHabitIdx(idx)} className="p-2 bg-white rounded shadow-sm hover:bg-gray-100">
                           <Pencil size={16} />
                         </button>
                         <button onClick={() => toggleSubPause(idx)} className="p-2 bg-white rounded shadow-sm hover:bg-gray-100">
                           {sh.isPaused ? <Play size={16} /> : <Pause size={16} />}
                         </button>
                         <button onClick={() => setSubHabits(subHabits.filter((_, i) => i !== idx))} className="p-2 bg-white text-red-500 rounded shadow-sm hover:bg-red-50">
                           <Trash2 size={16} />
                         </button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 mt-2 space-y-3">
                 <button onClick={() => setEditingSubHabitIdx(subHabits.length)} className="w-full bg-[#1976d2] text-white rounded py-3 font-bold tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all">
                   <Plus size={18} />
                   ADD ROUTINE HABIT
                 </button>
              </div>
           </div>
        )}

        {/* Edit SubHabit Modal overlay */}
        <AnimatePresence>
          {editingSubHabitIdx !== null && (
            <SubHabitForm 
              initialSub={subHabits[editingSubHabitIdx]} 
              onClose={() => setEditingSubHabitIdx(null)} 
              onSave={(savedSub) => {
                const newSubs = [...subHabits];
                newSubs[editingSubHabitIdx] = savedSub;
                setSubHabits(newSubs);
                setEditingSubHabitIdx(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Target and Frequency Row */}
        <div className="flex gap-4">
          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
            <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Frequency</label>
            <CustomDropdown 
              value={frequency} 
              onChange={(val) => setFrequency(val)} 
              options={[
                { label: 'Every day', value: 'daily' },
                { label: 'Weekly', value: 'weekly' },
                { label: 'Custom days', value: 'custom_days' }
              ]} 
            />
          </div>
        </div>

        {frequency === 'custom_days' && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm relative">
             <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Active Days</label>
             <div className="flex flex-wrap gap-2 pt-2 justify-between">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, index) => {
                   const isSelected = selectedDays.includes(index);
                   return (
                     <button 
                       key={index}
                       onClick={() => {
                         if (isSelected) setSelectedDays(selectedDays.filter(day => day !== index));
                         else setSelectedDays([...selectedDays, index].sort());
                       }}
                       className={`w-9 h-9 rounded-full font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                     >
                       {d}
                     </button>
                   );
                })}
             </div>
          </div>
        )}

        {/* Target Type & Reminder */}
        <div className="space-y-4">
           {type === 'measurable' && (
             <div className="bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
                <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Target Type</label>
                <CustomDropdown 
                  value={targetType} 
                  onChange={(val) => setTargetType(val)} 
                  options={[
                    { label: 'At least', value: 'at_least' },
                    { label: 'At most', value: 'at_most' },
                    { label: 'Exactly', value: 'exactly' }
                  ]} 
                />
             </div>
           )}

           <div className="bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
              <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Reminder</label>
              <CustomDropdown 
                value={reminder} 
                onChange={(val) => setReminder(val)} 
                options={[
                  { label: 'Off', value: 'Off' },
                  { label: '09:00 AM', value: '09:00' },
                  { label: '12:00 PM', value: '12:00' },
                  { label: '06:00 PM', value: '18:00' },
                  { label: '09:00 PM', value: '21:00' }
                ]} 
              />
           </div>

           <div className="bg-white rounded-lg border border-gray-200 p-3 pt-2 shadow-sm relative">
             <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Notes</label>
             <textarea 
               className="w-full mt-2 text-lg font-bold text-black outline-none placeholder:text-gray-400 resize-none"
               placeholder="(Optional)"
               rows={2}
               value={notes} 
               onChange={e => setNotes(e.target.value)} 
             />
           </div>
        </div>
        </>
        )}
      </div>
    </motion.div>,
    document.body
  );
};

// Helper for long press detection
const LongPressItem: React.FC<{ children: React.ReactNode, onLongPress: () => void, onClick: () => void }> = ({ children, onLongPress, onClick }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const isMoved = useRef(false);

  const start = (e: React.PointerEvent) => {
    isMoved.current = false;
    isLongPressActive.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };

    timerRef.current = setTimeout(() => {
      if (!isMoved.current) {
        onLongPress();
        isLongPressActive.current = true;
      }
    }, 750);
  };

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (isMoved.current) return;
    const dist = Math.sqrt(
      Math.pow(e.clientX - startPos.current.x, 2) + 
      Math.pow(e.clientY - startPos.current.y, 2)
    );
    if (dist > 10) {
      isMoved.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressActive.current || isMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActive.current = false;
      return;
    }
    onClick();
  };

  return (
    <div 
      onPointerDown={start}
      onPointerUp={stop}
      onPointerMove={handleMove}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => {
        if (isLongPressActive.current || timerRef.current) {
          e.preventDefault();
        }
      }}
      onClick={handleClick}
      className="select-none touch-manipulation touch-pan-y"
    >
      {children}
    </div>
  );
};

export default HabitsTab;
