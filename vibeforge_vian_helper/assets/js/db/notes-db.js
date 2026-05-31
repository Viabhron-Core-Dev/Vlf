// notes-db.js
async function notesGetAll() {
  const all = await dbGetAll("notes");
  return all.filter(n=>!n.deleted && !n.archived);
}
async function notesGetArchived() {
  return (await dbGetAll("notes")).filter(n=>n.archived && !n.deleted);
}
async function notesGetTrashed() {
  return (await dbGetAll("notes")).filter(n=>n.deleted);
}
async function notesSave(note) {
  note.modifiedAt = Date.now();
  if (!note.createdAt) note.createdAt = Date.now();
  if (note.id) return dbPut("notes", note);
  return dbAdd("notes", note);
}
async function notesDelete(id) {
  const n = await dbGet("notes", id);
  if (!n) return;
  n.deleted = true; n.deletedAt = Date.now();
  return dbPut("notes", n);
}
async function notesArchive(id, archive=true) {
  const n = await dbGet("notes", id);
  if (!n) return;
  n.archived = archive;
  return dbPut("notes", n);
}
async function notesGetTags() {
  const all = await notesGetAll();
  const tags = new Set();
  all.forEach(n=>(n.tags||[]).forEach(t=>tags.add(t)));
  return [...tags].sort();
}