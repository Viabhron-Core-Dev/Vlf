// journal-db.js
async function journalGetAll() { return dbGetAll("journal"); }
async function journalGetByDate(date) { return dbGetByIndex("journal","date",date); }
async function journalSave(entry) {
  if (!entry.createdAt) entry.createdAt = Date.now();
  entry.modifiedAt = Date.now();
  if (entry.id) { await dbPut("journal",entry); return entry.id; }
  return dbAdd("journal",entry);
}
async function journalDelete(id) { return dbDelete("journal",id); }
async function journalGetLastOpened() {
  const id = localStorage.getItem("vian-journal-last");
  if (!id) return null;
  return dbGet("journal", parseInt(id));
}
function journalSetLastOpened(id) { localStorage.setItem("vian-journal-last", String(id)); }
async function journalTodayCount() {
  return (await journalGetByDate(dateToStr(new Date()))).length;
}
async function journalSearch(query) {
  const q = query.toLowerCase();
  return (await journalGetAll()).filter(e=>(e.body||"").toLowerCase().includes(q)).sort((a,b)=>b.modifiedAt-a.modifiedAt);
}