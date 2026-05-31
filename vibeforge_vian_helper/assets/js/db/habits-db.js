// habits-db.js
async function habitsGetAll() { return dbGetAll("habits"); }
async function habitSave(h) {
  if (!h.createdAt) h.createdAt = Date.now();
  if (h.id) return dbPut("habits",h);
  return dbAdd("habits",h);
}
async function habitDelete(id) { return dbDelete("habits",id); }
async function habitRecordGet(habitId, date) {
  try {
    const key = habitId+"-"+date;
    return await new Promise((res,rej)=>{
      const r = getStore("habit_records").index("habitDate").get(key);
      r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
    });
  } catch(e) { return null; }
}
async function habitRecordSet(habitId, date, value) {
  const existing = await habitRecordGet(habitId, date);
  const rec = existing || {habitId, date, habitDate:habitId+"-"+date, createdAt:Date.now()};
  rec.value = value;
  return dbPut("habit_records", rec);
}
async function habitRecordsForHabit(habitId) {
  return (await dbGetAll("habit_records")).filter(r=>r.habitId===habitId);
}
async function habitStreak(habitId) {
  const records = await habitRecordsForHabit(habitId);
  const doneSet = new Set(records.filter(r=>r.value>0).map(r=>r.date));
  let streak=0, best=0, cur=0;
  const today = dateToStr(new Date());
  let d = new Date();
  for (let i=0;i<365;i++) {
    const s = dateToStr(d);
    if (doneSet.has(s)) { cur++; if(cur>best)best=cur; if(i===0||streak===cur-1)streak=cur; }
    else { if(i>0&&streak===cur){}; cur=0; if(i>0)break; }
    d.setDate(d.getDate()-1);
  }
  return {streak,best};
}