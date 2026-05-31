import { openDB, IDBPDatabase } from 'idb';
import { Note, Expense, Habit, HabitRecord, JournalEntry, VianEvent, ExpenseInstance } from '../types';

const DB_NAME = 'vian-helper-db';
const DB_VERSION = 4;

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Notes
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
      }

      // Expenses
      if (!db.objectStoreNames.contains('expenses')) {
        const store = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date');
        store.createIndex('instanceId', 'instanceId');
      } else {
        const store = transaction.objectStore('expenses');
        if (!store.indexNames.contains('instanceId')) store.createIndex('instanceId', 'instanceId');
      }

      // Expense Instances
      if (!db.objectStoreNames.contains('expense_instances')) {
        const store = db.createObjectStore('expense_instances', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('habits')) {
        db.createObjectStore('habits', { keyPath: 'id', autoIncrement: true });
      }

      // Habit Records
      if (!db.objectStoreNames.contains('habit_records')) {
        const store = db.createObjectStore('habit_records', { keyPath: 'id', autoIncrement: true });
        store.createIndex('habitId', 'habitId');
        store.createIndex('date', 'date');
        store.createIndex('habitDate', 'habitDate', { unique: true });
      } else {
        const store = transaction.objectStore('habit_records');
        if (!store.indexNames.contains('habitId')) store.createIndex('habitId', 'habitId');
        if (!store.indexNames.contains('date')) store.createIndex('date', 'date');
        
        if (!store.indexNames.contains('habitDate')) {
          // Robust creation of unique index: 
          // We don't perform async data migrations here to keep it simple, 
          // but the unique: false would avoid the crash. 
          // However, the error says "Unable to add key to index", 
          // implying there are duplicates.
          // Let's try to create it non-unique first if we suspect data issues, 
          // or just catch the error.
          // Actually, we WANT it unique.
          try {
            store.createIndex('habitDate', 'habitDate', { unique: true });
          } catch (e) {
            console.warn('Failed to create unique habitDate index, falling back to non-unique', e);
            store.createIndex('habitDate', 'habitDate', { unique: false });
          }
        }
      }

      // Journal
      if (!db.objectStoreNames.contains('journal')) {
        const store = db.createObjectStore('journal', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date');
      }

      // Events
      if (!db.objectStoreNames.contains('events')) {
        const store = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date');
      }

      // Tags
      if (!db.objectStoreNames.contains('tags')) {
        const store = db.createObjectStore('tags', { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type');
      }
    },
  });
}

// Universal get/put
export async function dbGet(store: string, id: number) {
  const db = await getDB();
  return db.get(store, id);
}

export async function dbGetAll(store: string) {
  const db = await getDB();
  return db.getAll(store);
}

export async function dbPut(store: string, val: any) {
  const db = await getDB();
  return db.put(store, val);
}

export async function dbAdd(store: string, val: any) {
  const db = await getDB();
  return db.add(store, val);
}

export async function dbDelete(store: string, id: number) {
  const db = await getDB();
  return db.delete(store, id);
}

// Notes CRUD
export async function notesGetAll() {
  const all = (await dbGetAll('notes')) as Note[];
  return all.filter(n => !n.deleted) as Note[];
}

export async function notesGetArchived() {
  const all = await notesGetAll();
  return all.filter(n => n.archived && !n.deleted) as Note[];
}

export async function notesGetTrashed() {
  const all = (await dbGetAll('notes')) as Note[];
  return all.filter(n => n.deleted) as Note[];
}

export async function notesSave(note: Note) {
  note.modifiedAt = Date.now();
  if (!note.createdAt) note.createdAt = Date.now();
  if (note.id) {
    await dbPut('notes', note);
    return note.id;
  }
  const id = await dbAdd('notes', note);
  note.id = id as number;
  return note.id;
}

export async function notesDelete(id: number) {
  const n = await dbGet('notes', id);
  if (!n) return;
  n.deleted = true;
  n.deletedAt = Date.now();
  return dbPut('notes', n);
}

// Expenses CRUD
export async function expenseGetAll() {
  const all = (await dbGetAll('expenses')) as Expense[];
  return all.filter(e => !e.deleted) as Expense[];
}

export async function expensesForInstance(instanceId: number) {
  const db = await getDB();
  const items = (await db.getAllFromIndex('expenses', 'instanceId', instanceId)) as Expense[];
  return items.filter(e => !e.deleted) as Expense[];
}

export async function expenseSave(e: Expense) {
  if (!e.createdAt) e.createdAt = Date.now();
  if (e.id) return dbPut('expenses', e);
  return dbAdd('expenses', e);
}

export async function expenseDelete(id: number) {
  const e = await dbGet('expenses', id);
  if (!e) return;
  e.deleted = true;
  e.deletedAt = Date.now();
  await dbPut('expenses', e);
  
  // Update instance total
  if (e.instanceId) {
    const instance = await dbGet('expense_instances', e.instanceId);
    if (instance) {
      const items = await expensesForInstance(e.instanceId);
      instance.total = items.reduce((sum, item) => sum + item.price, 0);
      await dbPut('expense_instances', instance);
    }
  }
}

// Expense Instance CRUD
export async function expenseInstanceGetAll() {
  const all = (await dbGetAll('expense_instances')) as ExpenseInstance[];
  return all.filter(i => !i.deleted) as ExpenseInstance[];
}

export async function expenseInstanceSave(ei: ExpenseInstance) {
  if (!ei.createdAt) ei.createdAt = Date.now();
  if (ei.id) return dbPut('expense_instances', ei);
  return dbAdd('expense_instances', ei);
}

export async function expenseInstanceDelete(id: number) {
  const ei = await dbGet('expense_instances', id);
  if (!ei) return;
  ei.deleted = true;
  ei.deletedAt = Date.now();
  
  // Also soft-delete all items in this outing
  const db = await getDB();
  const items = await db.getAllFromIndex('expenses', 'instanceId', id);
  for (const item of items) {
    if (item.id) {
      item.deleted = true;
      item.deletedAt = Date.now();
      await dbPut('expenses', item);
    }
  }
  
  return dbPut('expense_instances', ei);
}

// Habits CRUD
export async function habitsGetAll() {
  const all = (await dbGetAll('habits')) as Habit[];
  return all.filter(h => !h.deleted) as Habit[];
}

export async function habitSave(h: Habit) {
  if (!h.createdAt) h.createdAt = Date.now();
  if (h.id) return dbPut('habits', h);
  return dbAdd('habits', h);
}

export async function habitDelete(id: number) {
  const h = await dbGet('habits', id);
  if (!h) return;
  h.deleted = true;
  h.deletedAt = Date.now();
  return dbPut('habits', h);
}

export async function habitRecordGet(habitId: number, date: string) {
  const db = await getDB();
  return await db.getFromIndex('habit_records', 'habitDate', `${habitId}-${date}`) as HabitRecord;
}

export async function habitRecordSet(habitId: number, date: string, value: number) {
  const existing = await habitRecordGet(habitId, date);
  const rec: HabitRecord = existing || { 
    habitId, 
    date, 
    habitDate: `${habitId}-${date}`, 
    value, 
    createdAt: Date.now() 
  };
  rec.value = value;
  if (rec.id) return dbPut('habit_records', rec);
  return dbAdd('habit_records', rec);
}

export async function habitRecordsForHabit(habitId: number) {
  const db = await getDB();
  return await db.getAllFromIndex('habit_records', 'habitId', habitId) as HabitRecord[];
}

// Journal CRUD
export async function journalGetAll() {
  const all = (await dbGetAll('journal')) as JournalEntry[];
  return all.filter(j => !j.deleted) as JournalEntry[];
}

export async function journalSave(entry: JournalEntry) {
  if (!entry.createdAt) entry.createdAt = Date.now();
  entry.modifiedAt = Date.now();
  if (entry.id) return dbPut('journal', entry);
  return dbAdd('journal', entry);
}

export async function journalDelete(id: number) {
  const entry = await dbGet('journal', id);
  if (!entry) return;
  entry.deleted = true;
  entry.deletedAt = Date.now();
  return dbPut('journal', entry);
}

// Events CRUD
export async function eventsGetAll() {
  const all = (await dbGetAll('events')) as VianEvent[];
  return all.filter(e => !e.deleted) as VianEvent[];
}

export async function eventSave(ev: VianEvent) {
  if (!ev.createdAt) ev.createdAt = Date.now();
  if (ev.id) return dbPut('events', ev);
  return dbAdd('events', ev);
}

export async function eventDelete(id: number) {
  const ev = await dbGet('events', id);
  if (!ev) return;
  ev.deleted = true;
  ev.deletedAt = Date.now();
  return dbPut('events', ev);
}

// Global Trash
export async function trashGetAll() {
  const notes = await dbGetAll('notes');
  const expenses = await dbGetAll('expense_instances');
  const habits = await dbGetAll('habits');
  const events = await dbGetAll('events');
  const journals = await dbGetAll('journal');

  const trashedNotes = notes.filter(n => n.deleted).map(n => ({ ...n, trashType: 'note', trashId: `note-${n.id}` }));
  const trashedExpenses = expenses.filter(e => e.deleted).map(e => ({ ...e, trashType: 'expense', trashId: `expense-${e.id}` }));
  const trashedHabits = habits.filter(h => h.deleted).map(h => ({ ...h, trashType: 'habit', trashId: `habit-${h.id}` }));
  const trashedEvents = events.filter(ev => ev.deleted).map(ev => ({ ...ev, trashType: 'event', trashId: `event-${ev.id}` }));
  const trashedJournals = journals.filter(j => j.deleted).map(j => ({ ...j, trashType: 'journal', trashId: `journal-${j.id}` }));

  return [
    ...trashedNotes,
    ...trashedExpenses,
    ...trashedHabits,
    ...trashedEvents,
    ...trashedJournals
  ].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
}

export async function trashRestore(trashId: string) {
  const [type, idStr] = trashId.split('-');
  const id = parseInt(idStr);
  const store = type === 'note' ? 'notes' : type === 'expense' ? 'expense_instances' : type === 'habit' ? 'habits' : type === 'journal' ? 'journal' : 'events';
  
  const item = await dbGet(store, id);
  if (item) {
    item.deleted = false;
    delete item.deletedAt;
    await dbPut(store, item);
    
    // If it's an expense instance, also restore its items
    if (type === 'expense') {
      const db = await getDB();
      const items = await db.getAllFromIndex('expenses', 'instanceId', id);
      for (const e of items) {
        e.deleted = false;
        delete e.deletedAt;
        await dbPut('expenses', e);
      }
    }
  }
}

export async function trashPermanentDelete(trashId: string) {
  const [type, idStr] = trashId.split('-');
  const id = parseInt(idStr);
  const store = type === 'note' ? 'notes' : type === 'expense' ? 'expense_instances' : type === 'habit' ? 'habits' : type === 'journal' ? 'journal' : 'events';
  
  if (type === 'expense') {
    const db = await getDB();
    const items = await db.getAllFromIndex('expenses', 'instanceId', id);
    for (const e of items) {
      if (e.id) await dbDelete('expenses', e.id);
    }
  }
  
  return dbDelete(store, id);
}

// Global Archive
export async function archiveGetAll() {
  const notes = await dbGetAll('notes');
  const habits = await dbGetAll('habits');
  const events = await dbGetAll('events');

  const archivedNotes = notes.filter(n => n.archived && !n.deleted).map(n => ({ ...n, archiveType: 'note', archiveId: `note-${n.id}` }));
  const archivedHabits = habits.filter(h => h.archived && !h.deleted).map(h => ({ ...h, archiveType: 'habit', archiveId: `habit-${h.id}` }));
  const archivedEvents = events.filter(ev => ev.archived && !ev.deleted).map(ev => ({ ...ev, archiveType: 'event', archiveId: `event-${ev.id}` }));

  return [
    ...archivedNotes,
    ...archivedHabits,
    ...archivedEvents
  ].sort((a, b) => (b.modifiedAt || b.createdAt || 0) - (a.modifiedAt || a.createdAt || 0));
}

export async function archiveRestore(archiveId: string) {
  const [type, idStr] = archiveId.split('-');
  const id = parseInt(idStr);
  const store = type === 'note' ? 'notes' : type === 'habit' ? 'habits' : 'events';
  
  const item = await dbGet(store, id);
  if (item) {
    item.archived = false;
    await dbPut(store, item);
  }
}

export async function archiveDelete(archiveId: string) {
  const [type, idStr] = archiveId.split('-');
  const id = parseInt(idStr);
  const store = type === 'note' ? 'notes' : type === 'habit' ? 'habits' : 'events';
  
  const item = await dbGet(store, id);
  if (item) {
    item.deleted = true;
    item.deletedAt = Date.now();
    await dbPut(store, item);
  }
}

// Tags CRUD
export async function tagsGetAll(type?: 'journal' | 'note') {
  const all = (await dbGetAll('tags')) as { id: number, type: 'journal' | 'note', name: string }[];
  if (type) return all.filter(t => t.type === type);
  return all;
}

export async function tagAdd(type: 'journal' | 'note', name: string) {
  const existing = await tagsGetAll(type);
  if (existing.some(t => t.name === name)) return;
  return dbAdd('tags', { type, name });
}

export async function tagDelete(id: number) {
  return dbDelete('tags', id);
}
