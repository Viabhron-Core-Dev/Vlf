export const NOTE_COLORS = [
  { name: 'white', bg: '#fdfdfd', text: '#1a1a1a', border: '#e5e5e0' },
  { name: 'red', bg: '#FFCDD2', text: '#1a1a1a', border: '#ef5350' },
  { name: 'orange', bg: '#FFE0B2', text: '#1a1a1a', border: '#ffb74d' },
  { name: 'yellow', bg: '#FFF9C4', text: '#1a1a1a', border: '#fff176' },
  { name: 'green', bg: '#DCEDC8', text: '#1a1a1a', border: '#8bc34a' },
  { name: 'blue', bg: '#B3E5FC', text: '#1a1a1a', border: '#4fc3f7' },
  { name: 'purple', bg: '#E1BEE7', text: '#1a1a1a', border: '#ba68c8' },
];

export const CATEGORIES: Record<string, string[]> = {
  "Food": ["Fresh", "Dry", "Spice", "Snack", "Dine out"],
  "Pharmacy": ["Medicine", "Checkup", "Equipment"],
  "Toiletry": ["Soap", "Toothpaste", "Shampoo", "Detergent", "Other"],
  "Bills": ["Electricity", "Water", "Internet", "Phone", "Rent"],
  "Extra": ["Gifts", "Repairs", "Donation", "Miscellaneous"],
  "Transport": ["Auto", "Uber", "Bus", "Train", "Petrol", "Other"],
  "Electronics": ["Gadget", "Accessory", "Battery", "Service"],
  "Clothes": ["Daily wear", "Office", "Party", "Footwear", "Other"],
  "Hardware/Repair Goods": ["Tools", "Materials", "Electrical", "Plumbing", "Paint", "Other"]
};

export const CATEGORY_ICONS: Record<string, string> = {
  Food: "🍚",
  Pharmacy: "💊",
  Toiletry: "🛀",
  Bills: "💡",
  Extra: "🎁",
  Transport: "🚕",
  Electronics: "📱",
  Clothes: "👕",
  "Hardware/Repair Goods": "🔧"
};

export const SHOPS = ["Lidl", "Aldi", "Tesco", "Sainsbury's", "Spar", "Local Shop", "Online"];

export const WEIGHT_PRESETS = [
  { label: "100g", kg: 0.1 },
  { label: "250g", kg: 0.25 },
  { label: "500g", kg: 0.5 },
  { label: "1kg", kg: 1 },
  { label: "2kg", kg: 2 },
  { label: "5kg", kg: 5 },
  { label: "Packet", kg: 0 },
  { label: "Other", kg: 0 }
];

export const COMMON_ICONS = [
  '🏃', '🏊', '📖', '💻', '🌅', '☕', '📔', '🌊', '🔧', '🏌', '🗓', '🎵', '💪', '🧘', '🍎', '🚀', '🔥', '🏦', '🎉', '🆘', '⌚', '📋', '📞', '💾', '✓', '🌋'
];

export const EVENT_ICONS = [
  "📅", "🏠", "💼", "🍀", "✈️", "🚵", "🏆", "🎓", "🛒", "💊", "📷", "💰", "🏪", "❤️", "🍽️", "⚽", "🏋️", "🛀", "🚗", "🚀", "🔥", "🏦", "🎉", "🆘", "⌚", "📋", "📞", "💾", "✓", "🌋"
];
