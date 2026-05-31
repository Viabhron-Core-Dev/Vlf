// habits-tab.js — Loop Habits style with icons, tags, drag-reorder, select mode

let _habitSelectMode = false;
let _habitSelected = new Set();
let _habitDragId = null;

// ── Main render ───────────────────────────────────────────────────────
async function renderHabitsTab() {
  _habitSelectMode = false;
  _habitSelected.clear();

  const habits = await habitsGetAll();
  const active = habits.filter(h => !h.archived);
  const el = document.getElementById("tab-habits");

  if (!active.length) {
    el.innerHTML = '<div class="empty-state"><div class="ei">&#9989;</div><p>No habits yet.<br>Tap + to add one.</p></div>';
    return;
  }

  // Sort by user order
  active.sort((a, b) => (a.order||0) - (b.order||0));

  const days = getLastNDays(4).reverse(); // [today, yesterday, ...]
  const today = dateToStr(new Date());

  // Load all records for these days (including combo sub-habits)
  const allRec = {};
  for (const h of active) {
    for (const d of days) {
      allRec[h.id + '-' + d] = await habitRecordGet(h.id, d);
      // Load sub-habit records for combination habits
      if (h.type === 'combination' && h.subHabits) {
        for (let si = 0; si < h.subHabits.length; si++) {
          allRec[h.id + '-sub-' + si + '-' + d] = await habitRecordGet(h.id, 'sub-' + si + '-' + d);
        }
      }
    }
  }

  // Header row
  let headerHtml = '<div class="lh-header-row">'
    + '<div class="lh-name-col"></div>'
    + days.map(d => {
        const date = new Date(d + 'T12:00:00');
        const abbr = date.toLocaleDateString('en-US', {weekday:'short'}).toUpperCase();
        const num  = d.slice(8);
        const isToday = d === today;
        return '<div class="lh-day-hdr' + (isToday ? ' lh-today-hdr' : '') + '">'
          + abbr + '<br><span class="lh-day-num">' + num + '</span></div>';
      }).join('')
    + '</div>';

  // Rows
  let rowsHtml = active.map(h => {
    // Combination habits get their own renderer
    if (h.type === 'combination') return _renderComboRow(h, days, allRec, today);

    const completedCount = days.filter(d => {
      const r = allRec[h.id + '-' + d];
      return r && r.value > 0;
    }).length;
    const pct = Math.round(completedCount / days.length * 100);
    const ringColor = h.color || '#3b82f6';
    const dashFill = Math.round(94.2 * pct / 100);
    const isMeasurable = h.type === 'measurable';

    const dayCells = days.map(d => {
      const rec = allRec[h.id + '-' + d];
      const val = rec ? rec.value : 0;
      const isPast = d < today;
      const isToday = d === today;
      let cls = 'lh-day-cell';
      let content = '';
      if (isToday) cls += ' lh-today-col';
      if (val > 0) {
        cls += ' lh-done';
        content = isMeasurable
          ? '<span class="lh-num">' + val + '</span>'
          : '<span class="lh-check">&#10003;</span>';
      } else if (isPast) {
        cls += ' lh-missed';
        content = '<span class="lh-cross">&#10005;</span>';
      } else if (isToday) {
        cls += ' lh-missed';
        content = '<span class="lh-cross" style="opacity:.35">&#10005;</span>';
      }
      const longpress = isMeasurable
        ? 'handleHabitLongTap(event,' + h.id + ',\'' + d + '\')'
        : '';
      return '<div class="' + cls + '" '
        + 'onclick="_habitCellTap(' + h.id + ',\'' + d + '\',' + isMeasurable + ')" '
        + (longpress ? 'data-longpress="' + longpress + '"' : '')
        + '>' + content + '</div>';
    }).join('');

    return '<div class="lh-row" id="lh-row-' + h.id + '" draggable="true" '
      + 'ondragstart="_lhDragStart(event,' + h.id + ')" '
      + 'ondragover="_lhDragOver(event,' + h.id + ')" '
      + 'ondrop="_lhDrop(event,' + h.id + ')">'
      // Long-press zone (left) for select/reorder
      + '<div class="lh-name-col" '
      + 'onclick="_habitNameTap(' + h.id + ')" '
      + 'data-longpress="_habitLongPress(' + h.id + ')">'
        + '<svg class="lh-ring" viewBox="0 0 36 36">'
          + '<circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" stroke-width="3"/>'
          + '<circle cx="18" cy="18" r="15" fill="none" stroke="' + ringColor + '" stroke-width="3"'
          + ' stroke-dasharray="' + dashFill + ' 94.2" stroke-linecap="round"'
          + ' transform="rotate(-90 18 18)"/>'
        + '</svg>'
        + (h.icon ? '<span class="lh-icon">' + escHtml(h.icon) + '</span>' : '')
        + '<div class="lh-name-wrap">'
          + '<span class="lh-name">' + escHtml(h.name) + '</span>'
          + ((h.tags||[]).length ? '<span class="lh-tags">' + h.tags.map(t=>'#'+escHtml(t)).join(' ') + '</span>' : '')
        + '</div>'
        + '<span class="lh-select-cb' + (_habitSelectMode && _habitSelected.has(h.id) ? ' checked' : '') + '" id="lh-cb-' + h.id + '"></span>'
      + '</div>'
      + '<div class="lh-days-group">' + dayCells + '</div>'
    + '</div>';
  }).join('');

  el.innerHTML = '<div class="lh-grid">' + headerHtml + rowsHtml + '</div>';

  // Init long-press for name cols
  _initHabitLongPress();
}

// ── Cell tap ──────────────────────────────────────────────────────────
async function _habitCellTap(hid, date, isMeasurable) {
  if (_habitSelectMode) return; // ignore cell taps in select mode
  if (isMeasurable) {
    const rec = await habitRecordGet(hid, date);
    const cur = rec ? rec.value : 0;
    await habitRecordSet(hid, date, cur + 1);
    showToast('+' + (cur + 1));
  } else {
    const rec = await habitRecordGet(hid, date);
    const cur = rec ? rec.value : 0;
    await habitRecordSet(hid, date, cur > 0 ? 0 : 1);
  }
  renderHabitsTab();
}

// handleHabitLongTap for measurable — called from data-longpress
async function handleHabitLongTap(e, hid, date) {
  e.preventDefault();
  const v = prompt('Enter value for this day:');
  if (v === null) return;
  await habitRecordSet(hid, date, parseFloat(v)||0);
  renderHabitsTab();
}

// ── Name tap — open detail or toggle select ───────────────────────────
function _habitNameTap(hid) {
  if (_habitSelectMode) {
    _toggleHabitSelect(hid);
  } else {
    openHabitDetail(hid);
  }
}

function _toggleHabitSelect(hid) {
  if (_habitSelected.has(hid)) _habitSelected.delete(hid);
  else _habitSelected.add(hid);
  const cb = document.getElementById('lh-cb-' + hid);
  if (cb) cb.classList.toggle('checked', _habitSelected.has(hid));
  _updateSelectBar();
}

// ── Long press — enter select mode ───────────────────────────────────
function _habitLongPress(hid) {
  if (!_habitSelectMode) {
    _habitSelectMode = true;
    _habitSelected.clear();
    // Show all checkboxes
    document.querySelectorAll('.lh-select-cb').forEach(cb => cb.style.display = 'block');
    // Show select action bar
    _showSelectBar();
  }
  _toggleHabitSelect(hid);
}

function _showSelectBar() {
  let bar = document.getElementById('lh-select-bar');
  if (bar) { bar.style.display='flex'; return; }
  bar = document.createElement('div');
  bar.id = 'lh-select-bar';
  bar.style = 'position:fixed;bottom:60px;left:0;right:0;background:var(--surface);border-top:2px solid var(--accent);display:flex;align-items:center;justify-content:space-around;padding:10px 16px;z-index:200;gap:10px;';
  bar.innerHTML = '<button onclick="_habitSelectArchive()" style="flex:1;padding:10px;background:none;border:1px solid var(--border);border-radius:8px;font-size:.9rem;cursor:pointer;">&#128193; Archive</button>'
    + '<button onclick="_habitSelectDelete()" style="flex:1;padding:10px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-size:.9rem;cursor:pointer;">&#128465; Delete</button>'
    + '<button onclick="_exitSelectMode()" style="flex:1;padding:10px;background:none;border:1px solid var(--border);border-radius:8px;font-size:.9rem;cursor:pointer;">Cancel</button>';
  document.body.appendChild(bar);
}

function _updateSelectBar() {
  const bar = document.getElementById('lh-select-bar');
  if (!bar) return;
  if (_habitSelected.size === 0) _exitSelectMode();
}

function _exitSelectMode() {
  _habitSelectMode = false;
  _habitSelected.clear();
  const bar = document.getElementById('lh-select-bar');
  if (bar) bar.remove();
  renderHabitsTab();
}

async function _habitSelectArchive() {
  for (const id of _habitSelected) {
    const h = await dbGet('habits', id);
    if (h) { h.archived = true; await dbPut('habits', h); }
  }
  showToast(_habitSelected.size + ' archived');
  _exitSelectMode();
}

async function _habitSelectDelete() {
  if (!confirm('Delete ' + _habitSelected.size + ' habit(s)?')) return;
  for (const id of _habitSelected) {
    await dbDelete('habits', id);
  }
  showToast('Deleted');
  _exitSelectMode();
}

// ── Drag to reorder ───────────────────────────────────────────────────
function _lhDragStart(e, hid) {
  _habitDragId = hid;
  e.dataTransfer.effectAllowed = 'move';
}
function _lhDragOver(e, hid) {
  e.preventDefault();
  if (_habitDragId === hid) return;
  const row = document.getElementById('lh-row-' + hid);
  if (row) row.style.borderTop = '3px solid var(--accent)';
}
async function _lhDrop(e, targetId) {
  e.preventDefault();
  document.querySelectorAll('.lh-row').forEach(r => r.style.borderTop = '');
  if (!_habitDragId || _habitDragId === targetId) return;
  // Reorder in DB
  const habits = (await habitsGetAll()).filter(h => !h.archived);
  habits.sort((a, b) => (a.order||0) - (b.order||0));
  const fromIdx = habits.findIndex(h => h.id === _habitDragId);
  const toIdx   = habits.findIndex(h => h.id === targetId);
  if (fromIdx < 0 || toIdx < 0) return;
  const moved = habits.splice(fromIdx, 1)[0];
  habits.splice(toIdx, 0, moved);
  for (let i = 0; i < habits.length; i++) {
    habits[i].order = i;
    await dbPut('habits', habits[i]);
  }
  _habitDragId = null;
  renderHabitsTab();
}

// Long-press init for touch devices (reuse existing mechanism + habit-specific)
function _initHabitLongPress() {
  // Uses the global touch longpress in notes-tab.js — works via data-longpress attr
  // Also init drag-via-touch using touchstart on row
  document.querySelectorAll('.lh-row').forEach(row => {
    let _lpt = null, _startY = 0;
    row.addEventListener('touchstart', e => {
      _startY = e.touches[0].clientY;
      _lpt = setTimeout(() => {
        // Check if touch didn't move much (not scrolling)
        const el = e.target.closest('[data-longpress]');
        if (el) { eval(el.dataset.longpress); }
      }, 500);
    }, {passive:true});
    row.addEventListener('touchmove', e => {
      if (Math.abs(e.touches[0].clientY - _startY) > 10) clearTimeout(_lpt);
    }, {passive:true});
    row.addEventListener('touchend', () => clearTimeout(_lpt), {passive:true});
  });
}

// ── Habit detail ──────────────────────────────────────────────────────
async function openHabitDetail(id) {
  const h = await dbGet('habits', id);
  if (!h) return;
  const records = await habitRecordsForHabit(id);
  const {streak, best} = await habitStreak(id);
  const done = records.filter(r => r.value > 0).length;
  const pct  = records.length > 0 ? Math.round(done / records.length * 100) : 0;
  const ringColor = h.color || '#3b82f6';

  const html = '<div class="fs-header">'
    + '<button class="fs-back" onclick="closeFullscreen()">&#8592;</button>'
    + '<span style="font-size:1.1rem;font-weight:700;flex:1">' + escHtml(h.icon||'') + ' ' + escHtml(h.name) + '</span>'
    + '<button class="fs-menu-btn" onclick="editHabit(' + id + ')" style="color:var(--accent);font-weight:700">Edit</button>'
    + '</div>'
    + '<div style="display:flex;align-items:center;justify-content:space-around;padding:20px 16px;border-bottom:1px solid var(--border)">'
      + '<svg viewBox="0 0 36 36" style="width:72px;height:72px;transform:rotate(-90deg)">'
        + '<circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" stroke-width="3"/>'
        + '<circle cx="18" cy="18" r="15" fill="none" stroke="' + ringColor + '" stroke-width="3"'
        + ' stroke-dasharray="' + Math.round(94.2*pct/100) + ' 94.2" stroke-linecap="round"/>'
      + '</svg>'
      + '<div style="text-align:center"><div style="font-size:2rem;font-weight:800;color:' + ringColor + '">' + streak + '</div><div style="font-size:.75rem;color:var(--text-secondary)">Current streak</div></div>'
      + '<div style="text-align:center"><div style="font-size:2rem;font-weight:800">' + best + '</div><div style="font-size:.75rem;color:var(--text-secondary)">Best streak</div></div>'
      + '<div style="text-align:center"><div style="font-size:2rem;font-weight:800">' + pct + '%</div><div style="font-size:.75rem;color:var(--text-secondary)">Completion</div></div>'
    + '</div>'
    + '<div style="padding:16px">'
      + '<div style="font-size:.78rem;font-weight:700;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">Last 30 days</div>'
      + '<div style="display:flex;gap:3px;flex-wrap:wrap">'
        + getLastNDays(30).reverse().map(d => {
            const r = records.find(rc => rc.date === d);
            const isDone = r && r.value > 0;
            return '<div style="width:30px;height:30px;border-radius:6px;background:' + (isDone?ringColor:'var(--border)')
              + ';display:flex;align-items:center;justify-content:center;font-size:.75rem;color:' + (isDone?'#fff':'var(--text-secondary)') + '">'
              + (isDone ? (h.type==='measurable'?r.value:'✓') : '·') + '</div>';
          }).join('')
      + '</div>'
    + '</div>'
    + '<div style="padding:0 16px 16px;font-size:.83rem;color:var(--text-secondary)">'
      + '&#128285; ' + (h.frequency||'Every day')
      + (h.unit ? ' &nbsp;·&nbsp; Target: ' + h.target + ' ' + h.unit : '')
    + '</div>';
  openFullscreen(html);
}

// ── Habit form — with icon + tags ─────────────────────────────────────
function openHabitForm(habit, type) {
  const h = habit || {type:type||'yesno', color:'#3b82f6', frequency:'daily', name:'', icon:'', tags:[]};
  window._currentHabit = h;
  const colorOptions = ['#3b82f6','#22c55e','#f97316','#ef4444','#a855f7','#eab308','#0D9488','#6b7280'];
  const commonIcons  = ['&#127939;','&#129340;','&#128214;','&#128187;','&#127749;','&#127939;','&#9749;','&#129340;','&#128212;','&#127754;','&#128295;','&#127988;','&#128197;','&#127925;','&#128170;','&#129332;','&#127822;','&#128640;','&#128162;','&#9997;'];

  const html = '<div class="fs-header">'
    + '<button class="fs-back" onclick="closeFullscreen()">&#8592;</button>'
    + '<span style="font-size:1.1rem;font-weight:700;flex:1">' + (h.id?'Edit Habit':'New Habit') + '</span>'
    + '<button class="fs-menu-btn" onclick="saveHabit()" style="color:var(--accent);font-weight:700">Save</button>'
    + '</div>'
    + '<div class="form-page">'
      + '<div class="form-group"><label>Habit Name</label>'
        + '<input id="h-name" value="' + escAttr(h.name||'') + '" placeholder="e.g. Morning exercise"/>'
      + '</div>'
      + '<div class="form-group"><label>Icon (tap to pick)</label>'
        + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
          + '<div id="h-icon-preview" style="width:44px;height:44px;border-radius:10px;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:1.5rem;cursor:pointer" onclick="document.getElementById(\'h-icon-grid\').style.display=\'flex\'">' + (h.icon||'&#128280;') + '</div>'
          + '<input id="h-icon-custom" placeholder="Paste any emoji" value="' + escAttr(h.icon||'') + '" style="flex:1" oninput="document.getElementById(\'h-icon-preview\').innerHTML=this.value||\'&#128280;\';window._currentHabit.icon=this.value"/>'
        + '</div>'
        + '<div id="h-icon-grid" style="display:none;flex-wrap:wrap;gap:6px;padding:6px 0">'
          + commonIcons.map(ic => '<button onclick="setHabitIcon(\'' + ic + '\')" style="width:38px;height:38px;background:none;border:1px solid var(--border);border-radius:8px;font-size:1.2rem;cursor:pointer">' + ic + '</button>').join('')
        + '</div>'
      + '</div>'
      + '<div class="form-group"><label>Tags (comma separated)</label>'
        + '<input id="h-tags" value="' + escAttr((h.tags||[]).join(', ')) + '" placeholder="e.g. fitness, morning"/>'
      + '</div>'
      + '<div class="form-group"><label>Colour</label>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap;padding:4px 0">'
          + colorOptions.map(col => '<div onclick="window._currentHabit.color=\'' + col + '\';document.querySelectorAll(\'.hc-dot\').forEach(d=>d.classList.remove(\'selected\'));this.classList.add(\'selected\')"'
            + ' class="hc-dot ' + ((h.color||'#3b82f6')===col?'selected':'') + '"'
            + ' style="width:32px;height:32px;border-radius:50%;background:' + col + ';cursor:pointer;border:3px solid ' + ((h.color||'#3b82f6')===col?'var(--text)':'transparent') + '"></div>').join('')
        + '</div>'
      + '</div>'
      + '<div class="form-group"><label>Type</label>'
        + '<div style="padding:6px 0;font-size:.9rem;font-weight:600;color:var(--accent)">'
          + (h.type==='measurable'?'📐 Measurable':h.type==='combination'?'🔗 Combination':'✅ Yes / No')
        + '</div>'
      + '</div>'
      + '<div id="measurable-fields" style="display:' + (h.type==='measurable'?'block':'none') + '">'
        + '<div class="form-group"><label>Unit</label><input id="h-unit" value="' + escAttr(h.unit||'') + '" placeholder="e.g. pages, km, glasses"/></div>'
        + '<div class="form-group"><label>Daily Target</label><input id="h-target" type="number" value="' + (h.target||'') + '" placeholder="e.g. 10"/></div>'
      + '</div>'
      + '<div id="combination-fields" style="display:' + (h.type==="combination"?'block':'none') + ';padding:0 0 8px">'
        + '<div class="form-group"><label>Sub-habits</label>'
          + '<div id="combo-sub-list">' + _renderComboSubList(h.subHabits||[]) + '</div>'
          + '<button class="cl-add-btn" style="margin-top:4px;padding:10px 0" onclick="_addComboSub()">'
            + '<span class="cl-add-icon">&#43;</span><span class="cl-add-label" style="font-size:.92rem">Add sub-habit</span>'
          + '</button>'
        + '</div>'
      + '</div>'
      + '<div class="form-group"><label>Frequency</label>'
        + '<div class="freq-btns">'
          + ['daily','weekly'].map(f => '<button class="freq-btn ' + ((h.frequency||'daily')===f?'active':'') + '" onclick="setHabitFreq(\'' + f + '\',this)">' + (f==='daily'?'Every day':'Weekly') + '</button>').join('')
        + '</div>'
      + '</div>'
      + (h.id ? '<div style="padding-top:16px"><button class="btn btn-danger btn-full" onclick="archiveHabitConfirm(' + h.id + ')">Archive Habit</button></div>' : '')
      + '<div style="height:80px"></div>'
    + '</div>';
  openFullscreen(html);
}

function setHabitIcon(ic) {
  window._currentHabit.icon = ic;
  const prev = document.getElementById('h-icon-preview');
  const inp  = document.getElementById('h-icon-custom');
  if (prev) prev.innerHTML = ic;
  if (inp)  inp.value = ic;
  const grid = document.getElementById('h-icon-grid');
  if (grid) grid.style.display = 'none';
}

function setHabitType(t, btn) {
  window._currentHabit.type = t;
  btn.closest('.freq-btns').querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const mf = document.getElementById('measurable-fields');
  if (mf) mf.style.display = t === 'measurable' ? 'block' : 'none';
  const cf = document.getElementById('combination-fields');
  if (cf) cf.style.display = t === 'combination' ? 'block' : 'none';
}

function setHabitFreq(f, btn) {
  window._currentHabit.frequency = f;
  // Only clear siblings inside the SAME group (frequency group)
  btn.closest('.freq-btns').querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function saveHabit() {
  const h = window._currentHabit;
  h.name = document.getElementById('h-name').value.trim();
  if (!h.name) { showToast('Please enter a name'); return; }
  const iconEl = document.getElementById('h-icon-custom');
  if (iconEl) h.icon = iconEl.value.trim();
  const tagsEl = document.getElementById('h-tags');
  if (tagsEl) h.tags = tagsEl.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
  const unit = document.getElementById('h-unit');
  if (unit) h.unit = unit.value.trim();
  const target = document.getElementById('h-target');
  if (target) h.target = parseFloat(target.value) || 0;
  // Set order if new
  if (!h.id) {
    const all = await habitsGetAll();
    h.order = all.filter(a => !a.archived).length;
  }
  await habitSave(h);
  showToast(h.id ? 'Habit updated' : 'Habit added!');
  closeFullscreen();
}

async function editHabit(id) {
  const h = await dbGet('habits', id);
  closeFullscreen();
  setTimeout(() => openHabitForm(h, h.type), 300);
}

async function archiveHabitConfirm(id) {
  if (!confirm('Archive this habit?')) return;
  const h = await dbGet('habits', id);
  h.archived = true;
  await dbPut('habits', h);
  showToast('Archived');
  closeFullscreen();
}

async function renderArchivedHabits() {
  const all = await habitsGetAll();
  const archived = all.filter(h => h.archived);
  const el = document.getElementById('tab-habits');
  el.innerHTML = '<div style="padding:10px 14px;font-size:.82rem;color:var(--accent);border-bottom:1px solid var(--border)">'
    + '<button onclick="renderHabitsTab()" style="background:none;border:none;color:var(--accent);font-weight:700;cursor:pointer">&#8592; Back</button> Archived</div>'
    + (archived.length
      ? archived.map(h => '<div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border)">'
          + '<span style="flex:1;font-size:.95rem">' + escHtml(h.icon||'') + ' ' + escHtml(h.name) + '</span>'
          + '<button class="btn btn-secondary" onclick="unarchiveHabit(' + h.id + ')" style="padding:6px 14px;font-size:.82rem">Restore</button>'
        + '</div>').join('')
      : '<div class="empty-state"><p>No archived habits</p></div>');
}

async function unarchiveHabit(id) {
  const h = await dbGet('habits', id);
  h.archived = false;
  await dbPut('habits', h);
  renderArchivedHabits();
  showToast('Restored!');
}

// ── Combination habit helpers ─────────────────────────────────────────

function _renderComboSubList(subs) {
  if (!subs || !subs.length) return '<div style="color:var(--text-secondary);font-size:.85rem;padding:6px 0">No sub-habits yet</div>';
  return subs.map((s, i) => `
    <div class="combo-sub-row" id="csub-${i}">
      <span class="combo-sub-type">${s.type === 'measurable' ? '&#128290;' : '&#9745;'}</span>
      <span class="combo-sub-name" style="flex:1;font-size:.95rem">${escHtml(s.name)}</span>
      ${s.type === 'measurable' ? `<span class="combo-sub-unit" style="font-size:.8rem;color:var(--text-secondary)">${escHtml(s.unit||'')} ${s.target||''}</span>` : ''}
      <button class="cl-del-btn" onclick="_deleteComboSub(${i})">&#10005;</button>
    </div>`).join('');
}

function _addComboSub() {
  // Show dialog to pick sub-habit name + type
  const ov = document.createElement('div');
  ov.className = 'cl-dialog-overlay';
  ov.innerHTML = `
    <div class="cl-dialog" style="min-width:290px">
      <div class="cl-dialog-title">Add Sub-habit</div>
      <input class="cl-dialog-input" id="csub-name" placeholder="Name (e.g. Push-ups)" style="margin-bottom:14px"/>
      <div style="display:flex;gap:8px;margin:10px 0 4px">
        <button class="freq-btn active" id="csub-yesno" onclick="_csubTypeToggle('yesno',this)">Yes / No</button>
        <button class="freq-btn" id="csub-meas" onclick="_csubTypeToggle('measurable',this)">Measurable</button>
      </div>
      <div id="csub-meas-fields" style="display:none;margin-top:8px">
        <input class="cl-dialog-input" id="csub-unit" placeholder="Unit (e.g. reps, km)" style="margin-bottom:8px"/>
        <input class="cl-dialog-input" id="csub-target" type="number" placeholder="Target (e.g. 20)"/>
      </div>
      <div class="cl-dialog-actions">
        <button class="cl-dlg-btn" onclick="_csubCancel()">CANCEL</button>
        <button class="cl-dlg-btn cl-dlg-ok" onclick="_csubOK()">OK</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  window._csubOv = ov;
  window._csubType = 'yesno';
  setTimeout(() => document.getElementById('csub-name').focus(), 60);
}

function _csubTypeToggle(t, btn) {
  window._csubType = t;
  document.querySelectorAll('#csub-yesno,#csub-meas').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('csub-meas-fields').style.display = t === 'measurable' ? 'block' : 'none';
}

function _csubCancel() {
  if (window._csubOv) { window._csubOv.remove(); window._csubOv = null; }
}

function _csubOK() {
  const name = (document.getElementById('csub-name').value||'').trim();
  if (!name) { showToast('Enter a name'); return; }
  const sub = { name, type: window._csubType };
  if (window._csubType === 'measurable') {
    sub.unit = (document.getElementById('csub-unit').value||'').trim();
    sub.target = parseFloat(document.getElementById('csub-target').value) || 0;
  }
  const h = window._currentHabit;
  if (!h.subHabits) h.subHabits = [];
  h.subHabits.push(sub);
  _csubCancel();
  const el = document.getElementById('combo-sub-list');
  if (el) el.innerHTML = _renderComboSubList(h.subHabits);
}

function _deleteComboSub(i) {
  const h = window._currentHabit;
  if (h.subHabits) h.subHabits.splice(i, 1);
  const el = document.getElementById('combo-sub-list');
  if (el) el.innerHTML = _renderComboSubList(h.subHabits||[]);
}

// ── Combination habit row rendering ──────────────────────────────────
// Renders in the main grid: tap name → expand/collapse sub-habits
// Shows percentage ring instead of tick cells

// ── Combo: calculate sub completion score for one day (0.0–1.0) ──────
function _subScore(s, val) {
  if (s.type === 'measurable') {
    if (!s.target || s.target <= 0) return val > 0 ? 1 : 0;
    return Math.min(val / s.target, 1); // partial credit
  }
  return val > 0 ? 1 : 0; // yes/no
}

function _renderComboRow(h, days, allRec, today) {
  const subs = h.subHabits || [];
  const subKey = (d, si) => h.id + '-sub-' + si + '-' + d;

  // ── Parent day cells: show % number always, ✓ at 100, ✗ at 0 ──────
  const parentDayCells = days.map(d => {
    const isPast = d < today;
    const isToday = d === today;
    let cls = 'lh-day-cell';
    if (isToday) cls += ' lh-today-col';

    if (!subs.length) return '<div class="' + cls + '" onclick="_toggleComboExpand(' + h.id + ')"><span style="opacity:.3;font-size:.7rem">—</span></div>';

    // Sum scores across all subs
    let total = 0;
    subs.forEach((s, si) => {
      const r = allRec[subKey(d, si)];
      total += _subScore(s, r ? r.value : 0);
    });
    const score = total / subs.length; // 0.0 to 1.0
    const pct = Math.round(score * 100);

    let content = '';
    if (pct === 100) {
      cls += ' lh-done';
      content = '<span class="lh-check">&#10003;</span>';
    } else if (pct > 0) {
      content = '<span style="font-size:.68rem;font-weight:700;color:var(--accent)">' + pct + '%</span>';
    } else if (isPast || isToday) {
      cls += ' lh-missed';
      content = '<span class="lh-cross"' + (isToday ? ' style="opacity:.35"' : '') + '>&#10005;</span>';
    }
    return '<div class="' + cls + '" onclick="_toggleComboExpand(' + h.id + ')">' + content + '</div>';
  }).join('');

  // ── Parent ring: today's score ────────────────────────────────────
  const ringColor = h.color || '#3b82f6';
  let todayTotal = 0;
  subs.forEach((s, si) => {
    const r = allRec[subKey(today, si)];
    todayTotal += _subScore(s, r ? r.value : 0);
  });
  const todayPct = subs.length ? Math.round((todayTotal / subs.length) * 100) : 0;
  const dashFill = Math.round(94.2 * todayPct / 100);
  const isExpanded = window._comboExpanded && window._comboExpanded.has(h.id);

  // ── Sub-habit rows — full row with indent gap + ring + name + 4 days
  const subRowsHtml = subs.map((s, si) => {
    const isMeasurable = s.type === 'measurable';

    // Sub ring: today only
    const subRec = allRec[subKey(today, si)];
    const subVal = subRec ? subRec.value : 0;
    const subScore = _subScore(s, subVal);
    const subPct = Math.round(subScore * 100);
    const subDash = Math.round(94.2 * subPct / 100);
    const subRingColor = ringColor; // inherit parent color

    // Sub day cells
    const subDayCells = days.map(d => {
      const isPast = d < today;
      const isToday = d === today;
      const rec = allRec[subKey(d, si)];
      const val = rec ? rec.value : 0;
      let cls = 'lh-day-cell';
      if (isToday) cls += ' lh-today-col';
      let content = '';

      if (isMeasurable) {
        if (val > 0) {
          // Check if at/above target for green bg
          const atTarget = !s.target || s.target <= 0 || val >= s.target;
          if (atTarget) cls += ' lh-done';
          content = '<span class="lh-num">' + val + '</span>';
        } else if (isPast || isToday) {
          cls += ' lh-missed';
          content = '<span class="lh-cross"' + (isToday ? ' style="opacity:.35"' : '') + '>&#10005;</span>';
        }
      } else {
        if (val > 0) {
          cls += ' lh-done';
          content = '<span class="lh-check">&#10003;</span>';
        } else if (isPast || isToday) {
          cls += ' lh-missed';
          content = '<span class="lh-cross"' + (isToday ? ' style="opacity:.35"' : '') + '>&#10005;</span>';
        }
      }

      const tapFn = '_tapComboSub(' + h.id + ',' + si + ',' + isMeasurable + ',\'' + d + '\')';
      const lpFn  = isMeasurable ? '_lpComboSub(event,' + h.id + ',' + si + ',\'' + d + '\')' : '';
      return '<div class="' + cls + '" onclick="' + tapFn + '"'
        + (lpFn ? ' data-longpress="' + lpFn + '"' : '')
        + '>' + content + '</div>';
    }).join('');

    return '<div class="lh-row combo-sub-habit-row">'
      + '<div class="lh-name-col combo-sub-name-col">'
        // Left indent gap (empty space before ring)
        + '<div class="combo-sub-indent"></div>'
        // Small ring showing today's sub completion
        + '<svg class="lh-ring" viewBox="0 0 36 36" style="flex-shrink:0">'
          + '<circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" stroke-width="3"/>'
          + '<circle cx="18" cy="18" r="15" fill="none" stroke="' + subRingColor + '" stroke-width="3"'
          + ' stroke-dasharray="' + subDash + ' 94.2" stroke-linecap="round"'
          + ' transform="rotate(-90 18 18)"/>'
        + '</svg>'
        + '<div class="lh-name-wrap">'
          + '<span class="lh-name" style="font-size:.88rem">' + escHtml(s.name) + '</span>'
          + (isMeasurable && s.unit ? '<span class="lh-tags">' + escHtml(s.unit) + (s.target ? ' · ' + s.target : '') + '</span>' : '')
        + '</div>'
      + '</div>'
      + '<div class="lh-days-group">' + subDayCells + '</div>'
    + '</div>';
  }).join('');

  return '<div class="lh-combo-wrap" id="lh-combo-' + h.id + '">'
    + '<div class="lh-row">'
      + '<div class="lh-name-col" onclick="_toggleComboExpand(' + h.id + ')" data-longpress="_habitLongPress(' + h.id + ')">'
        + '<svg class="lh-ring" viewBox="0 0 36 36">'
          + '<circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" stroke-width="3"/>'
          + '<circle cx="18" cy="18" r="15" fill="none" stroke="' + ringColor + '" stroke-width="3"'
          + ' stroke-dasharray="' + dashFill + ' 94.2" stroke-linecap="round"'
          + ' transform="rotate(-90 18 18)"/>'
        + '</svg>'
        + (h.icon ? '<span class="lh-icon">' + escHtml(h.icon) + '</span>' : '')
        + '<div class="lh-name-wrap">'
          + '<span class="lh-name">' + escHtml(h.name) + '</span>'
          + '<span class="lh-tags">' + todayPct + '% · ' + subs.length + ' sub-habits ' + (isExpanded ? '▲' : '▼') + '</span>'
        + '</div>'
      + '</div>'
      + '<div class="lh-days-group">' + parentDayCells + '</div>'
    + '</div>'
    + (isExpanded ? '<div class="combo-expand">' + subRowsHtml + '</div>' : '')
  + '</div>';
}

window._comboExpanded = new Set();

function _toggleComboExpand(hid) {
  if (window._comboExpanded.has(hid)) window._comboExpanded.delete(hid);
  else window._comboExpanded.add(hid);
  renderHabitsTab();
}

async function _tapComboSub(hid, si, isMeasurable, date) {
  if (isMeasurable) {
    const rec = await habitRecordGet(hid, 'sub-' + si + '-' + date);
    const cur = rec ? rec.value : 0;
    await habitRecordSet(hid, 'sub-' + si + '-' + date, cur + 1);
    showToast('+' + (cur + 1));
  } else {
    const rec = await habitRecordGet(hid, 'sub-' + si + '-' + date);
    const cur = rec ? rec.value : 0;
    await habitRecordSet(hid, 'sub-' + si + '-' + date, cur > 0 ? 0 : 1);
  }
  renderHabitsTab();
}

async function _lpComboSub(e, hid, si, date) {
  e.preventDefault();
  const val = prompt('Enter value:');
  if (val === null) return;
  const num = parseFloat(val) || 0;
  await habitRecordSet(hid, 'sub-' + si + '-' + date, num);
  renderHabitsTab();
}