// backup.js
function downloadFile(content, filename, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content],{type}));
  a.download = filename; a.click();
}
async function exportAllData(password) {
  const data = {
    version:1, exportedAt:Date.now(),
    notes:     await dbGetAll("notes"),
    habits:    await dbGetAll("habits"),
    habit_records: await dbGetAll("habit_records"),
    expenses:  await dbGetAll("expenses"),
    events:    await dbGetAll("events"),
    journal:   await dbGetAll("journal"),
    settings:  {theme:getTheme(), expenseItems:expenseAutoHistory()}
  };
  const str = password ? await encryptData(data,password) : JSON.stringify(data,null,2);
  downloadFile(str,"vian-backup-"+dateToStr(new Date())+".json","application/json");
  showToast("Backup saved!");
}
async function exportTabData(tab, password) {
  const storeMap = {notes:["notes"],habits:["habits","habit_records"],expense:["expenses"],calendar:["events"],journal:["journal"]};
  const data = {version:1,tab,exportedAt:Date.now()};
  for (const s of (storeMap[tab]||[])) data[s] = await dbGetAll(s);
  const str = password ? await encryptData(data,password) : JSON.stringify(data,null,2);
  downloadFile(str,"vian-"+tab+"-"+dateToStr(new Date())+".json","application/json");
  showToast(tab+" backup saved!");
}
async function importData(file, mode="merge") {
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); }
  catch(e) {
    const pw = prompt("Enter backup password:");
    if (!pw) return;
    try { data = await decryptData(text,pw); }
    catch(e2) { showToast("Wrong password or invalid file"); return; }
  }
  const stores = ["notes","habits","habit_records","expenses","events","journal"];
  for (const s of stores) {
    if (!data[s]) continue;
    if (mode==="replace") await dbClear(s);
    for (const item of data[s]) {
      const {id,...rest} = item;
      try { await dbAdd(s,rest); } catch(e) { try { await dbPut(s,item); } catch(e2){} }
    }
  }
  showToast("Restore complete!");
  setTimeout(()=>location.reload(),1200);
}
