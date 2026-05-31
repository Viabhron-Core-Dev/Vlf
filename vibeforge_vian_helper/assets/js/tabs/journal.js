// journal.js
async function renderJournalList(el) {
  const all = await journalGetAll();
  if(!all.length){el.innerHTML=`<div class="empty-state"><div class="ei">&#128211;</div><p>No journal entries yet.<br>Tap + to start writing.</p></div>`;return;}
  const byDate={};
  all.forEach(e=>{if(!byDate[e.date])byDate[e.date]=[];byDate[e.date].push(e);});
  window._journalListItems=[];
  el.innerHTML=Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,entries])=>`
    <div class="event-date-group">&#128211; ${formatDate(date)} &mdash; ${entries.length} ${entries.length===1?"entry":"entries"}</div>`+
    entries.map(e=>{
      const i=window._journalListItems.length; window._journalListItems.push(e);
      const preview=(e.body||"").replace(/\n/g," ").substring(0,70);
      return `<div class="event-item" onclick="openJournalEditor(window._journalListItems[${i}])">
        <span class="event-item-icon">&#128211;</span>
        <div class="event-item-body">
          <div class="event-item-title">${formatDateTime(e.createdAt)}</div>
          ${preview?`<div class="event-item-sub">${escHtml(preview)}...</div>`:""}
        </div>
      </div>`;
    }).join("")
  ).join("");
}

function openJournalEditor(entry, dateOverride) {
  const today=dateToStr(new Date());
  const e = entry ? {...entry} : {date:dateOverride||today,body:"",color:"yellow",createdAt:Date.now()};
  window._currentJournal = e;

  // Share _currentNote with attachment system in notes-tab.js
  window._currentNote = {
    ...e,
    attachments: e.attachments||[],
    _isJournal: true
  };

  const dateLabel=new Date(e.date+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const html=`
    <div class="fs-header">
      <button class="fs-back" onclick="saveJournal()">&#8592;</button>
      <div style="flex:1">
        <div style="font-size:.72rem;color:var(--text-secondary)">Journal</div>
        <div style="font-size:.92rem;font-weight:700">${dateLabel}</div>
      </div>
      <div class="fs-color-swatch nc-${e.color||"yellow"}" onclick="openJournalColorPicker()" style="width:24px;height:24px;border-radius:50%;background:${e.color==="yellow"?"#eab308":e.color==="white"?"#f5f5f5":e.color==="red"?"#ef4444":e.color==="blue"?"#3b82f6":e.color==="green"?"#22c55e":e.color==="purple"?"#a855f7":e.color==="orange"?"#f97316":e.color==="black"?"#1f2937":"#9ca3af"};cursor:pointer;border:2px solid rgba(0,0,0,.15);flex-shrink:0;margin-right:4px"></div>
      <button class="fs-menu-btn" onclick="openJournalMenu(${e.id||"null"})">&#8942;</button>
    </div>
    <div class="paper-area paper-${e.color||"yellow"}" id="journal-paper" style="flex:1;overflow-y:auto;min-height:0;">
      <div class="paper-lines">
        <div class="paper-textarea" id="journal-body" contenteditable="true" data-placeholder="Write your journal entry...">${escHtml(e.body||"")}</div>
      </div>
      <div id="journal-attachments"></div>
    </div>
    <div class="editor-toolbar" id="note-toolbar" style="flex-shrink:0;">
      <button class="tb-btn" onclick="openAttachmentPicker()">&#128206;</button>
      <button class="tb-btn" onclick="document.execCommand('undo')">&#8617;</button>
      <button class="tb-btn" onclick="document.execCommand('redo')">&#8618;</button>
    </div>`;
  openFullscreen(html);

  // Show existing attachments
  if((e.attachments||[]).length) {
    setTimeout(()=>{
      const tb = document.getElementById("note-toolbar");
      if(tb && typeof _refreshEditorAttachments==="function") _refreshEditorAttachments(tb);
    }, 150);
  }

  if(e.id) { journalSetLastOpened(e.id); updateJournalFab(); }
  setTimeout(()=>{
    const ta=document.getElementById("journal-body");
    if(ta&&entry){ta.setSelectionRange(ta.value.length,ta.value.length);ta.focus();}
  },350);
}

async function saveJournal() {
  const e = window._currentJournal;
  const tb = document.getElementById("journal-body");
  if(tb) e.body = typeof _htmlToBody === "function" ? _htmlToBody(tb) : (tb.innerText || tb.value || "");
  // Save attachments from shared _currentNote
  if(window._currentNote && window._currentNote._isJournal) {
    e.attachments = window._currentNote.attachments||[];
  }
  await journalSave(e);
  if(e.id) journalSetLastOpened(e.id);
  updateJournalFab();
  closeFullscreen();
}

function openJournalColorPicker() {
  const colors={white:"#f5f5f5",red:"#ef4444",orange:"#f97316",yellow:"#eab308",green:"#22c55e",blue:"#3b82f6",purple:"#a855f7",black:"#1f2937",gray:"#9ca3af"};
  const div=document.createElement("div");
  div.style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:16px;z-index:600;box-shadow:0 4px 20px rgba(0,0,0,.2)";
  div.innerHTML=`<div class="color-picker">${Object.entries(colors).map(([name,hex])=>`<div class="color-dot ${window._currentJournal.color===name?"selected":""}" style="background:${hex}" onclick="setJournalColor('${name}')"></div>`).join("")}</div>`;
  document.body.appendChild(div); window._jCpDiv=div;
  setTimeout(()=>document.addEventListener("click",_closeJCP,true),10);
}
function _closeJCP(e){if(window._jCpDiv&&!window._jCpDiv.contains(e.target)){window._jCpDiv.remove();document.removeEventListener("click",_closeJCP,true);}}
function setJournalColor(color) {
  window._currentJournal.color=color;
  if(window._currentNote) window._currentNote.color=color;
  const pa=document.getElementById("journal-paper");
  if(pa) pa.className="paper-area paper-"+color;
  if(window._jCpDiv){window._jCpDiv.remove();document.removeEventListener("click",_closeJCP,true);}
}

function openJournalMenu(id) {
  showContextMenu([
    {label:"&#128274; Lock entry", action:()=>showToast("Lock coming soon")},
    {label:"&#128228; Share", action:()=>{
      const e=window._currentJournal;
      const text=formatDate(e.date)+"\n\n"+(e.body||"");
      if(navigator.share) navigator.share({title:"Journal "+e.date,text});
      else{navigator.clipboard&&navigator.clipboard.writeText(text);showToast("Copied!");}
    }},
    {label:"&#128465; Delete entry", action:async()=>{
      if(id&&confirm("Delete this journal entry?")){await journalDelete(id);closeFullscreen();showToast("Deleted");}
    }}
  ]);
}

async function updateJournalFab() {
  const fab=document.getElementById("journal-fab");
  if(!fab) return;
  if(activeTab!=="calendar"){fab.classList.add("hidden");return;}
  const count=await journalTodayCount();
  fab.classList.toggle("hidden", count===0);
}

document.getElementById("journal-fab").addEventListener("click",async()=>{
  const last=await journalGetLastOpened();
  if(last) openJournalEditor(last);
  else {
    const today=dateToStr(new Date());
    const entries=await journalGetByDate(today);
    if(entries.length) openJournalEditor(entries[entries.length-1]);
  }
});

function openJournalSearch() {
  const html=`
    <div class="fs-header">
      <button class="fs-back" onclick="closeFullscreen()">&#8592;</button>
      <input id="jsearch-input" placeholder="Search journal entries..." style="flex:1;margin:0 8px" autofocus/>
    </div>
    <div id="jsearch-results" style="flex:1;overflow-y:auto"></div>`;
  openFullscreen(html);
  document.getElementById("jsearch-input").addEventListener("input",async e=>{
    const q=e.target.value.trim();
    const out=document.getElementById("jsearch-results");
    if(!q){out.innerHTML="";return;}
    const results=await journalSearch(q);
    if(!results.length){out.innerHTML=`<div class="empty-state"><p>No entries found for "${escHtml(q)}"</p></div>`;return;}
    window._jsearchResults=results;
    out.innerHTML=results.map((r,i)=>`<div class="event-item" onclick="openJournalEditor(window._jsearchResults[${i}])">
      <span class="event-item-icon">&#128211;</span>
      <div class="event-item-body">
        <div class="event-item-title">${formatDate(r.date)}</div>
        <div class="event-item-sub">${escHtml((r.body||"").substring(0,80))}</div>
      </div>
    </div>`).join("");
  });
}
