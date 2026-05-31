// calendar-db.js
const EVENT_ICONS = {
  health:["\u{1F3E5}","\u{1F48A}","\u{1FA7A}","\u{1F9EC}","\u{1FA79}"],
  work:["\u{1F4BC}","\u{1F4CA}","\u{1F4BB}","\u{1F4CB}","\u{270A}"],
  family:["\u{1F46A}","\u{1F3E0}","\u{2764}","\u{1F382}","\u{1F476}"],
  travel:["\u{2708}","\u{1F682}","\u{1F697}","\u{1F5FA}","\u{26FA}"],
  celebrate:["\u{1F389}","\u{1F973}","\u{1F38A}","\u{1F388}","\u{1F381}"],
  fitness:["\u{1F3CB}","\u{1F3C3}","\u{26BD}","\u{1F3BE}","\u{1F6B4}"],
  finance:["\u{1F4B0}","\u{1F3E6}","\u{1F4C8}","\u{1F4B3}","\u{1F9FE}"],
  education:["\u{1F393}","\u{1F4DA}","\u{270F}","\u{1F52C}","\u{1F4D0}"],
  shopping:["\u{1F6D2}","\u{1F6CD}","\u{1F3EA}","\u{1F9FA}","\u{1F6AC}"],
  personal:["\u{1F33F}","\u{1F9D8}","\u{1F338}","\u{2B50}","\u{1F319}"]
};
async function eventsGetAll() { return dbGetAll("events"); }
async function eventSave(e) {
  if (!e.createdAt) e.createdAt = Date.now();
  e.modifiedAt = Date.now();
  if (e.id) return dbPut("events",e);
  return dbAdd("events",e);
}
async function eventDelete(id) { return dbDelete("events",id); }
async function eventsForDate(date) { return dbGetByIndex("events","date",date); }async function eventsForMonth(year, month) {
  const all = await eventsGetAll();
  const prefix = year+"-"+String(month+1).padStart(2,"0");
  return all.filter(e=>e.date&&e.date.startsWith(prefix));
}
