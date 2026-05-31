// hamburger.js
function openHamburger() {
  buildSidebar(activeTab);
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebar-overlay").classList.add("visible");
}
function closeHamburger() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("visible");
}
document.getElementById("btn-hamburger").addEventListener("click", openHamburger);
document.getElementById("sidebar-overlay").addEventListener("click", closeHamburger);

const SIDEBAR = {
  notes:[
    {title:"Navigate",items:[
      {si:"&#128221;",label:"All Notes",      fn:()=>{closeHamburger();renderNotesTab("all");}},
      {si:"&#128449;",label:"Archive",        fn:()=>{closeHamburger();renderNotesTab("archive");}},
      {si:"&#128465;",label:"Trash",          fn:()=>{closeHamburger();renderNotesTab("trash");}},
    ]},
    {title:"Tools",items:[
      {si:"&#127991;",label:"Tag Manager",    fn:()=>{closeHamburger();openTagManager();}},
      {si:"&#128190;",label:"Backup Notes",   fn:()=>{closeHamburger();doTabBackup("notes");}},
    ]}
  ],
  habits:[
    {title:"Navigate",items:[
      {si:"&#9989;",  label:"Active Habits",  fn:()=>{closeHamburger();renderHabitsTab();}},
      {si:"&#128449;",label:"Archived",       fn:()=>{closeHamburger();renderArchivedHabits();}},
    ]},
    {title:"Settings",items:[
      {si:"&#128197;",label:"Week start: "+((localStorage.getItem("vian-week-start")||"Mon")),
        fn:()=>{
          const c=localStorage.getItem("vian-week-start")||"Mon";
          localStorage.setItem("vian-week-start",c==="Mon"?"Sun":"Mon");
          closeHamburger();renderHabitsTab();showToast("Week start changed");
        }
      },
      {si:"&#128190;",label:"Backup Habits",  fn:()=>{closeHamburger();doTabBackup("habits");}},
    ]}
  ],
  expense:[
    {title:"Views",items:[
      {si:"&#128214;",label:"History",        fn:()=>{closeHamburger();renderExpenseHistory();}},
      {si:"&#128202;",label:"Analytics",      fn:()=>{closeHamburger();renderExpenseAnalytics();}},
      {si:"&#128196;",label:"New Input",      fn:()=>{closeHamburger();openExpenseInput(null);}},
    ]},
    {title:"Tools",items:[
      {si:"&#128190;",label:"Backup Expense", fn:()=>{closeHamburger();doTabBackup("expense");}},
      {si:"&#128465;",label:"Clear All Data", fn:()=>{
        if(confirm("Delete ALL expense data?"))
          dbClear("expenses").then(()=>{closeHamburger();renderExpenseTab();showToast("Cleared");});
      }},
    ]}
  ],
  calendar:[
    {title:"Views",items:[
      {si:"&#128197;",label:"Month View",       fn:()=>{closeHamburger();setCalView("month");}},
      {si:"&#128197;",label:"All Events",       fn:()=>{closeHamburger();setCalView("events");}},
      {si:"&#128211;",label:"Journal",          fn:()=>{closeHamburger();setCalView("journal");}},
      {si:"&#128138;",label:"Health Notes",     fn:()=>{closeHamburger();setCalView("health");}},
      {si:"&#128197;",label:"Agenda",           fn:()=>{closeHamburger();setCalView("agenda");}},
    ]},
    {title:"Import",items:[
      {si:"&#128196;",label:"Import OCR/Text",  fn:()=>{closeHamburger();openOCRImport();}},
    ]},
    {title:"Data",items:[
      {si:"&#128211;",label:"Journal Search",   fn:()=>{closeHamburger();openJournalSearch();}},
      {si:"&#128190;",label:"Global Backup",    fn:()=>{closeHamburger();openGlobalBackupUI();}},
    ]}
  ]
};

function buildSidebar(tab) {
  const sections = SIDEBAR[tab]||[];
  document.getElementById("sidebar-inner").innerHTML = sections.map((sec,si)=>`
    <div class="sb-section">
      <div class="sb-title">${sec.title}</div>
      ${sec.items.map((item,ii)=>`<button class="sb-item" onclick="_sb[${si}][${ii}].fn()"><span class="si">${item.si}</span>${item.label}</button>`).join("")}
    </div>`).join("");
  window._sb = sections.map(s=>s.items);
}

function doTabBackup(tab) {
  const usePass = confirm("Encrypt with password?");
  let pw = null;
  if (usePass) { pw=prompt("Enter password:"); if(!pw) return; }
  exportTabData(tab, pw);
}

function openGlobalBackupUI() {
  openFullscreen(`
    <div class="fs-header">
      <button class="fs-back" onclick="closeFullscreen()">&#8592;</button>
      <span style="font-weight:700;font-size:1.1rem">&#128190; Global Backup</span>
    </div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:12px">
      <button class="btn btn-primary btn-full" onclick="_doGlobalExport()">&#128228; Export All Data (JSON)</button>
      <button class="btn btn-secondary btn-full" onclick="_doGlobalImport()">&#128229; Import / Restore</button>
      <p style="font-size:.8rem;color:var(--text-secondary);text-align:center">
        Optional AES-256 encryption on export. Data never leaves your device.
      </p>
    </div>`);
}

function _doGlobalExport() {
  const usePass=confirm("Encrypt with password?"); let pw=null;
  if(usePass){pw=prompt("Enter password:");if(!pw)return;}
  exportAllData(pw);
}

function _doGlobalImport() {
  const inp=document.createElement("input"); inp.type="file"; inp.accept=".json";
  inp.onchange=async e=>{
    const mode=confirm("Merge (OK) or Replace all (Cancel)?")?"merge":"replace";
    await importData(e.target.files[0],mode);
  };
  inp.click();
}

function openTagManager() {
  notesGetTags().then(tags=>{
    if(!tags.length){showToast("No tags yet");return;}
    openFullscreen(`
      <div class="fs-header">
        <button class="fs-back" onclick="closeFullscreen()">&#8592;</button>
        <span style="font-weight:700">Tag Manager</span>
      </div>
      <div style="padding:12px">
        ${tags.map(t=>`<div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:.95rem">&#127991; ${t}</div>`).join("")}
      </div>`);
  });
}
