import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Wallet, ShoppingCart, Tag, IndianRupee, ChevronDown, Check, X, Search, Calendar, Scale, Store, ArrowLeft, ArrowRight, ChevronRight, Package, List, MoreVertical } from 'lucide-react';
import { format, isSameMonth, subMonths } from 'date-fns';
import { Expense, ExpenseInstance } from '../types';
import { expenseInstanceGetAll, expensesForInstance, expenseInstanceSave, expenseSave, expenseDelete, expenseInstanceDelete, expenseGetAll } from '../lib/db';
import { CATEGORIES, CATEGORY_ICONS, SHOPS, WEIGHT_PRESETS } from '../constants';

import { useApp } from '../AppContext';

interface ExpensesTabProps {}

const ExpensesTab: React.FC<ExpensesTabProps> = () => {
  const { triggerAdd, sortType } = useApp();
  const [instances, setInstances] = useState<ExpenseInstance[]>([]);
  const [expandedInstance, setExpandedInstance] = useState<number | null>(null);
  const [instanceItems, setInstanceItems] = useState<Record<number, Expense[]>>({});
  
  const [showAddOuting, setShowAddOuting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDate, setViewDate] = useState(new Date());

  // Selection
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (hash === '#expense-add' || hash === '#expense-add-item') {
        setShowAddOuting(true);
        setIsSelectMode(false);
        setExpandedInstance(null);
      } else if (hash.startsWith('#expense-view-')) {
        const idStr = hash.replace('#expense-view-', '');
        setExpandedInstance(parseInt(idStr, 10) || null);
        setShowAddOuting(false);
        setIsSelectMode(false);
      } else if (hash === '#expense-select') {
        setIsSelectMode(true);
        setShowAddOuting(false);
        setExpandedInstance(null);
      } else {
        setShowAddOuting(false);
        setIsSelectMode(false);
        setExpandedInstance(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleAddOuting = (open: boolean) => {
    if (open) {
      if (window.location.hash !== '#expense-add') {
        window.history.pushState({ expenseAdd: true }, '', '#expense-add');
      }
      setShowAddOuting(true);
    } else {
      setShowAddOuting(false);
      if (window.location.hash === '#expense-add' || window.location.hash === '#expense-add-item') {
        window.history.back();
      }
    }
  };

  const toggleSelectMode = (open: boolean) => {
    if (open) {
      if (window.location.hash !== '#expense-select') {
        window.history.pushState({ expenseSelect: true }, '', '#expense-select');
      }
      setIsSelectMode(true);
    } else {
      if (isSelectMode) {
        setIsSelectMode(false);
        if (window.location.hash === '#expense-select') {
          window.history.back();
        }
      }
    }
  };

  const toggleInstanceExpand = (id: number | null) => {
    if (id !== null) {
      if (window.location.hash !== `#expense-view-${id}`) {
        window.history.pushState({ expenseInstance: id }, '', `#expense-view-${id}`);
      }
      setExpandedInstance(id);
    } else {
      if (expandedInstance !== null) {
        setExpandedInstance(null);
        if (window.location.hash.startsWith('#expense-view-')) {
          window.history.back();
        }
      }
    }
  };

  useEffect(() => {
    if (triggerAdd > 0) toggleAddOuting(true);
  }, [triggerAdd]);

  const fetchAll = async () => {
    const data = await expenseInstanceGetAll();
    let sorted = data.filter(i => !i.deleted);
    if (sortType === 'alphabetical') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sortType === 'created') sorted.sort((a, b) => b.createdAt - a.createdAt);
    else sorted.sort((a, b) => b.date.localeCompare(a.date));
    setInstances(sorted);
  };

  useEffect(() => { fetchAll(); }, [sortType]);

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
    toggleSelectMode(true);
    setSelectedIds(new Set([id]));
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await expenseInstanceDelete(id);
    }
    setSelectedIds(new Set());
    toggleSelectMode(false);
    fetchAll();
  };

  const selectAll = () => {
    if (selectedIds.size === instances.length) {
      setSelectedIds(new Set());
      toggleSelectMode(false);
    } else {
      setSelectedIds(new Set(instances.map(n => n.id!)));
    }
  };

  const loadItems = async (instanceId: number, force = false) => {
    if (!force && instanceItems[instanceId]) return;
    const items = await expensesForInstance(instanceId);
    setInstanceItems(prev => ({ ...prev, [instanceId]: items }));
  };

  const toggleInstance = (id: number) => {
    if (isSelectMode) {
      toggleSelection(id);
      return;
    }
    if (expandedInstance === id) toggleInstanceExpand(null);
    else {
      toggleInstanceExpand(id);
      loadItems(id);
    }
  };

  const filteredInstances = instances.filter(i => {
    const matchesMonth = isSameMonth(new Date(i.date), viewDate);
    return matchesMonth;
  });

  const totalThisMonth = filteredInstances.reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] touch-pan-y overflow-hidden">
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
              <button onClick={() => toggleSelectMode(false)} className="p-3 active:bg-black/10 touch-manipulation cursor-pointer">
                <X size={32} className="text-[#333333]" strokeWidth={3} />
              </button>
              <span className="font-black text-2xl flex-1 text-[#333333] ml-2">
                 {selectedIds.size}/{instances.length}
              </span>
              <button onClick={selectAll} className="p-3 active:bg-black/10">
                <div className="w-8 h-8 border-4 border-[#999999] border-dashed rounded-[2px]" />
              </button>
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
                onClick={handleDeleteSelected}
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

      {/* Month Navigation */}
      <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-gray-200">
        <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ArrowLeft size={18} className="text-zinc-400" /></button>
        <span className="font-black text-zinc-800 uppercase tracking-[0.2em] text-[10px]">{format(viewDate, 'MMMM yyyy')}</span>
        <button onClick={() => setViewDate(subMonths(viewDate, -1))} className="p-2 hover:bg-zinc-50 rounded-full transition-colors"><ArrowRight size={18} className="text-zinc-400" /></button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden touch-pan-y p-4 space-y-4">
        {/* Analytics Card */}
        <div className="bg-[#333333] text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Monthly Expenditure</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black tracking-tighter">₹{totalThisMonth.toLocaleString()}</span>
            <div className="flex gap-4 text-[10px] font-black text-white/50 uppercase tracking-widest">
              <div className="flex flex-col items-center">
                <span className="text-xl text-[#FBC02D]">{filteredInstances.length}</span>
                <span className="opacity-60">Trips</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 text-white/5"><ShoppingCart size={100} /></div>
        </div>

        {/* Expenses List by Outings */}
        <div className="space-y-4 pb-24">
          {filteredInstances.map(instance => {
            const isSelected = selectedIds.has(instance.id!);
            return (
              <div 
                key={instance.id} 
                className={`bg-white rounded-3xl border transition-all ${isSelected ? 'border-[#FBC02D] bg-yellow-50 shadow-inner' : 'border-black/5 shadow-sm overflow-hidden'}`}
                onContextMenu={(e) => { e.preventDefault(); instance.id && handleLongPress(instance.id); }}
              >
                <div 
                  className={`p-5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform ${expandedInstance === instance.id ? 'bg-zinc-50/50' : ''}`}
                  onClick={() => instance.id && toggleInstance(instance.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isSelected ? 'bg-[#FBC02D] text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                      {isSelected ? <Check size={24} strokeWidth={4} /> : <ShoppingCart size={24} />}
                    </div>
                    <div>
                      <h5 className="font-black text-zinc-800 text-sm uppercase tracking-tight">{instance.name || 'Outing'}</h5>
                      <div className="flex gap-2 items-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                        <span>{format(new Date(instance.date), 'MMM do')}</span>
                        <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                        <span className="truncate max-w-[120px]">{instance.shop || 'Various Shops'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                       <span className="font-black text-zinc-900">₹{instance.total.toFixed(0)}</span>
                       {!isSelectMode && (expandedInstance === instance.id ? <ChevronDown size={18} className="text-zinc-400" /> : <ChevronRight size={18} className="text-zinc-400" />)}
                    </div>
                  </div>
                </div>

                {expandedInstance === instance.id && !isSelectMode && (
                  <div className="px-5 pb-5 border-t border-gray-100/50">
                     <div className="mt-4 space-y-2">
                        {instanceItems[instance.id!]?.map(item => (
                          <div key={item.id} className="flex items-center justify-between py-2.5 group hover:px-2 transition-all hover:bg-zinc-50 rounded-xl">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center text-lg">{CATEGORY_ICONS[item.category] || '📦'}</div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-zinc-700">{item.item}</span>
                                  <span className="text-[9px] font-black text-zinc-300 uppercase tracking-tighter">
                                    {item.subcategory} {item.weight_label !== 'Other' ? `• ${item.weight_label}` : ''}
                                    {item.quantity && item.quantity > 1 ? ` • ${item.quantity} units` : ''}
                                    {item.comments && ` • ${item.comments}`}
                                  </span>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-zinc-800">₹{item.price}</span>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (item.id) {
                                      expenseDelete(item.id).then(() => {
                                        fetchAll();
                                        loadItems(instance.id!, true);
                                      });
                                    }
                                  }} 
                                  className="text-zinc-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={14}/>
                                </button>
                             </div>
                          </div>
                        ))}
                        {!instanceItems[instance.id!] && <div className="py-8 text-center text-[10px] uppercase font-black text-zinc-200 tracking-widest animate-pulse">Scanning Receipt...</div>}
                     </div>
                     <div className="mt-4 pt-4 border-t border-dotted border-zinc-200 flex justify-between">
                        <button 
                          onClick={() => {
                            instance.id && expenseInstanceDelete(instance.id).then(fetchAll);
                          }}
                          className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] flex items-center gap-1.5 hover:text-red-500 transition-colors"
                        >
                           <Trash2 size={12}/> Delete Outing
                        </button>
                     </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredInstances.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300 opacity-50">
              <Package size={64} className="mb-2" />
              <p className="font-bold text-sm tracking-widest uppercase">No Outings This Month</p>
            </div>
          )}
      </div>

      {showAddOuting && (
        <AddOutingOverlay 
          onClose={() => toggleAddOuting(false)} 
          onSave={() => { fetchAll(); toggleAddOuting(false); }}
        />
      )}
    </div>
  );
};

const MenuAction: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, isDamage?: boolean }> = ({ icon, label, onClick, isDamage }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-gray-50 transition-colors ${isDamage ? 'text-red-500' : 'text-zinc-700'}`}>
     <div className={`${isDamage ? 'text-red-500/40' : 'text-zinc-400'}`}>{icon}</div>
     <span className="font-bold text-sm uppercase tracking-tight">{label}</span>
  </button>
);

const AddOutingOverlay: React.FC<{ onClose: () => void, onSave: () => void }> = ({ onClose, onSave }) => {
  const [outing, setOuting] = useState({ name: '', date: format(new Date(), 'yyyy-MM-dd'), shop: '' });
  const [items, setItems] = useState<Partial<Expense>[]>([]);
  const [allShops, setAllShops] = useState<string[]>([]);
  const [showShopSuggestions, setShowShopSuggestions] = useState(false);
  
  // Modal toggle state
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (hash === '#expense-add') {
        setShowAddItemModal(false);
      } else if (hash === '#expense-add-item') {
        setShowAddItemModal(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleAddItemModal = (open: boolean) => {
    if (open) {
      if (window.location.hash !== '#expense-add-item') {
        window.history.pushState({ expenseAddItem: true }, '', '#expense-add-item');
      }
      setShowAddItemModal(true);
    } else {
      setShowAddItemModal(false);
      if (window.location.hash === '#expense-add-item') {
        window.history.back();
      }
    }
  };

  // Auto-complete cache lists
  const [savedItemNames, setSavedItemNames] = useState<string[]>([]);
  const [savedItemDetails, setSavedItemDetails] = useState<Record<string, { category: string, subcategory: string }>>({});
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);

  // Measurement custom states
  const [measureType, setMeasureType] = useState<'quantity' | 'weight' | 'litres'>('quantity');
  const [weightPreset, setWeightPreset] = useState<string>('1 kg'); 
  const [customWeightVal, setCustomWeightVal] = useState<string>('');
  const [litrePreset, setLitrePreset] = useState<string>('1 L');
  const [customLitreVal, setCustomLitreVal] = useState<string>('');

  // Dropdown toggles
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);
  const [showMeasureTypeDropdown, setShowMeasureTypeDropdown] = useState(false);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  const [curItem, setCurItem] = useState<Partial<Expense>>({
    item: '', price: undefined, quantity: 1, category: 'Food', subcategory: 'Fresh', weight_label: '1 kg', weight_kg: 1.0, shop: '', comments: ''
  });

  useEffect(() => {
    // Unique shops
    expenseInstanceGetAll().then(instances => {
      const uniqueShops = Array.from(new Set(instances.map(i => i.shop || '').filter(s => s)));
      setAllShops(uniqueShops);
    });

    // Saved item names and past categories/subcategories helper
    expenseGetAll().then(allExpenses => {
      const uniqueNames = Array.from(new Set(allExpenses.map(e => e.item.trim()).filter(Boolean)));
      setSavedItemNames(uniqueNames);

      const details: Record<string, { category: string, subcategory: string }> = {};
      allExpenses.forEach(e => {
        if (e.item && e.category) {
          details[e.item.trim().toLowerCase()] = { category: e.category, subcategory: e.subcategory };
        }
      });
      setSavedItemDetails(details);
    });
  }, []);

  const addItem = () => {
    if (!curItem.item || !curItem.price) return;
    
    // Construct final measurement parameters based on chosen type
    let finalQty = curItem.quantity || 1;
    let finalWeightLabel = 'Other';
    let finalWeightKg = 0;

    if (measureType === 'quantity') {
      finalQty = curItem.quantity || 1;
      finalWeightLabel = 'Other';
      finalWeightKg = 0;
    } else if (measureType === 'weight') {
      finalQty = 1;
      if (weightPreset === 'Custom') {
        const customWeight = parseFloat(customWeightVal) || 0;
        finalWeightLabel = `${customWeight} kg`;
        finalWeightKg = customWeight;
      } else {
        finalWeightLabel = weightPreset;
        if (weightPreset === '1/4 kg') finalWeightKg = 0.25;
        else if (weightPreset === '1/2 kg') finalWeightKg = 0.5;
        else if (weightPreset === '3/4 kg') finalWeightKg = 0.75;
        else finalWeightKg = 1.0;
      }
    } else if (measureType === 'litres') {
      finalQty = 1;
      if (litrePreset === 'Custom') {
        const customLitre = parseFloat(customLitreVal) || 0;
        finalWeightLabel = `${customLitre} L`;
        finalWeightKg = customLitre;
      } else {
        finalWeightLabel = litrePreset;
        if (litrePreset === '1/4 L') finalWeightKg = 0.25;
        else if (litrePreset === '1/2 L') finalWeightKg = 0.5;
        else if (litrePreset === '3/4 L') finalWeightKg = 0.75;
        else finalWeightKg = 1.0;
      }
    }

    const completedItem: Partial<Expense> = {
      ...curItem,
      quantity: finalQty,
      weight_label: finalWeightLabel,
      weight_kg: finalWeightKg,
      shop: outing.shop || 'Unknown',
      date: outing.date,
      createdAt: Date.now()
    };

    setItems([...items, completedItem]);
    
    // Reset state and close modal
    setCurItem({
      item: '', price: undefined, quantity: 1, category: 'Food', subcategory: 'Fresh', weight_label: '1 kg', weight_kg: 1.0, shop: '', comments: ''
    });
    setMeasureType('quantity');
    setWeightPreset('1 kg');
    setCustomWeightVal('');
    setLitrePreset('1 L');
    setCustomLitreVal('');
    toggleAddItemModal(false);
  };

  const handleFinalSave = async () => {
    if (items.length === 0) return;
    const total = items.reduce((sum, i) => sum + (i.price || 0), 0);
    const instanceId = await expenseInstanceSave({ 
      name: outing.name || `${items.length} Items`, 
      date: outing.date, 
      shop: outing.shop, 
      total, 
      createdAt: Date.now() 
    });

    for (const item of items) {
      const itemToSave = { ...item, instanceId };
      delete itemToSave.id;
      await expenseSave(itemToSave as Expense);
    }
    onSave();
  };

  const shopSuggestions = allShops.filter(s => s.toLowerCase().includes(outing.shop.toLowerCase()));

  // Filter dynamic item autocomplete suggestions
  const suggestions = savedItemNames.filter(name => 
    name.toLowerCase().includes((curItem.item || '').toLowerCase()) && 
    name.toLowerCase() !== (curItem.item || '').toLowerCase()
  ).slice(0, 5);

  return createPortal(
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 bg-[#f0f2f5] z-[200000] flex flex-col text-gray-900">
       {/* Outing Header */}
       <div className="h-14 flex items-center justify-between px-2 shrink-0 bg-[#7C3AED] text-white shadow-md z-20">
          <div className="flex items-center">
            <button type="button" onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={24}/></button>
            <h2 className="font-semibold text-lg ml-2">New Expense Trip</h2>
          </div>
          <button 
            type="button" 
            onClick={handleFinalSave} 
            disabled={items.length === 0} 
            className={`mr-2 px-4 py-2 font-bold text-sm tracking-widest rounded transition-colors ${items.length > 0 ? 'text-white hover:bg-white/10 border border-white' : 'opacity-50 text-white/50 cursor-not-allowed border border-transparent'}`}
          >
            SAVE
          </button>
       </div>

       {/* Outer Form Content */}
       <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-28 relative">
          {/* Section 1: Trip Metadata */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm relative space-y-4">
             <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Trip Name/Target</label>
                <input 
                  className="w-full mt-2 text-lg font-bold text-black outline-none bg-transparent placeholder:text-gray-400" 
                  placeholder="e.g. Weekly Groceries" value={outing.name} onChange={e => setOuting({...outing, name: e.target.value})}
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                  <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Date</label>
                  <input type="date" className="w-full mt-2 text-lg font-bold text-black outline-none bg-transparent" value={outing.date} onChange={e => setOuting({...outing, date: e.target.value})} />
                </div>
                <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                  <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Primary Shop</label>
                  <input 
                    className="w-full mt-2 text-lg font-bold text-black outline-none bg-transparent placeholder:text-gray-400" 
                    placeholder="Shop Name" 
                    value={outing.shop} 
                    onChange={e => { setOuting({...outing, shop: e.target.value}); setShowShopSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowShopSuggestions(false), 200)}
                  />
                  {showShopSuggestions && shopSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-lg z-50 border border-gray-100 py-1.5 mt-1 overflow-hidden">
                       {shopSuggestions.slice(0, 5).map(s => (
                          <button key={s} type="button" onClick={() => setOuting({...outing, shop: s})} className="w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-gray-50">{s}</button>
                       ))}
                    </div>
                  )}
                </div>
             </div>
          </div>

          {/* Section 2: Items List */}
          <div className="space-y-4">
             <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{items.length > 0 ? `Items (${items.length})` : 'Products'}</h3>
                {items.length > 0 && (
                  <span className="text-sm font-bold text-[#7C3AED]">Total: ₹{items.reduce((s, i) => s + (i.price || 0), 0)}</span>
                )}
             </div>

             {items.length === 0 ? (
               <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><List size={22}/></div>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-700 text-sm">Receipt is empty</p>
                    <p className="text-xs font-medium text-gray-400">Add individual items to your trip</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => toggleAddItemModal(true)}
                    className="px-5 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all flex items-center gap-2 text-white"
                  >
                     <Plus size={18} strokeWidth={2.5}/> Add Product
                  </button>
               </div>
             ) : (
               <div className="space-y-2">
                  {items.map((item, idx) => (
                    <motion.div 
                      initial={{ scale: 0.98, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }}
                      key={idx} 
                      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between"
                    >
                       <div className="flex items-center gap-3">
                          <span className="text-2xl w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 border border-gray-100">{CATEGORY_ICONS[item.category!] || '📦'}</span>
                          <div className="flex flex-col">
                             <span className="text-sm font-bold text-gray-900">{item.item}</span>
                             <span className="text-xs font-semibold text-gray-500 mt-0.5">
                               {item.subcategory} 
                               {item.weight_label && item.weight_label !== 'Other' && ` • ${item.weight_label}`} 
                               {item.quantity && item.quantity > 1 && ` • ${item.quantity} units`}
                               {item.comments && ` • "${item.comments}"`}
                             </span>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-gray-900">₹{item.price}</span>
                          <button onClick={() => setItems(items.filter((_, itemIdx) => itemIdx !== idx))} className="text-red-400 hover:text-red-500 p-1.5 transition-colors"><X size={18} strokeWidth={2.5}/></button>
                       </div>
                    </motion.div>
                  ))}
                  
                  {/* Inline Add Button for quick access */}
                  <button 
                    type="button"
                    onClick={() => toggleAddItemModal(true)}
                    className="w-full py-4 bg-white hover:bg-gray-50 text-[#7C3AED] rounded-lg text-sm font-bold border border-dashed border-gray-300 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  >
                    <Plus size={18} strokeWidth={2.5}/> Add Another Product
                  </button>
               </div>
             )}
          </div>
       </div>

       {/* Persistent floating add button at right corner of page */}
       <div className="fixed bottom-6 right-6 z-40">
          <button 
            type="button"
            onClick={() => toggleAddItemModal(true)}
            className="w-14 h-14 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            title="Add Product"
          >
             <Plus size={28} strokeWidth={2.5}/>
          </button>
       </div>

       {/* Centered Cream Floating Modal */}
       <AnimatePresence>
          {showAddItemModal && (
            <div className="fixed inset-0 z-[250000] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => toggleAddItemModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              />
              
              {/* Standard Clean Dialog Card */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="w-full max-w-sm bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] relative z-10 animate-in zoom-in-95 duration-200"
              >
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white text-gray-900">
                   <h3 className="font-bold text-lg">Add Product</h3>
                   <button 
                     type="button"
                     onClick={() => toggleAddItemModal(false)}
                     className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                   >
                     <X size={20} strokeWidth={2.5} />
                   </button>
                </div>

                {/* Modal Scroll Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar" style={{ overscrollBehavior: 'contain' }}>
                   {/* Row 1: Item Name (with dynamic past names auto-suggestions) */}
                   <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                      <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Item Name</label>
                      <div className="relative">
                        <input 
                          autoFocus
                          type="text"
                          className="w-full mt-2 text-lg font-bold text-black outline-none bg-transparent placeholder:text-gray-400" 
                          placeholder="e.g. Apples" 
                          value={curItem.item} 
                          onChange={e => {
                            const val = e.target.value;
                            setCurItem({...curItem, item: val});
                            setShowItemSuggestions(true);
                          }}
                          onFocus={() => setShowItemSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowItemSuggestions(false), 200)}
                        />
                        {showItemSuggestions && suggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-lg mt-1 z-[260000] shadow-2xl overflow-hidden animate-in fade-in duration-100">
                             {suggestions.map(name => (
                               <button 
                                 key={name} 
                                 type="button"
                                 onClick={() => {
                                   const valLower = name.trim().toLowerCase();
                                   const pastDetail = savedItemDetails[valLower];
                                   setCurItem({
                                     ...curItem,
                                     item: name,
                                     category: pastDetail?.category || curItem.category,
                                     subcategory: pastDetail?.subcategory || curItem.subcategory
                                   });
                                   setShowItemSuggestions(false);
                                 }} 
                                 className="w-full text-left px-4 py-3 text-sm font-bold text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-between"
                               >
                                 <span>{name}</span>
                                 {savedItemDetails[name.toLowerCase()] && (
                                   <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                                     <span>{CATEGORY_ICONS[savedItemDetails[name.toLowerCase()].category] || '📦'}</span> 
                                     <span>{savedItemDetails[name.toLowerCase()].category}</span>
                                   </span>
                                 )}
                               </button>
                             ))}
                          </div>
                        )}
                      </div>
                   </div>

                   {/* Row 2: Price field */}
                   <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                      <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Price (₹)</label>
                      <input 
                        type="number" 
                        className="w-full mt-2 text-lg font-bold text-black outline-none bg-transparent placeholder:text-gray-400 font-mono" 
                        placeholder="Price in Rupees" 
                        value={curItem.price !== undefined ? curItem.price : ''} 
                        onChange={e => setCurItem({...curItem, price: e.target.value !== '' ? Number(e.target.value) : undefined})}
                      />
                   </div>

                   {/* Row 3: Measurement Selector Dropdown */}
                   <div className="grid grid-cols-2 gap-4">
                      {/* Metric Category */}
                      <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                         <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Metric Type</label>
                         <button 
                           type="button"
                           onClick={() => {
                             setShowMeasureTypeDropdown(!showMeasureTypeDropdown);
                             setShowPresetDropdown(false);
                             setShowCategoryDropdown(false);
                             setShowSubcategoryDropdown(false);
                           }}
                           className="w-full mt-2 flex items-center justify-between bg-transparent text-lg font-bold text-black outline-none"
                         >
                           <span className="flex items-center gap-1">
                             {measureType === 'quantity' ? '📦 Pieces' : measureType === 'weight' ? '⚖️ Weight' : '🥤 Litres'}
                           </span>
                           <ChevronDown size={18} className="text-gray-400" />
                         </button>
                         {showMeasureTypeDropdown && (
                           <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-lg mt-1 z-[260000] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
                             {(['quantity', 'weight', 'litres'] as const).map(type => (
                               <button
                                 key={type}
                                 type="button"
                                 onClick={() => {
                                   setMeasureType(type);
                                   setShowMeasureTypeDropdown(false);
                                   if (type === 'quantity') {
                                     setCurItem(prev => ({ ...prev, quantity: 1 }));
                                   } else if (type === 'weight') {
                                     setWeightPreset('1 kg');
                                     setCustomWeightVal('');
                                   } else {
                                     setLitrePreset('1 L');
                                     setCustomLitreVal('');
                                   }
                                 }}
                                 className="w-full text-left px-4 py-3 text-sm font-bold text-gray-900 hover:bg-gray-50 flex items-center gap-2 transition-colors border-b border-gray-100 last:border-0"
                               >
                                 <span>{type === 'quantity' ? '📦 Pieces' : type === 'weight' ? '⚖️ Weight' : '🥤 Litres'}</span>
                               </button>
                             ))}
                           </div>
                         )}
                      </div>

                      {/* Chosen Metric Details Dropdown/Input */}
                      <div className="relative">
                         {measureType === 'weight' && (
                           <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                             <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Weight Option</label>
                             <button 
                               type="button"
                               onClick={() => {
                                 setShowPresetDropdown(!showPresetDropdown);
                                 setShowMeasureTypeDropdown(false);
                                 setShowCategoryDropdown(false);
                                 setShowSubcategoryDropdown(false);
                               }}
                               className="w-full mt-2 flex items-center justify-between bg-transparent text-lg font-bold text-black outline-none"
                             >
                               <span>{weightPreset}</span>
                               <ChevronDown size={18} className="text-gray-400" />
                             </button>
                             {showPresetDropdown && (
                               <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-lg mt-1 z-[260000] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
                                 {['1/4 kg', '1/2 kg', '3/4 kg', '1 kg', 'Custom'].map(preset => (
                                   <button
                                     key={preset}
                                     type="button"
                                     onClick={() => {
                                       setWeightPreset(preset);
                                       setShowPresetDropdown(false);
                                     }}
                                     className="w-full text-left px-4 py-3 text-sm font-bold text-gray-900 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                                   >
                                     {preset}
                                   </button>
                                 ))}
                               </div>
                             )}
                           </div>
                         )}

                         {measureType === 'litres' && (
                           <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                             <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Litre Option</label>
                             <button 
                               type="button"
                               onClick={() => {
                                 setShowPresetDropdown(!showPresetDropdown);
                                 setShowMeasureTypeDropdown(false);
                                 setShowCategoryDropdown(false);
                                 setShowSubcategoryDropdown(false);
                               }}
                               className="w-full mt-2 flex items-center justify-between bg-transparent text-lg font-bold text-black outline-none"
                             >
                               <span>{litrePreset}</span>
                               <ChevronDown size={18} className="text-gray-400" />
                             </button>
                             {showPresetDropdown && (
                               <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-lg mt-1 z-[260000] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
                                 {['1/4 L', '1/2 L', '3/4 L', '1 L', 'Custom'].map(preset => (
                                   <button
                                     key={preset}
                                     type="button"
                                     onClick={() => {
                                       setLitrePreset(preset);
                                       setShowPresetDropdown(false);
                                     }}
                                     className="w-full text-left px-4 py-3 text-sm font-bold text-gray-900 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                                   >
                                     {preset}
                                   </button>
                                 ))}
                               </div>
                             )}
                           </div>
                         )}

                         {measureType === 'quantity' && (
                           <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                             <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Units Qty</label>
                             <input 
                               type="number"
                               className="w-full mt-2 text-lg font-bold text-black outline-none bg-transparent placeholder:text-gray-400"
                               placeholder="Quantity (pcs)"
                               value={curItem.quantity || ''}
                               onChange={e => setCurItem({...curItem, quantity: e.target.value !== '' ? Number(e.target.value) : undefined})}
                             />
                           </div>
                         )}
                      </div>
                   </div>

                   {/* Row 4: Custom fields if custom weight/litres is active */}
                   {measureType === 'weight' && weightPreset === 'Custom' && (
                     <div className="relative border border-gray-200 rounded-lg p-3 pt-2 animate-in fade-in slide-in-from-top-3 duration-200">
                        <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Custom Weight (kg)</label>
                        <input 
                          type="number"
                          step="any"
                          className="w-full mt-2 text-lg font-bold text-black outline-none bg-transparent placeholder:text-gray-400 font-mono"
                          placeholder="e.g. 1.25"
                          value={customWeightVal}
                          onChange={e => setCustomWeightVal(e.target.value)}
                        />
                     </div>
                   )}

                   {measureType === 'litres' && litrePreset === 'Custom' && (
                     <div className="relative border border-gray-200 rounded-lg p-3 pt-2 animate-in fade-in slide-in-from-top-3 duration-200">
                        <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Custom Litres (L)</label>
                        <input 
                          type="number"
                          step="any"
                          className="w-full mt-2 text-lg font-bold text-black outline-none bg-transparent placeholder:text-gray-400 font-mono"
                          placeholder="e.g. 1.5"
                          value={customLitreVal}
                          onChange={e => setCustomLitreVal(e.target.value)}
                        />
                     </div>
                   )}

                   {/* Row 5: Cream Category Dropdown & Subcategory Selector Drawer */}
                   <div className="grid grid-cols-2 gap-4">
                      {/* Major Category select */}
                      <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                         <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Main Type</label>
                         <button 
                           type="button"
                           onClick={() => {
                             setShowCategoryDropdown(!showCategoryDropdown);
                             setShowSubcategoryDropdown(false);
                             setShowMeasureTypeDropdown(false);
                             setShowPresetDropdown(false);
                           }}
                           className="w-full mt-2 flex items-center justify-between bg-transparent text-lg font-bold text-black outline-none"
                         >
                           <span className="flex items-center gap-1.5 truncate">
                             <span>{CATEGORY_ICONS[curItem.category!] || '📦'}</span>
                             <span>{curItem.category}</span>
                           </span>
                           <ChevronDown size={18} className="text-gray-400" />
                         </button>
                         {showCategoryDropdown && (
                           <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-lg mt-1 z-[260000] shadow-2xl max-h-60 overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-100">
                             {Object.keys(CATEGORIES).map(cat => (
                               <button
                                 key={cat}
                                 type="button"
                                 onClick={() => {
                                   setCurItem({
                                     ...curItem,
                                     category: cat,
                                     subcategory: CATEGORIES[cat][0]
                                   });
                                   setShowCategoryDropdown(false);
                                 }}
                                 className="w-full text-left px-4 py-3 text-sm font-bold text-gray-900 hover:bg-gray-50 flex items-center gap-2 transition-colors border-b border-gray-100 last:border-0"
                               >
                                 <span className="text-sm shrink-0">{CATEGORY_ICONS[cat]}</span>
                                 <span>{cat}</span>
                               </button>
                             ))}
                           </div>
                         )}
                      </div>

                      {/* Sub-category select dropdown */}
                      <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                         <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Sub-Type</label>
                         <button 
                           type="button"
                           onClick={() => {
                             setShowSubcategoryDropdown(!showSubcategoryDropdown);
                             setShowCategoryDropdown(false);
                             setShowMeasureTypeDropdown(false);
                             setShowPresetDropdown(false);
                           }}
                           className="w-full mt-2 flex items-center justify-between bg-transparent text-lg font-bold text-black outline-none"
                         >
                           <span className="truncate">{curItem.subcategory}</span>
                           <ChevronDown size={18} className="text-gray-400" />
                         </button>
                         {showSubcategoryDropdown && (
                           <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-lg mt-1 z-[260000] shadow-2xl max-h-60 overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-100">
                             {(CATEGORIES[curItem.category!] || ["Other"]).map(subcat => (
                               <button
                                 key={subcat}
                                 type="button"
                                 onClick={() => {
                                   setCurItem({
                                     ...curItem,
                                     subcategory: subcat
                                   });
                                   setShowSubcategoryDropdown(false);
                                 }}
                                 className="w-full text-left px-4 py-3 text-sm font-bold text-gray-900 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                               >
                                 {subcat}
                               </button>
                             ))}
                           </div>
                         )}
                      </div>
                   </div>

                   {/* Row 6: Comments Input */}
                   <div className="relative border border-gray-200 rounded-lg p-3 pt-2">
                      <label className="text-xs font-bold text-black bg-white px-1 absolute -top-2 left-2">Comment / Details</label>
                      <input 
                        type="text" 
                        className="w-full mt-2 text-lg font-bold text-black outline-none bg-transparent placeholder:text-gray-400" 
                        placeholder="e.g. For kitchen cabinet repair" 
                        value={curItem.comments || ''} 
                        onChange={e => setCurItem({...curItem, comments: e.target.value})}
                      />
                   </div>
                </div>

                {/* Modal Footer Done Actions */}
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
                   <button 
                     type="button"
                     onClick={addItem} 
                     disabled={!curItem.item || curItem.price === undefined}
                     className={`w-full py-4 rounded-lg font-bold text-sm tracking-widest uppercase shadow-sm transition-all flex items-center justify-center gap-2 ${(!curItem.item || curItem.price === undefined) ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white active:scale-[0.98]'}`}
                   >
                     Done Adding <Check size={18} strokeWidth={2.5} />
                   </button>
                </div>
              </motion.div>
            </div>
          )}
       </AnimatePresence>
    </motion.div>,
    document.body
  );
};


export default ExpensesTab;
