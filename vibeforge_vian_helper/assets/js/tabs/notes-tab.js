// notes-tab.js
let notesView = "all";
let notesSort = "modified";
let habitDays = 7;
let expensePeriod = "Month";
let expenseCatFilter = "All";
let calView = localStorage.getItem("vian-cal-view") || "month";

async function renderNotesTab(view) {
  if (view) notesView = view;
  let notes;
  if (notesView==="archive") notes = await notesGetArchived();
  else if (notesView==="trash") notes = await notesGetTrashed();
  else notes = (await notesGetAll()).filter(n=>!n.archived);
  notes = sortNotes(notes);
  const el = document.getElementById("tab-notes");
  let header = "";
  if (notesView==="archive"||notesView==="trash") {
    header = `<div style="padding:10px 14px;font-size:.82rem;color:var(--accent);border-bottom:1px solid var(--border)">
      <button onclick="renderNotesTab('all')" style="background:none;border:none;color:var(--accent);font-weight:700;cursor:pointer">&#8592; Back</button>
      &nbsp; ${notesView==="archive"?"Archived":"Trash"}</div>`;
  }
  el.innerHTML = header + renderNoteCards(notes);
}

function sortNotes(notes) {
  if (notesSort==="modified") return [...notes].sort((a,b)=>b.modifiedAt-a.modifiedAt);
  if (notesSort==="created")  return [...notes].sort((a,b)=>b.createdAt-a.createdAt);
  if (notesSort==="alphabetical") return [...notes].sort((a,b)=>(a.title||"").localeCompare(b.title||""));
  if (notesSort==="color")    return [...notes].sort((a,b)=>(a.color||"").localeCompare(b.color||""));
  return notes;
}

function setNotesSort(s) { notesSort=s; renderNotesTab(); closeAllMSDropdowns(); }
function setHabitDays(n) { habitDays=n; renderHabitsTab(); closeAllMSDropdowns(); }
function setExpensePeriod(p) { expensePeriod=p; renderExpenseTab(); closeAllMSDropdowns(); }
function filterExpenseCategory(c) { expenseCatFilter=c; renderExpenseHistory(); closeAllMSDropdowns(); }
function setNotesFilter(f) { notesView=f==="All"?"all":notesView; renderNotesTab(); closeAllMSDropdowns(); }
function setCalView(v) {
  calView = v;
  localStorage.setItem("vian-cal-view", v);
  closeAllMSDropdowns();
  // Small delay lets dropdown close animation finish before re-render
  setTimeout(() => renderCalendarTab().catch(e=>console.warn('calView err:',e)), 20);
}

function _noteDisplayTitle(n) {
  // If has explicit title use it; else use first line of body (ColorNote style)
  if (n.title && n.title.trim()) return n.title;
  if (n.type==="checklist") return (n.items&&n.items[0]) ? n.items[0].text : "Checklist";
  return (n.body||"").split("\n")[0].trim() || "Untitled";
}

// ── Multi-select state ────────────────────────────────────────────────
let _noteSelectMode = false;
let _noteSelected   = new Set();

function _enterNoteSelectMode(id) {
  _noteSelectMode = true;
  _noteSelected.clear();
  _noteSelected.add(id);
  _renderNoteSelectUI();
  renderNotesTab();
}

function _exitNoteSelectMode() {
  _noteSelectMode = false;
  _noteSelected.clear();
  const bar = document.getElementById('note-select-bar');
  if (bar) bar.remove();
  const topbar = document.getElementById('note-select-topbar');
  if (topbar) topbar.remove();
  renderNotesTab();
}

function _toggleNoteSelect(id) {
  if (_noteSelected.has(id)) _noteSelected.delete(id);
  else _noteSelected.add(id);
  // Update count label
  const lbl = document.getElementById('note-sel-count');
  if (lbl) lbl.textContent = _noteSelected.size + ' selected';
  // Update card highlight
  document.querySelectorAll('.note-card[data-nid]').forEach(el => {
    const nid = +el.dataset.nid;
    el.classList.toggle('note-selected', _noteSelected.has(nid));
  });
}

function _renderNoteSelectUI() {
  // Top bar: X | N selected
  let topbar = document.getElementById('note-select-topbar');
  if (!topbar) {
    const header = document.querySelector('.tab-header, #tab-header, header');
    topbar = document.createElement('div');
    topbar.id = 'note-select-topbar';
    topbar.className = 'note-sel-topbar';
    topbar.innerHTML = `
      <button onclick="_exitNoteSelectMode()" class="note-sel-x">&#10005;</button>
      <span id="note-sel-count">${_noteSelected.size} selected</span>
    `;
    // Insert after the tab-notes header area
    const strip = document.getElementById('menu-strip');
    if (strip) strip.parentNode.insertBefore(topbar, strip.nextSibling);
    else document.getElementById('tab-notes').prepend(topbar);
  }

  // Bottom action bar
  let bar = document.getElementById('note-select-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'note-select-bar';
    bar.className = 'note-sel-bar';
    bar.innerHTML = `
      <button class="nsb-btn" onclick="_nsAction('archive')">
        <span>&#128193;</span><span>Archive</span>
      </button>
      <button class="nsb-btn nsb-danger" onclick="_nsAction('delete')">
        <span>&#128465;</span><span>Delete</span>
      </button>
      <button class="nsb-btn" onclick="_nsAction('color')">
        <span>&#127912;</span><span>Color</span>
      </button>
      <button class="nsb-btn" onclick="_nsAction('share')">
        <span>&#128279;</span><span>Share</span>
      </button>
    `;
    document.body.appendChild(bar);
  }
}

async function _nsAction(action) {
  const ids = [..._noteSelected];
  if (!ids.length) return;

  if (action === 'archive') {
    for (const id of ids) await notesArchive(id);
    showToast(`Archived ${ids.length} note${ids.length>1?'s':''}`);
    _exitNoteSelectMode();

  } else if (action === 'delete') {
    if (!confirm(`Delete ${ids.length} note${ids.length>1?'s':''}?`)) return;
    for (const id of ids) await notesDelete(id);
    showToast(`Deleted ${ids.length} note${ids.length>1?'s':''}`);
    _exitNoteSelectMode();

  } else if (action === 'color') {
    // Show color picker overlay
    const colors = {white:'#f5f5f0',red:'#fce8e8',orange:'#fef3e2',yellow:'#fffde7',green:'#e8f5e9',blue:'#e3f2fd',purple:'#f3e5f5',black:'#eceff1',gray:'#f5f5f5'};
    const ov = document.createElement('div');
    ov.className = 'cl-dialog-overlay';
    ov.innerHTML = `<div class="cl-dialog">
      <div class="cl-dialog-title">Set color for ${ids.length} note${ids.length>1?'s':''}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;padding:12px 0;justify-content:center">
        ${Object.entries(colors).map(([name,hex])=>`
          <div onclick="window._nsColorPick('${name}')" style="width:36px;height:36px;border-radius:50%;background:${hex};cursor:pointer;border:2px solid rgba(0,0,0,.15)"></div>
        `).join('')}
      </div>
      <div class="cl-dialog-actions"><button class="cl-dlg-btn" onclick="this.closest('.cl-dialog-overlay').remove()">CANCEL</button></div>
    </div>`;
    document.body.appendChild(ov);
    window._nsColorPick = async (color) => {
      ov.remove();
      for (const id of ids) {
        const n = await dbGet('notes', id);
        if (n) { n.color = color; await notesSave(n); }
      }
      showToast('Color updated');
      _exitNoteSelectMode();
    };

  } else if (action === 'share') {
    const texts = [];
    for (const id of ids) {
      const n = await dbGet('notes', id);
      if (!n) continue;
      const title = _noteDisplayTitle(n);
      const body = n.type === 'checklist'
        ? (n.items||[]).map(i=>(i.done?'✓ ':'✗ ')+i.text).join('\n')
        : (n.body||'');
      texts.push(title + (body ? '\n\n' + body : ''));
    }
    const fullText = texts.join('\n\n---\n\n');
    if (navigator.share) {
      navigator.share({ title: ids.length > 1 ? `${ids.length} notes` : _noteDisplayTitle(await dbGet('notes', ids[0])), text: fullText });
    } else {
      await navigator.clipboard.writeText(fullText);
      showToast('Copied to clipboard');
    }
  }
}

function renderNoteCards(notes) {
  if (!notes.length) return `<div class="empty-state"><div class="ei">&#128221;</div><p>No notes yet. Tap + to add one.</p></div>`;
  return `<div class="notes-list">` + notes.map(n => {
    const c = n.color || "yellow";
    const isCL = n.type === "checklist";
    const dateStr = relativeDate(n.modifiedAt);
    const tags = (n.tags||[]).map(t=>`<span class="tag-chip">${escHtml(t)}</span>`).join("");
    const reminder = n.reminder ? "&#9200; " : "";
    const isSelected = _noteSelectMode && _noteSelected.has(n.id);
    return `<div class="note-card nc-${c}${isSelected?' note-selected':''}"
      data-nid="${n.id||0}"
      onclick="${_noteSelectMode ? `_toggleNoteSelect(${n.id||0})` : `_openNoteById(${n.id||0})`}"
      data-longpress="_enterNoteSelectMode(${n.id||0})">
      <div class="note-color-bar"></div>
      ${isSelected ? `<div class="note-sel-check">&#10003;</div>` : ''}
      <div class="note-card-body">
        <div class="note-card-main">
          <div class="note-card-title">${reminder}${escHtml(_noteDisplayTitle(n))}</div>
          ${tags ? `<div class="note-card-meta">${tags}</div>` : ""}
        </div>
        <div class="note-card-right">
          ${isCL
            ? `<div class="note-card-check">&#10003; ${dateStr}</div>`
            : `<div class="note-card-date">${dateStr}</div>`}
        </div>
      </div>
    </div>`;
  }).join("") + `</div>`;
}


async function _openNoteById(id) {
  if (!id) return;
  const n = await dbGet("notes", id);
  // Open viewer first — tap ✏️ to edit (like ColorNote)
  if (n) openNoteViewer(n);
}

// ── Color maps ────────────────────────────────────────────────────────
const NOTE_HEADER_COLORS = {
  white:"#f5f5f0",red:"#ef4444",orange:"#f97316",yellow:"#eab308",
  green:"#22c55e",blue:"#3b82f6",purple:"#a855f7",black:"#1f2937",gray:"#9ca3af"
};
const NOTE_HEADER_TEXT = {
  white:"#1a1a1a",red:"#fff",orange:"#fff",yellow:"#1a1a1a",
  green:"#fff",blue:"#fff",purple:"#fff",black:"#fff",gray:"#1a1a1a"
};

// ── Code block rendering (viewer) ────────────────────────────────────
// Splits body text on ```...``` fences and renders each code block
// with a dark background and a copy-to-clipboard button.
function _renderBodyWithCodeBlocks(text) {
  if (!text) return "";
  // Store raw code strings for copy, keyed by fence index
  window._codeBlocks = {};
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const raw = part.slice(3, -3).replace(/^\n/, "").replace(/\n$/, "");
      window._codeBlocks[i] = raw;
      return `<div class="note-code-block" contenteditable="false">` +
        `<button class="ncb-copy-btn" onclick="window._copyCodeBlock(${i})" title="Copy">&#128203;</button>` +
        `<pre class="ncb-pre">${escHtml(raw)}</pre>` +
        `</div>`;
    }
    // Normal text — preserve line breaks
    return `<span>${escHtml(part).split("\n").join("<br>")}</span>`;
  }).join("");
}

window._copyCodeBlock = function(idx) {
  const code = (window._codeBlocks || {})[idx];
  if (code === undefined) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => showToast("Code copied!"));
  } else {
    const ta = document.createElement("textarea");
    ta.value = code; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); ta.remove();
    showToast("Code copied!");
  }
};

// ── View mode (read-only, pencil to edit) — matches ColorNote image 1 ─
function openNoteViewer(note) {
  const n = {...note};
  window._currentNote = n;
  const c = n.color||"yellow";
  const hbg = NOTE_HEADER_COLORS[c]||"#eab308";
  const htxt = NOTE_HEADER_TEXT[c]||"#1a1a1a";
  const isChecklist = n.type==="checklist";

  const bodyHTML = isChecklist
    ? `<div class="cl-viewer-list">`+
      (n.items||[]).map((item,i)=>`<div class="cl-viewer-row" id="clv-${i}"
          onclick="toggleViewerCLItem(${i})"
          oncontextmenu="event.preventDefault();openCLItemMenu(${i},this)"
          data-longpress="openCLItemMenu(${i},this)">
        <span class="cl-viewer-check ${item.done?'cl-done':''}">${item.done?"&#10003;":""}</span>
        <span class="cl-viewer-text ${item.done?'cl-strikethrough':''}">${escHtml(item.text||"")}</span>
      </div>`).join("")+`</div>`
    : `<div class="paper-area paper-${c}" style="flex:1;">
        <div class="paper-lines" id="viewer-body" style="padding:0 0 80px;user-select:none;">${_renderBodyWithCodeBlocks(n.body||"")}</div>
      </div>`;

  const html = `
    <div class="fs-header" style="background:${hbg};color:${htxt}">
      <button class="fs-back" onclick="closeFullscreen()" style="color:${htxt}">&#8592;</button>
      <span style="flex:1;font-weight:700;font-size:1.1rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${htxt}">${escHtml(_noteDisplayTitle(n))}</span>
      <button onclick="window._editorFromViewer=true;openNoteEditor(window._currentNote)" style="background:none;border:none;color:${htxt};font-size:1.3rem;cursor:pointer;padding:6px 10px;line-height:1" title="Edit">&#9998;</button>
      <button class="fs-menu-btn" onclick="openNoteMenu(${n.id||"null"},this)" style="color:${htxt}">&#8942;</button>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 16px;font-size:.76rem;background:${hbg};color:${htxt};opacity:.85">
      <span>${relativeDate(n.modifiedAt||Date.now())}</span>
      <span>${formatDateTime(n.modifiedAt||n.createdAt||Date.now())}</span>
    </div>
    <div id="viewer-scroll" style="flex:1;overflow-y:auto;background:var(--bg)">
      ${isChecklist ? bodyHTML : bodyHTML}
      ${_renderAttachmentsViewer(n)}
    </div>`;
  openFullscreen(html);
  // Double-tap on text body → open editor with cursor where tapped
  if (!isChecklist) {
    setTimeout(() => _initViewerDoubleTap(n), 80);
  }
}

// ── Render attachments in viewer ──────────────────────────────────────
function _renderAttachmentsViewer(n) {
  if (!(n.attachments||[]).length) return "";
  return (n.attachments||[]).map((att, i) => {
    if (att.type==="image"||att.type==="drawing") {
      return `<div class="attach-block" id="att-${i}">
        <img class="attach-img" src="${att.data}" alt="${escHtml(att.name||"")}"
          onclick="_attSingleTap(${i})"
          ondblclick="event.preventDefault();_attDoubleTap(${i})"
          data-longpress="_attDoubleTap(${i})"/>
        <div class="attach-actions" id="att-act-${i}">
          <button class="attach-act-btn" onclick="_deleteAttachment(${i})">🗑 Delete</button>
          <button class="attach-act-btn" onclick="_viewImageOverlay(window._currentNote.attachments[${i}].data)">🔍 View</button>
        </div>
      </div>`;
    } else if (att.type==="table") {
      const thead = `<tr>${(att.headers||[]).map(h=>`<th>${escHtml(h)}</th>`).join("")}</tr>`;
      const tbody = (att.data||[]).map(row=>`<tr>${row.map(c=>`<td>${escHtml(c)}</td>`).join("")}</tr>`).join("");
      return `<div class="attach-block" id="att-${i}" onclick="_openTableBuilder(window._currentNote.attachments[${i}], ${i})">
        <div class="attach-table-wrap">
          <table class="attach-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>
        </div>
        <div style="font-size:.72rem;color:var(--text-secondary);padding:2px 0">Tap to edit table</div>
      </div>`;
    }
    return "";
  }).join("");
}

// Attachment viewer single/double tap
let _attTapTimer = null;
function _attSingleTap(i) {
  // delay to allow double-tap detection
  _attTapTimer = setTimeout(() => _viewImageOverlay(window._currentNote.attachments[i].data), 250);
}
function _attDoubleTap(i) {
  clearTimeout(_attTapTimer);
  const act = document.getElementById("att-act-"+i);
  if (act) act.classList.toggle("visible");
  // Show resize controls if not already
  const block = document.getElementById("att-"+i);
  if (!block) return;
  const img = block.querySelector(".attach-img");
  if (!img) return;
  let rc = block.querySelector(".att-resize-ctrl");
  if (!rc) {
    rc = document.createElement("div");
    rc.className = "att-resize-ctrl";
    rc.style = "padding:6px 12px;background:rgba(0,0,0,.6);border-radius:0 0 8px 8px;display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;";
    rc.innerHTML = `<span style="color:#fff;font-size:.75rem;flex-shrink:0">Size</span>
      <input type="range" min="60" max="100" value="${window._attSizes&&window._attSizes[i]||100}"
        style="flex:1;accent-color:#0D9488"
        oninput="_attResize(${i},this.value)"/>`;
    img.parentNode.insertBefore(rc, img.nextSibling);
  } else {
    rc.style.display = rc.style.display === "none" ? "" : "none";
  }
}

function _attResize(i, pct) {
  if (!window._attSizes) window._attSizes = {};
  window._attSizes[i] = pct;
  const block = document.getElementById("att-"+i);
  if (!block) return;
  const img = block.querySelector(".attach-img");
  if (img) img.style.maxWidth = pct + "%";
}

function _viewImageOverlay(src) {
  const ov = document.createElement("div");
  ov.style = "position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:800;display:flex;align-items:center;justify-content:center;";
  ov.innerHTML = `<img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px"/>`;
  ov.onclick = () => ov.remove();
  document.body.appendChild(ov);
}

function _deleteAttachment(i) {
  if (!confirm("Delete this attachment?")) return;
  window._currentNote.attachments.splice(i, 1);
  notesSave(window._currentNote).then(() => openNoteViewer(window._currentNote));
}

// ── Edit mode ─────────────────────────────────────────────────────────
function openNoteEditor(note, type, _cursorPos) {
  const n = note ? {...note} : {type:type||"text",color:"yellow",tags:[],body:"",title:"",items:[],createdAt:Date.now()};
  window._currentNote = n;
  const isChecklist = n.type==="checklist";
  const c = n.color||"yellow";
  const hbg = NOTE_HEADER_COLORS[c]||"#eab308";
  const htxt = NOTE_HEADER_TEXT[c]||"#1a1a1a";

  const html = `
    <div class="fs-header" id="note-header" style="background:${hbg};color:${htxt}">
      <button class="fs-back" onclick="saveNote()" style="color:${htxt}">&#8592;</button>
      <input class="fs-title-input" id="note-title" placeholder="Title" value="${escAttr(n.title||"")}" style="color:${htxt};background:transparent"/>
      <div class="note-color-swatch nc-${c}" id="color-swatch" onclick="openNoteColorPicker()" style="width:28px;height:28px;border-radius:6px;flex-shrink:0;cursor:pointer;background:${hbg};border:2px solid ${htxt}4a"></div>
      <button class="fs-menu-btn" onclick="openNoteMenu(${n.id||"null"},this)" style="color:${htxt}">&#8942;</button>
    </div>
    <div class="fs-meta" style="background:${hbg};color:${htxt}99;font-size:.76rem;display:flex;justify-content:space-between;padding:4px 16px">
      <span>${n.id?"Editing":"New note"}</span>
      <span>${formatDateTime(n.modifiedAt||Date.now())}</span>
    </div>
    <div class="paper-area paper-${c}" id="paper-area" style="flex:1;overflow-y:auto;min-height:0;">
      ${isChecklist ? renderChecklistEditor(n) : `
        <div class="paper-lines" id="note-body-wrap">
          <div class="paper-textarea" id="note-body" contenteditable="true"
            data-placeholder="Start writing..."
            spellcheck="true"
            oninput="_noteBodyInput()"
          >${_bodyToHtml(n.body||"")}</div>
        </div>`}
    </div>
    <div class="editor-toolbar" id="note-toolbar" style="flex-shrink:0;">
      <button class="tb-btn" title="Attach" onclick="openAttachmentPicker()">&#128206;</button>
      <button class="tb-btn" title="Undo" onclick="document.execCommand('undo')">&#8617;</button>
      <button class="tb-btn" title="Redo" onclick="document.execCommand('redo')">&#8618;</button>
      <button class="tb-btn" title="Insert code block" onclick="insertCodeBlock()">&#128187;</button>
      <div style="flex:1"></div>
      ${(n.tags||[]).map(t=>`<span class="tag-chip">${escHtml(t)}</span>`).join("")}
    </div>`;
  openFullscreen(html);
  // Place cursor at tapped position if provided
  if (_cursorPos !== undefined && !isChecklist) {
    setTimeout(() => {
      const ta = document.getElementById("note-body");
      if (ta) {
        ta.focus();
        const pos = Math.min(_cursorPos, (ta.value||"").length);
        ta.setSelectionRange(pos, pos);
      }
    }, 80);
  }
  // Show attachment previews in toolbar
  setTimeout(() => {
    const tb = document.getElementById("note-toolbar");
  }, 100);
}

// ── Checklist editor — ColorNote style ───────────────────────────────
// Items shown as rows (tap to edit via dialog, X to delete)
// "Add Item" button opens a dialog with NEXT / CANCEL / OK
// ── Insert code block into contenteditable body ───────────────────────
function insertCodeBlock() {
  const body = document.getElementById("note-body");
  if (!body) return;
  body.focus();
  const sel = window.getSelection();
  let selectedText = "";
  if (sel && sel.rangeCount > 0) {
    selectedText = sel.toString();
  }
  const fence = "```\n" + (selectedText || "") + "\n```";
  // Insert as plain text — stored as ``` markers, rendered by viewer
  document.execCommand("insertText", false, fence);
}

function renderChecklistEditor(n) {
  const items = n.items||[];
  const rowHtml = (item, i) => `
    <div class="cl-item-row" id="cli-${i}" onclick="editCLItemDialog(${i})">
      <span class="cl-item-label">${escHtml(item.text||"") || '<span class="cl-empty-label">Tap to edit</span>'}</span>
      <button class="cl-del-btn" onclick="event.stopPropagation();deleteCLItem(${i})">&#10005;</button>
    </div>`;

  return `<div class="checklist-area" id="cl-area">
    <button class="cl-add-btn" onclick="addCLItemDialog(0)">
      <span class="cl-add-icon">&#43;</span><span class="cl-add-label">Add Item</span>
    </button>
    ${items.map((item,i) => rowHtml(item, i)).join("")}
    ${items.length ? `<button class="cl-add-btn" style="margin-top:4px" onclick="addCLItemDialog(${items.length})">
      <span class="cl-add-icon">&#43;</span><span class="cl-add-label">Add Item</span>
    </button>` : ""}
  </div>`;
}

// ColorNote "Add Item" dialog — NEXT adds another, OK saves, CANCEL dismisses
function addCLItemDialog(insertAt) {
  const n = window._currentNote;
  if(!n.items) n.items = [];
  const pos = (insertAt !== undefined) ? Math.min(insertAt, n.items.length) : n.items.length;
  _showCLDialog("Add Item", "", (text, action) => {
    if (action === "cancel") return;
    if (!text.trim()) return;
    n.items.splice(pos, 0, {text: text.trim(), done: false});
    _refreshCLArea();
    if (action === "next") {
      // Next item inserts right after this one
      setTimeout(() => addCLItemDialog(pos + 1), 80);
    }
  });
}

// Edit existing item via dialog
function editCLItemDialog(i) {
  const n = window._currentNote;
  const item = (n.items||[])[i];
  if (!item) return;
  _showCLDialog("Edit Item", item.text||"", (text, action) => {
    if (action === "cancel") return;
    n.items[i].text = text.trim();
    _refreshCLArea();
    if (action === "next") {
      // Move to next item or add new
      const nextI = i + 1;
      setTimeout(() => {
        if (nextI < n.items.length) editCLItemDialog(nextI);
        else addCLItemDialog();
      }, 80);
    }
  });
}

// Shared dialog builder — title, prefill, callback(text, "ok"|"next"|"cancel")
function _showCLDialog(title, value, cb) {
  const ov = document.createElement("div");
  ov.className = "cl-dialog-overlay";
  ov.innerHTML = `
    <div class="cl-dialog">
      <div class="cl-dialog-title">${title}</div>
      <input class="cl-dialog-input" id="cl-dlg-inp" type="text"
        value="${escAttr(value)}" placeholder=""
        autocomplete="off" spellcheck="true"/>
      <div class="cl-dialog-actions">
        <button class="cl-dlg-btn" id="cl-dlg-next">NEXT</button>
        <button class="cl-dlg-btn" id="cl-dlg-cancel">CANCEL</button>
        <button class="cl-dlg-btn cl-dlg-ok" id="cl-dlg-ok">OK</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const inp = document.getElementById("cl-dlg-inp");
  setTimeout(() => { inp.focus(); inp.select(); }, 60);

  function _done(action) {
    const text = inp.value;
    ov.remove();
    cb(text, action);
  }

  document.getElementById("cl-dlg-next").onclick   = () => _done("next");
  document.getElementById("cl-dlg-cancel").onclick = () => _done("cancel");
  document.getElementById("cl-dlg-ok").onclick     = () => _done("ok");
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); _done("ok"); }
    if (e.key === "Escape") _done("cancel");
  });
}

function _refreshCLArea() {
  const pa = document.getElementById("paper-area");
  if (pa) pa.innerHTML = renderChecklistEditor(window._currentNote);
}

function toggleCLItem(i) {
  const n = window._currentNote;
  n.items[i].done = !n.items[i].done;
  const cb = document.querySelector(`#cli-${i} .cl-checkbox`);
  const inp = document.querySelector(`#cli-${i} .cl-item-text`);
  if(cb){cb.classList.toggle("checked",n.items[i].done); cb.innerHTML=n.items[i].done?"&#10003;":"";}
  if(inp) inp.classList.toggle("done-text",n.items[i].done);
}

function deleteCLItem(i) {
  window._currentNote.items.splice(i,1);
  _refreshCLArea();
}

// Legacy — kept for Enter-key compat; now dialog-based
function addCLItem(insertAt) {
  addCLItemDialog(insertAt);
}

// ── Color picker ──────────────────────────────────────────────────────
function openNoteColorPicker() {
  const colors={white:"#f5f5f5",red:"#ef4444",orange:"#f97316",yellow:"#eab308",green:"#22c55e",blue:"#3b82f6",purple:"#a855f7",black:"#1f2937",gray:"#9ca3af"};
  let html=`<div class="color-picker" style="flex-wrap:wrap;gap:10px;">`;
  Object.entries(colors).forEach(([name,hex])=>{
    html+=`<div class="color-dot ${window._currentNote.color===name?"selected":""}" style="background:${hex}" onclick="setNoteColor('${name}')" title="${name}"></div>`;
  });
  html+=`</div>`;
  const div=document.createElement("div");
  div.style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:16px;z-index:600;box-shadow:0 4px 20px rgba(0,0,0,.2)";
  div.innerHTML=html; document.body.appendChild(div); window._cpDiv=div;
  setTimeout(()=>document.addEventListener("click",_closeCPOutside,true),10);
}
function _closeCPOutside(e){if(window._cpDiv&&!window._cpDiv.contains(e.target)){window._cpDiv.remove();document.removeEventListener("click",_closeCPOutside,true);}}
function setNoteColor(color) {
  window._currentNote.color=color;
  const hbg = NOTE_HEADER_COLORS[color]||"#eab308";
  const htxt = NOTE_HEADER_TEXT[color]||"#1a1a1a";
  const hdr = document.getElementById("note-header");
  const pa  = document.getElementById("paper-area");
  const sw  = document.getElementById("color-swatch");
  if(hdr){ hdr.style.background=hbg; hdr.querySelectorAll("*").forEach(el=>{ if(el.style.color!==undefined&&el.tagName!=="INPUT") el.style.color=htxt; }); }
  if(pa) pa.className="paper-area paper-"+color;
  if(sw) sw.style.background=hbg;
  if(window._cpDiv){window._cpDiv.remove();document.removeEventListener("click",_closeCPOutside,true);}
}

// ── Attachment picker — Image / Drawing / Table ─────────────────────
function openAttachmentPicker() {
  // Bottom sheet: 3 options
  const sheet = document.createElement("div");
  sheet.id = "att-sheet";
  sheet.style = "position:fixed;inset:0;z-index:800;display:flex;flex-direction:column;justify-content:flex-end";
  sheet.innerHTML = `
    <div style="position:absolute;inset:0;background:rgba(0,0,0,.4)" onclick="document.getElementById('att-sheet').remove()"></div>
    <div style="position:relative;background:var(--surface);border-radius:18px 18px 0 0;padding:16px 12px 32px;display:flex;gap:12px;justify-content:center">
      <button onclick="_attPickImage()" class="att-pick-btn">
        <span style="font-size:2rem">&#128247;</span><br>Image
      </button>
      <button onclick="_attPickDrawing()" class="att-pick-btn">
        <span style="font-size:2rem">&#9998;</span><br>Drawing
      </button>
      <button onclick="_attPickTable()" class="att-pick-btn">
        <span style="font-size:2rem">&#128202;</span><br>Table
      </button>
    </div>`;
  document.body.appendChild(sheet);
}
function _attCloseSheet(){ const s=document.getElementById("att-sheet"); if(s) s.remove(); }

// ── IMAGE ─────────────────────────────────────────────────────────────
function _attPickImage() {
  _attCloseSheet();
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "image/*";
  inp.onchange = ev => {
    const file = ev.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = re => _insertInlineImage(re.target.result, file.name);
    reader.readAsDataURL(file);
  };
  inp.click();
}

function _insertInlineImage(src, name) {
  const wrap = document.createElement("div");
  wrap.className = "note-inline-wrap";
  wrap.setAttribute("contenteditable","false");
  const img = document.createElement("img");
  img.src = src; img.alt = name||"image"; img.className = "note-inline-img";
  img.title = "Tap to view · Long-press to delete";
  img.onclick = () => _viewOverlay(src);
  _longPress(img, () => { if(confirm("Remove image?")) wrap.remove(); });
  wrap.appendChild(img);
  _insertBlockAtCursor(wrap);
}

// ── DRAWING ───────────────────────────────────────────────────────────
function _attPickDrawing() {
  _attCloseSheet();
  _openDrawingCanvas();
}

function _openDrawingCanvas() {
  const modal = document.createElement("div");
  modal.className = "draw-modal";
  const colors = ["#1a1a1a","#ef4444","#3b82f6","#22c55e","#f97316","#a855f7","#eab308","#ffffff"];
  let curColor = colors[0], curSize = 4, drawing = false, lx = 0, ly = 0;

  modal.innerHTML = `
    <div class="draw-toolbar">
      <button onclick="this.closest('.draw-modal').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;padding:0 8px">&#8592;</button>
      <div style="flex:1;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${colors.map((c,i)=>`<div class="draw-color-btn ${i===0?"active":""}" data-c="${c}" style="background:${c};border:2px solid ${i===7?"#ccc":"transparent"}" onclick="_dcPick(this,'${c}')"></div>`).join("")}
      </div>
      <button class="draw-size-btn active" onclick="_dsPick(this,3)">S</button>
      <button class="draw-size-btn" onclick="_dsPick(this,7)">M</button>
      <button class="draw-size-btn" onclick="_dsPick(this,14)">L</button>
      <button style="background:none;border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;font-size:.85rem;margin-left:4px" onclick="_drawErase()">Erase</button>
      <button style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700;font-size:.9rem;margin-left:6px" onclick="_saveDrawing()">Save</button>
    </div>
    <canvas class="draw-canvas" id="draw-cvs" style="background:#fff;touch-action:none"></canvas>`;
  document.body.appendChild(modal);

  const cvs = document.getElementById("draw-cvs");
  const ctx = cvs.getContext("2d");
  requestAnimationFrame(() => {
    cvs.width  = cvs.offsetWidth;
    cvs.height = cvs.offsetHeight;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
  });

  window._drawCtx = ctx; window._drawColor = curColor; window._drawSize = curSize;

  function pos(e) {
    const r = cvs.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {x: t.clientX - r.left, y: t.clientY - r.top};
  }
  function start(e){ e.preventDefault(); drawing=true; const p=pos(e); lx=p.x; ly=p.y; }
  function move(e) {
    if(!drawing) return; e.preventDefault();
    const p=pos(e), c=window._drawCtx;
    c.strokeStyle = window._drawErasing ? "#fff" : window._drawColor;
    c.lineWidth   = window._drawErasing ? 22 : window._drawSize;
    c.beginPath(); c.moveTo(lx,ly); c.lineTo(p.x,p.y); c.stroke();
    lx=p.x; ly=p.y;
  }
  cvs.addEventListener("mousedown", start);  cvs.addEventListener("touchstart", start, {passive:false});
  cvs.addEventListener("mousemove", move);   cvs.addEventListener("touchmove",  move,  {passive:false});
  cvs.addEventListener("mouseup",  ()=>drawing=false); cvs.addEventListener("touchend",()=>drawing=false);

  window._dcPick = (el,c) => { window._drawColor=c; window._drawErasing=false; document.querySelectorAll(".draw-color-btn").forEach(b=>b.classList.remove("active")); el.classList.add("active"); };
  window._dsPick = (el,s) => { window._drawSize=s;  window._drawErasing=false; document.querySelectorAll(".draw-size-btn").forEach(b=>b.classList.remove("active")); el.classList.add("active"); };
  window._drawErase = () => window._drawErasing = true;
  window._saveDrawing = () => {
    const dataUrl = cvs.toDataURL("image/png");
    modal.remove();
    _insertInlineImage(dataUrl, "drawing_"+Date.now()+".png");
  };
}

// ── TABLE ─────────────────────────────────────────────────────────────
function _attPickTable() {
  _attCloseSheet();
  _openInlineTableBuilder();
}

function _openInlineTableBuilder() {
  let rows = 3, cols = 3;
  let headers = ["Col 1","Col 2","Col 3"];
  let data = [["","",""],["","",""],["","",""]];

  const modal = document.createElement("div");
  modal.className = "table-modal";
  document.body.appendChild(modal);

  function rebuild() {
    modal.innerHTML = `
      <div class="table-modal-header">
        <button onclick="this.closest('.table-modal').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer">&#8592;</button>
        <span style="font-weight:700;font-size:1rem">Table</span>
        <div style="display:flex;gap:6px">
          <button onclick="_tblAddCol()" style="background:none;border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:.82rem;cursor:pointer">+Col</button>
          <button onclick="_tblAddRow()" style="background:none;border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:.82rem;cursor:pointer">+Row</button>
          <button onclick="_tblSaveInline()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;font-size:.9rem;cursor:pointer">Insert</button>
        </div>
      </div>
      <div class="table-editor">
        <table class="attach-table" style="width:100%">
          <thead><tr>${headers.map((h,i)=>`<th><input class="table-edit-cell" value="${escAttr(h)}" oninput="window._tblH[${i}]=this.value" placeholder="Header"/></th>`).join("")}</tr></thead>
          <tbody>${data.map((row,ri)=>`<tr>${row.map((cell,ci)=>`<td><input class="table-edit-cell" value="${escAttr(cell)}" oninput="window._tblD[${ri}][${ci}]=this.value"/></td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>`;
    window._tblH = [...headers];
    window._tblD = data.map(r=>[...r]);
  }
  rebuild();

  window._tblAddCol = () => { cols++; headers.push("Col "+cols); data=data.map(r=>[...r,""]); rebuild(); };
  window._tblAddRow = () => { rows++; data.push(Array(cols).fill("")); rebuild(); };
  window._tblSaveInline = () => {
    // Freeze current edited values from inputs before saving
    modal.querySelectorAll("thead input").forEach((inp,i) => { window._tblH[i] = inp.value; });
    modal.querySelectorAll("tbody tr").forEach((tr, ri) => {
      tr.querySelectorAll("input").forEach((inp, ci) => { window._tblD[ri][ci] = inp.value; });
    });
    const wrap = _buildInlineTable(window._tblH, window._tblD);
    modal.remove();
    _insertBlockAtCursor(wrap);
  };
}

// ── Shared inline insert helper ───────────────────────────────────────
function _insertBlockAtCursor(node) {
  const body = document.getElementById("note-body");
  if (!body) return;
  body.focus();

  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && body.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    const range = sel.getRangeAt(0);
    // If cursor is mid-text, move to a new line first
    // so the block starts exactly on a notebook rule
    const isAtStart = range.startOffset === 0 &&
      (range.startContainer === body ||
       range.startContainer.previousSibling == null ||
       range.startContainer.previousSibling.nodeName === "BR");
    if (!isAtStart) {
      document.execCommand("insertHTML", false, "<br>");
    }
    const sel2 = window.getSelection();
    const r2   = sel2.getRangeAt(0);
    r2.insertNode(node);
    r2.setStartAfter(node);
    r2.collapse(true);
    sel2.removeAllRanges();
    sel2.addRange(r2);
  } else {
    body.appendChild(node);
  }
  // Insert a proper 35px-height empty line after the block
  // so the notebook grid re-syncs correctly for text that follows
  const spacer = document.createElement("span");
  spacer.style.cssText = "display:block;height:35px;line-height:35px;font-size:30px";
  spacer.innerHTML = "​"; // zero-width space — invisible but holds line height
  const sel3 = window.getSelection();
  if (sel3 && sel3.rangeCount > 0) {
    const r3 = sel3.getRangeAt(0);
    r3.insertNode(spacer);
    // Put cursor INSIDE spacer so user can type there
    r3.setStart(spacer, 0);
    r3.setEnd(spacer, spacer.childNodes.length);
    r3.collapse(false);
    sel3.removeAllRanges();
    sel3.addRange(r3);
  }
}

function _viewOverlay(src) {
  const ov = document.createElement("div");
  ov.style = "position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:999;display:flex;align-items:center;justify-content:center;cursor:zoom-out";
  ov.onclick = () => ov.remove();
  const img = document.createElement("img");
  img.src = src;
  img.style = "max-width:100%;max-height:90vh;object-fit:contain;border-radius:6px";
  ov.appendChild(img);
  document.body.appendChild(ov);
}

function _longPress(el, fn) {
  let t;
  el.addEventListener("touchstart", () => t=setTimeout(fn, 700), {passive:true});
  el.addEventListener("touchend",   () => clearTimeout(t),        {passive:true});
  el.addEventListener("touchmove",  () => clearTimeout(t),        {passive:true});
}


// Keep legacy _viewInlineImg alias
function _viewInlineImg(img) { _viewOverlay(img.src); }

// ── Build interactive inline table ───────────────────────────────────
function _buildInlineTable(headers, data) {
  const table = document.createElement("table");
  table.className = "note-inline-table";

  // Header row — long-press on header triggers table menu
  const thead = table.createTHead();
  const hrow  = thead.insertRow();
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    hrow.appendChild(th);
  });

  // Data rows — tap to edit cell
  const tbody = table.createTBody();
  data.forEach((row, ri) => {
    const tr = tbody.insertRow();
    row.forEach((cell, ci) => {
      const td = tr.insertCell();
      td.textContent = cell;
      td.dataset.ri = ri;
      td.dataset.ci = ci;
      // Tap = edit cell
      td.addEventListener("click", function(e) {
        e.stopPropagation();
        _editTableCell(td, table);
      });
    });
  });

  const wrap = document.createElement("div");
  wrap.className = "note-inline-wrap note-inline-table-wrap";
  wrap.setAttribute("contenteditable", "false");
  wrap.appendChild(table);

  // Long-press on the whole wrap = table context menu (edit/delete)
  _longPress(wrap, (e) => _tableContextMenu(wrap, table, headers, data));

  return wrap;
}

function _editTableCell(td, table) {
  const oldVal = td.textContent;
  const ov = document.createElement("div");
  ov.className = "table-cell-edit-overlay";
  ov.innerHTML = `
    <div class="table-cell-edit-box">
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">
        Edit cell · Col ${parseInt(td.dataset.ci)+1}
      </div>
      <input id="tce-inp" type="text" value="${escAttr(oldVal)}" placeholder="Enter value"/>
      <div class="table-cell-edit-actions">
        <button onclick="this.closest('.table-cell-edit-overlay').remove()"
          style="padding:8px 16px;border:1px solid var(--border);border-radius:8px;background:none;color:var(--text);font-size:14px;cursor:pointer">
          Cancel
        </button>
        <button id="tce-ok"
          style="padding:8px 18px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">
          OK
        </button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const inp = document.getElementById("tce-inp");
  setTimeout(() => inp.focus(), 50);
  // Select all on focus
  inp.addEventListener("focus", () => inp.select());
  // OK saves
  document.getElementById("tce-ok").onclick = () => {
    td.textContent = inp.value;
    ov.remove();
  };
  // Enter = save
  inp.addEventListener("keydown", e => { if(e.key==="Enter"){ td.textContent=inp.value; ov.remove(); }});
  // Tap outside = cancel
  ov.addEventListener("click", e => { if(e.target===ov) ov.remove(); });
}

function _tableContextMenu(wrap, table, headers, data) {
  // Close any open menus
  document.querySelectorAll(".table-ctx-menu").forEach(m => m.remove());

  const menu = document.createElement("div");
  menu.className = "table-ctx-menu";
  menu.innerHTML = `
    <button onclick="_tableAddRow(this)">&#43; Add Row</button>
    <button onclick="_tableAddCol(this)">&#43; Add Column</button>
    <button onclick="_tableEditHeaders(this)">&#9998; Edit Headers</button>
    <button class="danger" onclick="_tableDelete(this)">&#128465; Delete Table</button>`;
  // Position near centre of screen
  menu.style.cssText = "top:40%;left:50%;transform:translate(-50%,-50%);position:fixed";
  // Store refs
  menu._wrap  = wrap;
  menu._table = table;
  document.body.appendChild(menu);
  // Close on outside tap
  setTimeout(() => document.addEventListener("click", function _cm(e){
    if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("click",_cm); }
  }, {once:false}), 50);
}

window._tableAddRow = function(btn) {
  const menu  = btn.closest(".table-ctx-menu");
  const table = menu._table;
  const cols  = table.rows[0].cells.length;
  const tr    = table.tBodies[0].insertRow();
  for (let i=0; i<cols; i++) {
    const td = tr.insertCell();
    td.dataset.ri = table.tBodies[0].rows.length - 1;
    td.dataset.ci = i;
    td.addEventListener("click", function(e){ e.stopPropagation(); _editTableCell(td, table); });
  }
  menu.remove();
};

window._tableAddCol = function(btn) {
  const menu  = btn.closest(".table-ctx-menu");
  const table = menu._table;
  // Add header cell
  const th = document.createElement("th");
  th.textContent = "Col " + (table.rows[0].cells.length + 1);
  table.tHead.rows[0].appendChild(th);
  // Add data cells to each body row
  Array.from(table.tBodies[0].rows).forEach((tr, ri) => {
    const td = tr.insertCell();
    td.dataset.ri = ri;
    td.dataset.ci = tr.cells.length - 1;
    td.addEventListener("click", function(e){ e.stopPropagation(); _editTableCell(td, table); });
  });
  menu.remove();
};

window._tableEditHeaders = function(btn) {
  const menu  = btn.closest(".table-ctx-menu");
  const table = menu._table;
  menu.remove();
  const ths = Array.from(table.tHead.rows[0].cells);
  const ov  = document.createElement("div");
  ov.className = "table-cell-edit-overlay";
  ov.innerHTML = `
    <div class="table-cell-edit-box">
      <div style="font-weight:700;margin-bottom:12px">Edit Headers</div>
      ${ths.map((th,i)=>`<input data-i="${i}" value="${escAttr(th.textContent)}" 
        style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:14px;margin-bottom:8px"/>`).join("")}
      <div class="table-cell-edit-actions">
        <button onclick="this.closest('.table-cell-edit-overlay').remove()"
          style="padding:8px 16px;border:1px solid var(--border);border-radius:8px;background:none;color:var(--text);font-size:14px;cursor:pointer">
          Cancel
        </button>
        <button id="teh-ok"
          style="padding:8px 18px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">
          Save
        </button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById("teh-ok").onclick = () => {
    ov.querySelectorAll("input[data-i]").forEach(inp => {
      ths[parseInt(inp.dataset.i)].textContent = inp.value;
    });
    ov.remove();
  };
  ov.addEventListener("click", e => { if(e.target===ov) ov.remove(); });
};

window._tableDelete = function(btn) {
  const menu = btn.closest(".table-ctx-menu");
  const wrap = menu._wrap;
  menu.remove();
  if (confirm("Delete this table?")) wrap.remove();
};



// ── Save ──────────────────────────────────────────────────────────────
async function saveNote() {
  const n = window._currentNote;
  const ti = document.getElementById("note-title");
  const tb = document.getElementById("note-body");
  if(ti) n.title = ti.value.trim();
  if(tb) n.body = _htmlToBody(tb);
  await notesSave(n);
  // Return to viewer if editor was opened from viewer, else close to list
  if (window._editorFromViewer) {
    window._editorFromViewer = false;
    openNoteViewer(n);
  } else {
    closeFullscreen();
  }
}

// Convert plain text body → HTML for contenteditable (preserve newlines as <br>)
function _bodyToHtml(text) {
  if (!text) return "";
  // If already has HTML tags (old data with img), return as-is
  if (/<img|<div|<br/.test(text)) return text;
  return escHtml(text).replace(/\n/g, "<br>");
}

// Convert contenteditable HTML → stored body text (keep <img> tags inline)
function _htmlToBody(el) {
  // Clone so we don't mutate DOM
  const clone = el.cloneNode(true);
  // Replace <br> and block elements with newlines
  clone.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
  clone.querySelectorAll("div").forEach(d => {
    d.insertAdjacentText("beforebegin", "\n");
    d.replaceWith(...d.childNodes);
  });
  // Get text but preserve <img> tags
  let result = "";
  clone.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) result += node.textContent;
    else if (node.nodeName === "IMG") result += node.outerHTML;
    else result += node.textContent;
  });
  return result.replace(/^\n+|\n+$/g, "");
}

// Keep first line as title while typing
function _noteBodyInput() {
  const tb = document.getElementById("note-body");
  const ti = document.getElementById("note-title");
  if (!tb || !ti || ti.value.trim()) return;
  // Auto-title from first line of body
  const firstLine = (tb.innerText || "").split("\n")[0].substring(0, 60);
  if (firstLine) ti.placeholder = firstLine;
}

// ── Note menu ─────────────────────────────────────────────────────────
function openNoteMenu(id, btn) {
  const items = [
    {label:"&#127991; Tags",    action:()=>openTagEdit()},
    {label:"&#128274; Lock",    action:()=>showToast("Lock coming soon")},
    {label:"&#128228; Share",   action:()=>shareNote()},
    {label:"&#128193; Archive", action:async()=>{if(id){await notesArchive(id);closeFullscreen();showToast("Archived");}}},
    {label:"&#128465; Delete",  action:async()=>{if(id&&confirm("Delete this note?")){await notesDelete(id);closeFullscreen();}}}
  ];
  showContextMenu(items, btn);
}

function shareNote() {
  const n=window._currentNote;
  const text=(n.title||"Untitled")+"\n\n"+(n.body||(n.items||[]).map(i=>(i.done?"[x] ":"[ ] ")+i.text).join("\n"));
  if(navigator.share) navigator.share({title:n.title,text});
  else{navigator.clipboard&&navigator.clipboard.writeText(text);showToast("Copied to clipboard");}
}

function openTagEdit() {
  const n=window._currentNote;
  const cur=(n.tags||[]).join(", ");
  const v=prompt("Edit tags (comma separated):",cur);
  if(v===null) return;
  n.tags=v.split(",").map(t=>t.trim()).filter(t=>t.length>0);
  showToast("Tags updated");
}

// ── Menu strip ────────────────────────────────────────────────────────
function updateMenuStrip(tab) {
  const strip = document.getElementById("menu-strip");
  if (!strip) return;
  if (tab==="notes") {
    strip.innerHTML = `
      <button class="msb" onclick="toggleMSDropdown('sort-dd',this)">Sort &#9660;</button>
      <button class="msb" onclick="toggleMSDropdown('filter-dd',this)">Filter &#9660;</button>
      <button class="msb" onclick="toggleMSDropdown('view-dd',this)">View &#9660;</button>
      <button class="msb" onclick="openGlobalSearch()">&#128269; Search</button>
      <div id="sort-dd" class="ms-dropdown hidden">
        ${["Modified","Created","Alphabetical","Color"].map(s=>`<button onclick="setNotesSort('${s.toLowerCase()}',this)">${s}</button>`).join("")}
      </div>
      <div id="filter-dd" class="ms-dropdown hidden">
        <button onclick="setNotesFilter('All',this)">All</button>
        <button onclick="setNotesFilter('Notes only',this)">Notes only</button>
        <button onclick="setNotesFilter('Checklists only',this)">Checklists only</button>
      </div>
      <div id="view-dd" class="ms-dropdown hidden">
        <button onclick="showToast('List view')">List</button>
        <button onclick="showToast('Grid coming soon')">Grid</button>
      </div>`;
  } else if (tab==="habits") {
    strip.innerHTML = `
      <button class="msb" onclick="toggleMSDropdown('hsort-dd',this)">Sort &#9660;</button>
      <button class="msb" onclick="toggleMSDropdown('hperiod-dd',this)">Days &#9660;</button>
      <div id="hsort-dd" class="ms-dropdown hidden">
        <button onclick="showToast('Manual order')">Manual</button>
        <button onclick="showToast('Sort by name')">Name</button>
        <button onclick="showToast('Sort by score')">Score</button>
      </div>
      <div id="hperiod-dd" class="ms-dropdown hidden">
        <button onclick="setHabitDays(3)">3 days</button>
        <button onclick="setHabitDays(5)">5 days</button>
        <button onclick="setHabitDays(7)">7 days</button>
      </div>`;
  } else if (tab==="expense") {
    strip.innerHTML = `
      <button class="msb" onclick="toggleMSDropdown('eperiod-dd',this)">Period &#9660;</button>
      <button class="msb" onclick="toggleMSDropdown('ecat-dd',this)">Category &#9660;</button>
      <button class="msb" onclick="renderExpenseAnalytics()">Analytics</button>
      <div id="eperiod-dd" class="ms-dropdown hidden">
        ${["Day","Week","Month","Year"].map(p=>`<button onclick="setExpensePeriod('${p}')">${p}</button>`).join("")}
      </div>
      <div id="ecat-dd" class="ms-dropdown hidden">
        ${["All",...Object.keys(CATEGORIES)].map(c=>`<button onclick="filterExpenseCategory('${c}')">${CATEGORY_ICONS[c]||""} ${c}</button>`).join("")}
      </div>`;
  } else if (tab==="calendar") {
    strip.innerHTML = `
      <button class="msb" onclick="toggleMSDropdown('cview-dd',this)">View &#9660;</button>
      <button class="msb" onclick="toggleMSDropdown('cfilter-dd',this)">Filter &#9660;</button>
      <button class="msb" onclick="openGlobalSearch()">&#128269; Search</button>
      <div id="cview-dd" class="ms-dropdown hidden">
        <button onclick="setCalView('month')">Month</button>
        <button onclick="setCalView('agenda')">Agenda</button>
        <button onclick="setCalView('events')">All Events</button>
        <button onclick="setCalView('journal')">Journal</button>
        <button onclick="setCalView('health')">&#128138; Health Notes</button>
      </div>
      <div id="cfilter-dd" class="ms-dropdown hidden">
        <button onclick="showToast('Filter all')">All</button>
        <button onclick="showToast('Journal only')">Journal</button>
        <button onclick="showToast('Events only')">Events</button>
      </div>`;
  }
  requestAnimationFrame(()=>{
    document.querySelectorAll(".ms-dropdown").forEach(dd=>{ dd.style.top="88px"; });
  });
}

function toggleMSDropdown(id, btn) {
  const dd = document.getElementById(id); if (!dd) return;
  const isOpen = !dd.classList.contains("hidden");
  closeAllMSDropdowns();
  if (!isOpen) {
    const rect = btn.getBoundingClientRect();
    dd.style.left = rect.left+"px";
    dd.classList.remove("hidden");
    btn.classList.add("open");
    setTimeout(()=>document.addEventListener("click",_closeMSOutside,true),10);
  }
}

function closeAllMSDropdowns() {
  document.querySelectorAll(".ms-dropdown").forEach(d=>d.classList.add("hidden"));
  document.querySelectorAll(".msb").forEach(b=>b.classList.remove("open"));
  document.removeEventListener("click",_closeMSOutside,true);
}

function _closeMSOutside(e) {
  // Don't close if tapping a dropdown item button — let its onclick fire first
  if (e.target.closest(".ms-dropdown") || e.target.closest(".msb")) return;
  closeAllMSDropdowns();
}


// ── Checklist viewer interactions ────────────────────────────────────
function toggleViewerCLItem(idx) {
  const n = window._currentNote;
  if (!n || !n.items) return;
  n.items[idx].done = !n.items[idx].done;
  // Update DOM immediately
  const row = document.getElementById("clv-"+idx);
  if (row) {
    const check = row.querySelector(".cl-viewer-check");
    const text  = row.querySelector(".cl-viewer-text");
    const done  = n.items[idx].done;
    if (check) { check.className = "cl-viewer-check "+(done?"cl-done":""); check.innerHTML = done ? "&#10003;" : ""; }
    if (text)  { text.className = "cl-viewer-text "+(done?"cl-strikethrough":""); }
  }
  // Save in background
  notesSave(n).catch(()=>{});
}

function openCLItemMenu(idx, el) {
  const n = window._currentNote;
  if (!n || !n.items) return;
  const item = n.items[idx];
  const items = [
    { label: item.done ? "&#9744; Unmark" : "&#10003; Mark done",
      action: () => toggleViewerCLItem(idx) },
    { label: "&#128461; Copy text",
      action: () => {
        navigator.clipboard ? navigator.clipboard.writeText(item.text||"") : null;
        showToast("Copied");
      }
    },
    { label: "&#9998; Edit item",
      action: () => {
        openNoteEditor(n);
        setTimeout(() => {
          const inputs = document.querySelectorAll(".cl-item-text");
          if (inputs[idx]) inputs[idx].focus();
        }, 350);
      }
    },
    { label: "&#128465; Delete item",
      action: async () => {
        if (!confirm("Delete this item?")) return;
        n.items.splice(idx, 1);
        await notesSave(n);
        openNoteViewer(n); // refresh viewer
      }
    }
  ];
  showContextMenu(items, el);
}

// Long-press support (touch)
(function initLongPress() {
  let _lpt = null, _lpEl = null;
  document.addEventListener("touchstart", e => {
    const el = e.target.closest("[data-longpress]");
    if (!el) return;
    _lpEl = el;
    _lpt = setTimeout(() => {
      if (_lpEl) { eval(_lpEl.dataset.longpress); _lpEl = null; }
    }, 500);
  }, { passive: true });
  document.addEventListener("touchend",   () => { clearTimeout(_lpt); _lpt = null; }, { passive: true });
  document.addEventListener("touchmove",  () => { clearTimeout(_lpt); _lpt = null; }, { passive: true });
  document.addEventListener("touchcancel",() => { clearTimeout(_lpt); _lpt = null; }, { passive: true });
})();

// ── Checklist viewer interactions ─────────────────────────────────────
function toggleViewerCLItem(idx) {
  const n = window._currentNote;
  if (!n || !n.items) return;
  n.items[idx].done = !n.items[idx].done;
  const row = document.getElementById("clv-"+idx);
  if (row) {
    const check = row.querySelector(".cl-viewer-check");
    const text  = row.querySelector(".cl-viewer-text");
    const done  = n.items[idx].done;
    if (check) { check.className="cl-viewer-check "+(done?"cl-done":""); check.innerHTML=done?"&#10003;":""; }
    if (text)  { text.className="cl-viewer-text "+(done?"cl-strikethrough":""); }
  }
  notesSave(n).catch(()=>{});
}

function openCLItemMenu(idx, el) {
  const n = window._currentNote;
  if (!n || !n.items) return;
  const item = n.items[idx];
  const items = [
    { label: item.done ? "&#9744; Unmark" : "&#10003; Mark done",
      action: () => toggleViewerCLItem(idx) },
    { label: "&#128461; Copy text",
      action: () => {
        if (navigator.clipboard) navigator.clipboard.writeText(item.text||"");
        showToast("Copied");
      }
    },
    { label: "&#9998; Edit",
      action: () => {
        openNoteEditor(n);
        setTimeout(() => {
          const inputs = document.querySelectorAll(".cl-item-text");
          if (inputs[idx]) inputs[idx].focus();
        }, 350);
      }
    },
    { label: "&#128465; Delete",
      action: async () => {
        if (!confirm("Delete this item?")) return;
        n.items.splice(idx, 1);
        await notesSave(n);
        openNoteViewer(n);
      }
    }
  ];
  showContextMenu(items, el);
}

// Long-press support for touch devices
(function() {
  let _lpt = null, _lpEl = null;
  document.addEventListener("touchstart", e => {
    const el = e.target.closest("[data-longpress]");
    if (!el) return;
    _lpEl = el;
    _lpt = setTimeout(() => {
      if (_lpEl) { const fn = _lpEl.dataset.longpress; _lpEl = null; eval(fn); }
    }, 480);
  }, { passive: true });
  ["touchend","touchmove","touchcancel"].forEach(ev =>
    document.addEventListener(ev, () => { clearTimeout(_lpt); _lpt = null; }, { passive: true })
  );
})();


// ── Double-tap viewer → edit with cursor at tap position ─────────────
function _initViewerDoubleTap(note) {
  const scrollEl = document.getElementById("viewer-scroll");
  if (!scrollEl) return;
  let _lastTap = 0, _lastX = 0, _lastY = 0;

  function _handleTap(clientX, clientY) {
    const now = Date.now();
    const dx = Math.abs(clientX - _lastX);
    const dy = Math.abs(clientY - _lastY);
    if (now - _lastTap < 320 && dx < 40 && dy < 40) {
      // Double-tap detected — get cursor position
      const cursorPos = _getViewerCursorPos(clientX, clientY, note.body||"");
      window._editorFromViewer = true;
      openNoteEditor(note, note.type, cursorPos);
    }
    _lastTap = now; _lastX = clientX; _lastY = clientY;
  }

  // Touch
  scrollEl.addEventListener("touchend", e => {
    const t = e.changedTouches[0];
    _handleTap(t.clientX, t.clientY);
  }, { passive: true });
  // Mouse (desktop)
  scrollEl.addEventListener("dblclick", e => {
    const cursorPos = _getViewerCursorPos(e.clientX, e.clientY, note.body||"");
    window._editorFromViewer = true;
    openNoteEditor(note, note.type, cursorPos);
  });
}

function _getViewerCursorPos(clientX, clientY, rawBody) {
  // Use browser's caret detection if available
  let domOffset = null;
  const bodyEl = document.getElementById("viewer-body");

  if (bodyEl) {
    if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(clientX, clientY);
      if (range && range.startContainer) {
        // Walk all text nodes in viewer-body to find total char offset
        domOffset = _domOffsetInEl(bodyEl, range.startContainer, range.startOffset);
      }
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(clientX, clientY);
      if (pos) {
        domOffset = _domOffsetInEl(bodyEl, pos.offsetNode, pos.offset);
      }
    }
  }

  if (domOffset !== null) {
    // Map from HTML-escaped + <br> offset back to raw body offset
    return _htmlOffsetToRaw(rawBody, domOffset);
  }

  // Fallback: estimate by line based on Y
  if (bodyEl) {
    const rect = bodyEl.getBoundingClientRect();
    const scrollEl = document.getElementById("viewer-scroll");
    const scrollTop = scrollEl ? scrollEl.scrollTop : 0;
    const relY = clientY - rect.top + scrollTop;
    const lineH = 32; // 2rem
    const lineIdx = Math.max(0, Math.floor(relY / lineH));
    const lines = rawBody.split("\n");
    let offset = 0;
    for (let i = 0; i < Math.min(lineIdx, lines.length - 1); i++) {
      offset += lines[i].length + 1;
    }
    return offset;
  }
  return rawBody.length;
}

// Count chars from start of element to a specific text node + offset
function _domOffsetInEl(root, targetNode, targetOffset) {
  let count = 0;
  const iter = document.createNodeIterator(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = iter.nextNode())) {
    if (node === targetNode) {
      return count + targetOffset;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      count += node.textContent.length;
    } else if (node.nodeName === "BR") {
      count += 1; // <br> = \n
    }
  }
  return count;
}

// Map offset in the HTML-escaped string back to raw body string offset
// The viewer renders: escHtml(body).split("\n").join("<br>")
// So we need to unescape as we count
function _htmlOffsetToRaw(raw, htmlOffset) {
  // The HTML contains escaped chars (&amp; &lt; etc) but each represents 1 raw char
  // And <br> = \n = 1 raw char
  // So htmlOffset (counting DOM chars) already maps 1:1 to raw offset
  return Math.min(htmlOffset, raw.length);
}


function showContextMenu(items, anchorEl) {
  document.querySelectorAll(".ctx-menu").forEach(m=>m.remove());
  const div=document.createElement("div");
  div.className="ctx-menu";
  div.innerHTML=items.map((item,i)=>`<button class="ctx-menu-item" onclick="_ctxItems[${i}].action();document.querySelectorAll('.ctx-menu').forEach(m=>m.remove())">${item.label}</button>`).join("");
  window._ctxItems=items;
  document.body.appendChild(div);
  if (anchorEl) {
    const rect=anchorEl.getBoundingClientRect();
    const mh=items.length*50;
    const top=rect.bottom+mh>window.innerHeight ? rect.top-mh : rect.bottom+4;
    const left=Math.min(rect.left, window.innerWidth-190);
    div.style.top=top+"px";
    div.style.left=left+"px";
  } else {
    div.style.top="60px"; div.style.right="8px";
  }
  setTimeout(()=>document.addEventListener("click",e=>{if(!div.contains(e.target)){div.remove();}},{once:true,capture:true}),50);
}

function escHtml(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escAttr(s){ return String(s).replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }

// ── File import (.txt, .html, .md → new note) ─────────────────────────
function _importNoteFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.html,.htm,.md,.markdown';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.click();
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) { input.remove(); return; }
    const raw = await file.text();
    let body = raw;
    // Strip HTML tags if .html/.htm
    if (file.name.match(/\.html?$/i)) {
      const tmp = document.createElement('div');
      tmp.innerHTML = raw;
      body = tmp.innerText || tmp.textContent || raw;
    }
    // Title = filename without extension
    const title = file.name.replace(/\.[^.]+$/, '');
    const note = {
      type: 'text',
      title: title,
      body: body.trim(),
      color: 'yellow',
      tags: [],
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };
    await notesSave(note);
    showToast('File imported as note');
    renderNotesTab();
    input.remove();
  };
}
