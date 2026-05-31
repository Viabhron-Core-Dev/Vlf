export type NoteType = 'text' | 'checklist';
export type Tab = 'notes' | 'expenses' | 'habits' | 'calendar';
export type SortType = 'modified' | 'created' | 'alphabetical' | 'color';

export interface Note {
  id?: number;
  title: string;
  body?: string; // Used for text notes
  items?: ChecklistItem[]; // Used for checklists
  type: NoteType;
  color: string;
  createdAt: number;
  modifiedAt: number;
  archived: boolean;
  deleted: boolean;
  deletedAt?: number;
  tags: string[];
  reminder?: string; // DateTime or reminder type
  attachments?: Attachment[];
}

export interface Attachment {
  id: string; // generated uuid
  type: 'image' | 'drawing' | 'table' | 'kanban';
  data?: string; // base64 for image/drawing
  name?: string;
  // table
  cols?: number;
  rows?: number;
  colWidths?: string[];
  tableData?: string[][]; // for table
  // kanban
  kanbanColumns?: { id: string, name: string, cards: string[] }[];
  // common
  height?: number;
  width?: number | string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Expense {
  id?: number;
  instanceId?: number; // Grouping ID (Outing)
  item: string;
  category: string;
  subcategory: string;
  price: number;
  quantity?: number;
  weight_label: string;
  weight_kg: number;
  shop: string;
  date: string; // YYYY-MM-DD
  comments?: string;
  createdAt: number;
  deleted?: boolean;
  deletedAt?: number;
}

export interface ExpenseInstance {
  id?: number;
  name: string;
  date: string;
  shop?: string;
  total: number;
  createdAt: number;
  deleted?: boolean;
  deletedAt?: number;
}

export interface Habit {
  id?: number;
  name: string;
  question?: string;
  icon: string;
  color: string;
  type: 'yesno' | 'measurable' | 'combination';
  habitMode: 'habit' | 'task';
  frequency: 'daily' | 'weekly' | 'custom_days' | 'specific_dates';
  selectedDays?: number[]; // 0-6 for Mon-Sun (or Sun-Sat, usually 0 is Sunday in JS)
  specificDates?: string[]; // YYYY-MM-DD
  unit?: string;
  target?: number; // Target per day/session
  targetType?: 'at_least' | 'at_most' | 'exactly';
  targetTotal?: number; // For 'task' mode: total quota to reach
  startDate?: string; // YYYY-MM-DD
  deadline?: string; // YYYY-MM-DD
  notes?: string;
  reminder?: string;
  subHabits?: SubHabit[];
  order: number;
  archived: boolean;
  isPaused?: boolean;
  createdAt: number;
  deleted?: boolean;
  deletedAt?: number;
}

export interface SubHabit {
  id?: string;
  name: string;
  question?: string;
  icon: string;
  color: string;
  type: 'yesno' | 'measurable';
  frequency?: 'daily' | 'weekly' | 'custom_days' | 'specific_dates';
  selectedDays?: number[];
  unit?: string;
  target?: number;
  targetType?: 'at_least' | 'at_most' | 'exactly';
  notes?: string;
  isPaused?: boolean;
  createdAt?: number;
}

export interface HabitRecord {
  id?: number;
  habitId: number;
  date: string; // YYYY-MM-DD or 'sub-i-YYYY-MM-DD'
  habitDate: string; // `${habitId}-${date}` for indexing
  value: number;
  createdAt: number;
}

export interface JournalEntry {
  id?: number;
  title: string;
  body: string;
  date: string; // YYYY-MM-DD
  emotion: string;
  color: string;
  createdAt: number;
  modifiedAt: number;
  tags: string[];
  attachments?: Attachment[];
  lastOpenedAt?: number;
  deleted?: boolean;
  deletedAt?: number;
}

export interface VianEvent {
  id?: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  endTime?: string;
  location?: string;
  color?: string;
  body?: string;
  icon?: string;
  type?: 'plan' | 'event';
  reminder?: string;
  repeat: string;
  archived: boolean;
  createdAt: number;
  deleted?: boolean;
  deletedAt?: number;
}
