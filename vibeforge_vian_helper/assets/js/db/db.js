// VibeForge Vian Helper — db.js
const DB_NAME = "vian-helper";
const DB_VER = 1;
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains("notes")) {
        const ns = d.createObjectStore("notes", {keyPath:"id",autoIncrement:true});
        ns.createIndex("modifiedAt","modifiedAt");
      }
      if (!d.objectStoreNames.contains("habits"))
        d.createObjectStore("habits", {keyPath:"id",autoIncrement:true});
      if (!d.objectStoreNames.contains("habit_records")) {
        const hr = d.createObjectStore("habit_records", {keyPath:"id",autoIncrement:true});
        hr.createIndex("habitDate","habitDate",{unique:true});
      }
      if (!d.objectStoreNames.contains("expenses")) {
        const es = d.createObjectStore("expenses", {keyPath:"id",autoIncrement:true});
        es.createIndex("date","date");
      }
      if (!d.objectStoreNames.contains("events")) {
        const ev = d.createObjectStore("events", {keyPath:"id",autoIncrement:true});
        ev.createIndex("date","date");
      }
      if (!d.objectStoreNames.contains("journal")) {
        const jn = d.createObjectStore("journal", {keyPath:"id",autoIncrement:true});
        jn.createIndex("date","date");
        jn.createIndex("lastOpenedAt","lastOpenedAt");
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e.target.error);
  });
}

function getStore(name, mode="readonly") {
  return db.transaction(name, mode).objectStore(name);
}
function dbGetAll(store) {
  return new Promise((res,rej)=>{ const r=getStore(store).getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
}
function dbGet(store, id) {
  return new Promise((res,rej)=>{ const r=getStore(store).get(id); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
}
function dbAdd(store, obj) {
  return new Promise((res,rej)=>{ const r=getStore(store,"readwrite").add(obj); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
}
function dbPut(store, obj) {
  return new Promise((res,rej)=>{ const r=getStore(store,"readwrite").put(obj); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
}
function dbDelete(store, id) {
  return new Promise((res,rej)=>{ const r=getStore(store,"readwrite").delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); });
}
function dbGetByIndex(store, index, value) {
  return new Promise((res,rej)=>{ const r=getStore(store).index(index).getAll(value); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
}
function dbClear(store) {
  return new Promise((res,rej)=>{ const r=getStore(store,"readwrite").clear(); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); });
}