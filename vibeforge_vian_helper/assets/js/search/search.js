// search.js
function openGlobalSearch() {
  const html = `
    <div class="fs-header">
      <button class="fs-back" onclick="closeFullscreen()">&#8592;</button>
      <input id="gs-input" placeholder="Search everything..." style="flex:1;margin:0 8px" autofocus/>
    </div>
    <div style="padding:8px 14px;border-bottom:1px solid var(--border);display:flex;gap:6px;flex-wrap:wrap;" id="gs-scopes">
      ${["Everything","Notes","Journal","Habits","Expense","Events"].map((s,i)=>
        `<button class="freq-btn ${i===0?"active":""}" onclick="setSearchScope('${s}',this)">${s}</button>`
      ).join("")}
    </div>
    <div id="gs-results" style="flex:1;overflow-y:auto;"></div>`;
  openFullscreen(html);
  window._searchScope = "Everything";
  const inp = document.getElementById("gs-input");
  inp.addEventListener("input", e=>runGlobalSearch(e.target.value));
  inp.focus();
}
function setSearchScope(scope, btn) {
  window._searchScope = scope;
  document.querySelectorAll("#gs-scopes .freq-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  runGlobalSearch((document.getElementById("gs-input")||{}).value||"");
}
async function runGlobalSearch(q) {
  const out = document.getElementById("gs-results");
  if (!out) return;
  if (!q.trim()) { out.innerHTML=""; return; }
  const scope = window._searchScope||"Everything";
  const results = [];
  if (scope==="Everything"||scope==="Notes") {
    (await notesGetAll()).filter(n=>(n.title||"").toLowerCase().includes(q.toLowerCase())||(n.body||"").toLowerCase().includes(q.toLowerCase()))
      .forEach(n=>results.push({icon:"&#128221;",title:n.title||"Untitled",sub:relativeDate(n.modifiedAt),badge:"Note",action:()=>{closeFullscreen();openNoteEditor(n);}}));
  }
  if (scope==="Everything"||scope==="Journal") {
    (await journalSearch(q)).forEach(e=>results.push({icon:"&#128211;",title:formatDate(e.date),sub:(e.body||"").substring(0,60),badge:"Journal",action:()=>{closeFullscreen();openJournalEditor(e);}}));
  }
  if (scope==="Everything"||scope==="Expense") {
    (await expenseGetAll()).filter(i=>(i.item||"").toLowerCase().includes(q.toLowerCase()))
      .forEach(i=>results.push({icon:"&#128176;",title:i.item,sub:i.date+" \u2022 \u20B9"+i.price,badge:"Expense",action:()=>{closeFullscreen();switchTab("expense");}}));
  }
  if (scope==="Everything"||scope==="Events") {
    (await eventsGetAll()).filter(e=>(e.title||"").toLowerCase().includes(q.toLowerCase()))
      .forEach(e=>results.push({icon:e.icon||"&#128197;",title:e.title,sub:formatDate(e.date),badge:"Event",action:()=>{closeFullscreen();openPlanEditor(e);}}));
  }
  window._gsResults = results;
  if (!results.length) { out.innerHTML=`<div class="empty-state"><p>No results for "${q}"</p></div>`; return; }
  out.innerHTML = results.map((r,i)=>`
    <div class="event-item" onclick="window._gsResults[${i}].action()">
      <span class="event-item-icon">${r.icon}</span>
      <div class="event-item-body">
        <div class="event-item-title">${r.title}</div>
        <div class="event-item-sub">${r.sub}</div>
      </div>
      <span class="event-source-badge">${r.badge}</span>
    </div>`).join("");
}
