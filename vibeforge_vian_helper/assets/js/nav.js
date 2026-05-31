// nav.js
let activeTab = "notes";
let fullscreenOpen = false;

function switchTab(name) {
  if (fullscreenOpen) return;
  // Exit note select mode if switching away
  if (typeof _exitNoteSelectMode === 'function' && _noteSelectMode) _exitNoteSelectMode();
  activeTab = name;
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.getElementById("tab-"+name).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  document.body.dataset.activeTab = name;
  const titles={notes:"Notes",habits:"Habits",expense:"Expense",calendar:"Calendar"};
  document.getElementById("tab-title").textContent = titles[name]||name;
  updateMenuStrip(name);
  if (name==="calendar") updateJournalFab();
  else document.getElementById("journal-fab").classList.add("hidden");
}

function openFullscreen(html) {
  fullscreenOpen = true;
  const fs = document.getElementById("fullscreen");
  document.getElementById("fullscreen-inner").innerHTML = html;
  fs.classList.remove("hidden");
  requestAnimationFrame(()=>fs.classList.add("visible"));
  document.getElementById("fab-btn").textContent = "\u2715";
  // Push a history entry so Android back button fires popstate instead of exiting PWA
  history.pushState({vian:"fullscreen"}, "");
}

function closeFullscreen() {
  fullscreenOpen = false;
  const fs = document.getElementById("fullscreen");
  fs.classList.remove("visible");
  setTimeout(()=>{ fs.classList.add("hidden"); document.getElementById("fab-btn").textContent="\u2795"; },250);
  refreshTab(activeTab);
  // Remove our history entry if we're closing programmatically (← button or save)
  // Only go back if we actually pushed a state
  if (history.state && history.state.vian === "fullscreen") {
    history.back();
  }
}

function refreshTab(name) {
  if (name==="notes") renderNotesTab();
  else if (name==="habits") renderHabitsTab();
  else if (name==="expense") renderExpenseTab();
  else if (name==="calendar") renderCalendarTab();
}

document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));

document.getElementById("fab-btn").addEventListener("click",()=>{
  if (fullscreenOpen) { closeFullscreen(); return; }
  toggleFabPicker();
});

// ── Android back button handler ──────────────────────────────────────
// When Chrome Android fires 'popstate' (back button), handle it within the app
// instead of letting Chrome navigate away from the PWA.
window.addEventListener("popstate", (e) => {
  // If a fullscreen is open, close it (back = go to note list)
  if (fullscreenOpen) {
    // Auto-save if note editor or checklist editor is open
    if (typeof saveNote === "function" &&
        (document.getElementById("note-body") || document.getElementById("cl-area"))) {
      saveNote();
      return; // saveNote handles navigation (viewer or close)
    }
    // Default: just close
    fullscreenOpen = false;
    const fs = document.getElementById("fullscreen");
    fs.classList.remove("visible");
    setTimeout(()=>{ fs.classList.add("hidden"); document.getElementById("fab-btn").textContent="\u2795"; },250);
    refreshTab(activeTab);
    return;
  }
  // If sidebar is open, close it
  const sidebar = document.getElementById("sidebar");
  if (sidebar && sidebar.classList.contains("open")) {
    if (typeof closeHamburger === "function") closeHamburger();
    // Push another entry so we're still "inside" the app
    history.pushState({vian:"app"}, "");
    return;
  }
  // If fab picker open, close it
  if (typeof closeFabPicker === "function" && document.getElementById("fab-picker") &&
      !document.getElementById("fab-picker").classList.contains("hidden")) {
    closeFabPicker();
    history.pushState({vian:"app"}, "");
    return;
  }
  // Otherwise: we're at the main screen — push a dummy entry so next back
  // also stays in app (prevents accidental exit on first back press)
  history.pushState({vian:"app"}, "");
});

// On first load, push an initial state so there's always a history entry to pop
// before we'd exit the PWA
history.pushState({vian:"app"}, "");

// Swipe between tabs
let _touchX=0;
document.getElementById("content").addEventListener("touchstart",e=>{_touchX=e.touches[0].clientX;},{passive:true});
document.getElementById("content").addEventListener("touchend",e=>{
  if (fullscreenOpen) return;
  const diff=e.changedTouches[0].clientX-_touchX;
  if (Math.abs(diff)<50) return;
  const tabs=["notes","habits","expense","calendar"];
  const idx=tabs.indexOf(activeTab);
  if (diff<0&&idx<tabs.length-1) switchTab(tabs[idx+1]);
  if (diff>0&&idx>0) switchTab(tabs[idx-1]);
},{passive:true});
