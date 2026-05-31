// universal-settings.js

// ── ⋮ button → opens full Settings page ─────────────────────────────
document.getElementById("btn-universal").addEventListener("click", e => {
  e.stopPropagation();
  _closeUM();
  openSettingsPage();
});

function _closeUM() {
  document.getElementById("universal-menu").classList.add("hidden");
  document.removeEventListener("click", _umOutside, true);
}
function _umOutside(e) {
  if (!document.getElementById("universal-menu").contains(e.target)) _closeUM();
}

// ── Settings helpers ─────────────────────────────────────────────────
function _getSetting(key, def) {
  const v = localStorage.getItem("vian-" + key);
  return v !== null ? v : def;
}
function _setSetting(key, val) {
  localStorage.setItem("vian-" + key, val);
}

// ── Full Settings Page ───────────────────────────────────────────────
function openSettingsPage() {
  const theme     = getTheme();
  const fontSize  = _getSetting("font-size", "medium");
  const defColor  = _getSetting("def-color", "yellow");
  const defTab    = _getSetting("def-tab", "notes");
  const weekStart = _getSetting("week-start", "Mon");
  const sortOrder = _getSetting("notes-sort", "modified");
  const listHeight= _getSetting("list-height", "normal");

  const colorDots = ["white","red","orange","yellow","green","blue","purple","black","gray"];
  const colorHex  = {white:"#f5f5f0",red:"#ef4444",orange:"#f97316",yellow:"#eab308",green:"#22c55e",blue:"#3b82f6",purple:"#a855f7",black:"#1f2937",gray:"#9ca3af"};

  const html = `
    <div class="fs-header" style="background:var(--surface)">
      <button class="fs-back" onclick="closeFullscreen()">&#8592;</button>
      <span style="font-weight:700;font-size:1.05rem;flex:1">Settings</span>
    </div>
    <div class="settings-page">

      <!-- INSTALL APP -->
      <div class="settings-group-title">App</div>
      <div class="settings-row" id="pwa-install-row" style="display:none">
        <div class="settings-row-label">
          <div class="settings-row-title">&#128640; Install App</div>
          <div class="settings-row-sub">Add to home screen as standalone app</div>
        </div>
        <button onclick="triggerPWAInstall()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;cursor:pointer">Install</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-label">
          <div class="settings-row-title">&#128451; Add to Home Screen</div>
          <div class="settings-row-sub">Chrome menu → "Add to Home Screen"</div>
        </div>
        <span class="settings-chevron">→</span>
      </div>

      <!-- GENERAL -->
      <div class="settings-group-title">General</div>

      <div class="settings-row" onclick="_pickDefTab()">
        <div class="settings-row-label">
          <div class="settings-row-title">Default Screen</div>
          <div class="settings-row-sub" id="s-def-tab">${_capFirst(defTab)}</div>
        </div>
        <span class="settings-chevron">&#9654;</span>
      </div>

      <div class="settings-row" onclick="_pickDefColor()">
        <div class="settings-row-label">
          <div class="settings-row-title">Default Note Color</div>
        </div>
        <div id="s-def-color-dot" style="width:28px;height:28px;border-radius:6px;background:${colorHex[defColor]};border:2px solid var(--border)"></div>
      </div>

      <div class="settings-row" onclick="_pickFontSize()">
        <div class="settings-row-label">
          <div class="settings-row-title">Font Size</div>
          <div class="settings-row-sub" id="s-font-size">${_capFirst(fontSize)}</div>
        </div>
        <span class="settings-chevron">&#9654;</span>
      </div>

      <div class="settings-row" onclick="_pickListHeight()">
        <div class="settings-row-label">
          <div class="settings-row-title">List Item Height</div>
          <div class="settings-row-sub" id="s-list-height">${_capFirst(listHeight)}</div>
        </div>
        <span class="settings-chevron">&#9654;</span>
      </div>

      <!-- SORT -->
      <div class="settings-group-title">Sort</div>

      <div class="settings-row" onclick="_pickSortOrder()">
        <div class="settings-row-label">
          <div class="settings-row-title">Default Notes Sort Order</div>
          <div class="settings-row-sub" id="s-sort-order">${_sortLabel(sortOrder)}</div>
        </div>
        <span class="settings-chevron">&#9654;</span>
      </div>

      <!-- APPEARANCE -->
      <div class="settings-group-title">Appearance</div>

      <div class="settings-row" onclick="_toggleThemeRow()">
        <div class="settings-row-label">
          <div class="settings-row-title">Theme</div>
          <div class="settings-row-sub" id="s-theme-label">${theme === "dark" ? "Dark" : "Light"}</div>
        </div>
        <div class="settings-toggle ${theme === "dark" ? "on" : ""}" id="s-theme-toggle"></div>
      </div>

      <!-- HABITS -->
      <div class="settings-group-title">Habits</div>

      <div class="settings-row" onclick="_pickWeekStart()">
        <div class="settings-row-label">
          <div class="settings-row-title">First Day of Week</div>
          <div class="settings-row-sub" id="s-week-start">${weekStart === "Mon" ? "Monday" : "Sunday"}</div>
        </div>
        <span class="settings-chevron">&#9654;</span>
      </div>

      <!-- BACKUP -->
      <div class="settings-group-title">Backup &amp; Restore</div>

      <div class="settings-row" onclick="_doExportAll()">
        <div class="settings-row-label">
          <div class="settings-row-title">&#128228; Export All Data</div>
          <div class="settings-row-sub">Save full backup as JSON file</div>
        </div>
      </div>

      <div class="settings-row" onclick="_doImport()">
        <div class="settings-row-label">
          <div class="settings-row-title">&#128229; Import / Restore</div>
          <div class="settings-row-sub">Merge or replace from backup file</div>
        </div>
      </div>

      <div class="settings-row" onclick="_doTabBackupMenu()">
        <div class="settings-row-label">
          <div class="settings-row-title">&#128190; Per-Tab Backup</div>
          <div class="settings-row-sub">Backup one tab at a time</div>
        </div>
        <span class="settings-chevron">&#9654;</span>
      </div>

      <!-- SECURITY -->
      <div class="settings-group-title">Security</div>

      <div class="settings-row">
        <div class="settings-row-label">
          <div class="settings-row-title">Encrypt Backups</div>
          <div class="settings-row-sub">Prompted when exporting if enabled</div>
        </div>
        <div class="settings-toggle ${_getSetting("encrypt-backup","off")==="on"?"on":""}" id="s-encrypt-toggle" onclick="_toggleEncrypt(this)"></div>
      </div>

      <!-- DANGER -->
      <div class="settings-group-title">Data</div>

      <div class="settings-row" onclick="_showStorageInfo()">
        <div class="settings-row-label">
          <div class="settings-row-title">&#128190; Storage Usage</div>
          <div class="settings-row-sub" id="s-storage-info">Tap to check</div>
        </div>
      </div>

      <div class="settings-row danger-row" onclick="_clearAll()">
        <div class="settings-row-label">
          <div class="settings-row-title" style="color:#ef4444">&#9888;&#65039; Clear All Data</div>
          <div class="settings-row-sub">Permanently delete everything</div>
        </div>
      </div>

      <!-- ABOUT -->
      <div class="settings-group-title">About</div>

      <div class="settings-row" onclick="_openAboutPage()">
        <div class="settings-row-label">
          <div class="settings-row-title">About Vian Helper</div>
          <div class="settings-row-sub">Version 1.0 &middot; Built by VibeForge</div>
        </div>
        <span class="settings-chevron">&#9654;</span>
      </div>

      <div style="height:40px"></div>
    </div>`;

  openFullscreen(html);

  // Load storage info
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(({usage, quota}) => {
      const el = document.getElementById("s-storage-info");
      if (el) el.textContent = `${(usage/1024/1024).toFixed(2)} MB used of ${(quota/1024/1024).toFixed(0)} MB`;
    });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────
function _capFirst(s) { return s ? s.charAt(0).toUpperCase()+s.slice(1) : ""; }
function _sortLabel(s) {
  return {modified:"Last modified",created:"Date created",alphabetical:"Alphabetical",color:"Color"}[s] || s;
}

// ── Pickers ──────────────────────────────────────────────────────────
function _pickDefTab() {
  _miniPicker("Default Screen", ["Notes","Habits","Expense","Calendar"], v => {
    _setSetting("def-tab", v.toLowerCase());
    const el = document.getElementById("s-def-tab"); if (el) el.textContent = v;
  });
}

function _pickDefColor() {
  const colorHex = {white:"#f5f5f0",red:"#ef4444",orange:"#f97316",yellow:"#eab308",green:"#22c55e",blue:"#3b82f6",purple:"#a855f7",black:"#1f2937",gray:"#9ca3af"};
  const colors = Object.keys(colorHex);
  const overlay = _makeOverlay();
  overlay.innerHTML = `
    <div class="mini-picker" style="padding:16px">
      <div style="font-weight:700;margin-bottom:12px;font-size:.95rem">Default Note Color</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
        ${colors.map(c=>`<div onclick="_setDefColor('${c}')" title="${c}"
          style="width:36px;height:36px;border-radius:8px;background:${colorHex[c]};border:3px solid ${_getSetting("def-color","yellow")===c?"var(--accent)":"transparent"};cursor:pointer"></div>`).join("")}
      </div>
      <button onclick="this.closest('.settings-overlay').remove()" style="margin-top:16px;width:100%;padding:10px;border:none;background:var(--border);border-radius:8px;font-size:.9rem;cursor:pointer">Cancel</button>
    </div>`;
  document.body.appendChild(overlay);
}
function _setDefColor(c) {
  const colorHex = {white:"#f5f5f0",red:"#ef4444",orange:"#f97316",yellow:"#eab308",green:"#22c55e",blue:"#3b82f6",purple:"#a855f7",black:"#1f2937",gray:"#9ca3af"};
  _setSetting("def-color", c);
  const dot = document.getElementById("s-def-color-dot");
  if (dot) dot.style.background = colorHex[c];
  document.querySelector(".settings-overlay")?.remove();
}

function _pickFontSize() {
  _miniPicker("Font Size", ["Small","Medium","Large","Extra Large"], v => {
    const map = {"Small":"small","Medium":"medium","Large":"large","Extra Large":"xlarge"};
    const key = map[v] || "medium";
    _setSetting("font-size", key);
    document.documentElement.style.fontSize = {small:"14px",medium:"16px",large:"18px",xlarge:"20px"}[key];
    const el = document.getElementById("s-font-size"); if (el) el.textContent = v;
  });
}

function _pickListHeight() {
  _miniPicker("List Item Height", ["Compact","Normal","Comfortable"], v => {
    _setSetting("list-height", v.toLowerCase());
    const el = document.getElementById("s-list-height"); if (el) el.textContent = v;
  });
}

function _pickSortOrder() {
  _miniPicker("Sort Order", ["Last modified","Date created","Alphabetical","Color"], v => {
    const map = {"Last modified":"modified","Date created":"created","Alphabetical":"alphabetical","Color":"color"};
    const key = map[v] || "modified";
    _setSetting("notes-sort", key);
    if (typeof notesSort !== "undefined") { notesSort = key; }
    const el = document.getElementById("s-sort-order"); if (el) el.textContent = v;
  });
}

function _pickWeekStart() {
  _miniPicker("First Day of Week", ["Monday","Sunday"], v => {
    const key = v === "Sunday" ? "Sun" : "Mon";
    _setSetting("week-start", key);
    localStorage.setItem("vian-week-start", key);
    const el = document.getElementById("s-week-start"); if (el) el.textContent = v;
  });
}

function _toggleThemeRow() {
  const newTheme = getTheme() === "light" ? "dark" : "light";
  applyTheme(newTheme);
  const tog = document.getElementById("s-theme-toggle");
  const lbl = document.getElementById("s-theme-label");
  if (tog) tog.classList.toggle("on", newTheme === "dark");
  if (lbl) lbl.textContent = newTheme === "dark" ? "Dark" : "Light";
}

function _toggleEncrypt(el) {
  const current = _getSetting("encrypt-backup","off");
  const next = current === "on" ? "off" : "on";
  _setSetting("encrypt-backup", next);
  el.classList.toggle("on", next === "on");
}

// ── Backup actions ───────────────────────────────────────────────────
function _doExportAll() {
  const usePass = _getSetting("encrypt-backup","off") === "on" || confirm("Encrypt with password?");
  let pw = null;
  if (usePass) { pw = prompt("Enter password (or Cancel for no encryption):"); }
  exportAllData(pw);
}

function _doImport() {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = ".json";
  inp.onchange = async e => {
    const mode = confirm("Merge with existing data?\n\nOK = Merge\nCancel = Replace all") ? "merge" : "replace";
    await importData(e.target.files[0], mode);
  };
  inp.click();
}

function _doTabBackupMenu() {
  _miniPicker("Backup which tab?", ["Notes","Habits","Expense","Calendar","Journal"], v => {
    const tab = v.toLowerCase();
    const pw = _getSetting("encrypt-backup","off") === "on" ? prompt("Enter password:") : null;
    if (_getSetting("encrypt-backup","off") === "on" && !pw) return;
    exportTabData(tab, pw);
  });
}

// ── Storage / danger ─────────────────────────────────────────────────
async function _showStorageInfo() {
  if (navigator.storage && navigator.storage.estimate) {
    const {usage, quota} = await navigator.storage.estimate();
    const el = document.getElementById("s-storage-info");
    if (el) el.textContent = `${(usage/1024/1024).toFixed(2)} MB used of ${(quota/1024/1024).toFixed(0)} MB`;
    showToast(`${(usage/1024/1024).toFixed(2)} MB used of ${(quota/1024/1024).toFixed(0)} MB`);
  }
}

async function _clearAll() {
  if (!confirm("Delete ALL app data? This cannot be undone!")) return;
  if (!confirm("Are you absolutely sure? All notes, habits, expenses, and journal entries will be lost.")) return;
  for (const s of ["notes","habits","habit_records","expenses","events","journal"]) await dbClear(s);
  localStorage.clear();
  showToast("All data cleared");
  setTimeout(()=>location.reload(), 1200);
}

function _openAboutPage() {
  openFullscreen(`
    <div class="fs-header" style="background:var(--surface)">
      <button class="fs-back" onclick="openSettingsPage()">&#8592;</button>
      <span style="font-weight:700;font-size:1.05rem;flex:1">About</span>
    </div>
    <div style="padding:20px;max-width:480px;margin:0 auto">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:3.5rem">&#128211;</div>
        <h2 style="font-size:1.3rem;margin:8px 0">VibeForge Vian Helper</h2>
        <p style="color:var(--text-secondary);font-size:.85rem">Version 1.0 &nbsp;&middot;&nbsp; Built by VibeForge</p>
      </div>
      <div style="background:var(--surface);border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid var(--border)">
        <p style="font-size:.85rem;margin-bottom:8px;font-weight:600">&#128994; What's inside</p>
        <p style="font-size:.85rem;line-height:1.6">Notes &amp; Checklists &nbsp;&#128221;<br>Habit Tracker &nbsp;&#9989;<br>Expense Manager &nbsp;&#128176;<br>Calendar, Journal &amp; Plans &nbsp;&#128197;</p>
      </div>
      <div style="background:var(--surface);border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid var(--border)">
        <p style="font-size:.85rem;margin-bottom:8px;font-weight:600">&#128302; Coming in Phase 2</p>
        <p style="font-size:.85rem;line-height:1.8">&#128241; Android Widget<br>&#129504; Brain Map (Mind mapping)<br>&#128203; Kanban Board</p>
      </div>
      <p style="font-size:.78rem;color:var(--text-secondary);text-align:center;margin-top:20px">No tracking. No cloud. No ads.<br>Your data stays on your device only.</p>
    </div>`);
}

// ── Mini picker overlay ───────────────────────────────────────────────
function _miniPicker(title, options, callback) {
  const overlay = _makeOverlay();
  overlay.innerHTML = `
    <div class="mini-picker">
      <div style="font-weight:700;padding:16px;font-size:.95rem;border-bottom:1px solid var(--border)">${title}</div>
      ${options.map(o=>`<button class="mini-picker-opt" onclick="_miniPickerSelect(this,'${o.replace(/'/g,"\\'")}',${JSON.stringify(options.indexOf(o))})">${o}</button>`).join("")}
      <button onclick="this.closest('.settings-overlay').remove()" style="display:block;width:100%;padding:14px;border:none;background:none;color:var(--text-secondary);font-size:.9rem;cursor:pointer;border-top:1px solid var(--border)">Cancel</button>
    </div>`;
  window._miniPickerCallback = callback;
  document.body.appendChild(overlay);
}

function _miniPickerSelect(btn, value) {
  document.querySelector(".settings-overlay")?.remove();
  if (window._miniPickerCallback) window._miniPickerCallback(value);
}

function _makeOverlay() {
  const div = document.createElement("div");
  div.className = "settings-overlay";
  div.addEventListener("click", e => { if (e.target === div) div.remove(); });
  return div;
}

// ── Apply saved settings on load ──────────────────────────────────────
(function applyStoredSettings() {
  const fontSize = _getSetting("font-size","medium");
  const sizeMap = {small:"14px",medium:"16px",large:"18px",xlarge:"20px"};
  if (sizeMap[fontSize]) document.documentElement.style.fontSize = sizeMap[fontSize];

  const defColor = _getSetting("def-color","yellow");
  window._defaultNoteColor = defColor;

  const sortOrder = _getSetting("notes-sort","modified");
  if (typeof notesSort !== "undefined") notesSort = sortOrder;
})();
