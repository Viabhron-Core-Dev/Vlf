// fab.js
let _fabOpen = false;
const FAB_OPTIONS = {
  notes:[
    {icon:"&#128221;",label:"Text Note",action:()=>openNoteEditor(null,"text")},
    {icon:"&#9745;&#65039;",label:"Checklist",action:()=>openNoteEditor(null,"checklist")},
    {icon:"&#128196;",label:"Open file (.txt .html .md)",action:()=>_importNoteFile()}
  ],
  habits:[
    {icon:"&#9989;",label:"Yes / No habit",action:()=>openHabitForm(null,"yesno")},
    {icon:"&#128290;",label:"Measurable habit",action:()=>openHabitForm(null,"measurable")},
    {icon:"&#128101;",label:"Combination habit",action:()=>openHabitForm(null,"combination")}
  ],
  expense:[
    {icon:"&#128176;",label:"New expense entry",action:()=>openExpenseInput(null)}
  ],
  calendar:[
    {icon:"&#128211;",label:"Journal Entry",action:()=>openJournalEditor(null)},
    {icon:"&#128197;",label:"Plan / Event",action:()=>openPlanEditor(null)},
    {icon:"&#128138;",label:"Health Note",action:()=>openHealthEntry()}
  ]
};

function toggleFabPicker() {
  if (_fabOpen) { closeFabPicker(); return; }
  const opts = FAB_OPTIONS[activeTab]||[];
  if (opts.length===1) { opts[0].action(); return; }
  window._fabOpts = opts;
  document.getElementById("fab-picker-inner").innerHTML = opts.map((o,i)=>
    `<button class="fpi" onclick="window._fabOpts[${i}].action();closeFabPicker()">
      <span class="pi">${o.icon}</span>${o.label}
    </button>`
  ).join("");
  document.getElementById("fab-picker").classList.remove("hidden");
  _fabOpen = true;
  setTimeout(()=>document.addEventListener("click",_fabOutside,true),10);
}
function closeFabPicker() {
  document.getElementById("fab-picker").classList.add("hidden");
  _fabOpen = false;
  document.removeEventListener("click",_fabOutside,true);
}
function _fabOutside(e) {
  if (!document.getElementById("fab-picker").contains(e.target) && e.target.id!=="fab-btn")
    closeFabPicker();
}

// ── Health Note — opens a real note editor pre-tagged as health ───────
function openHealthEntry() {
  const today = dateToStr(new Date());
  const note = {
    type: "text",
    color: "red",           // red = health/medical feel
    title: "",
    body: "",
    tags: ["health"],
    createdAt: Date.now(),
    healthDate: today       // extra metadata for calendar dot
  };
  // Open note editor — saves to notes DB like any note
  openNoteEditor(note, "text");
}
