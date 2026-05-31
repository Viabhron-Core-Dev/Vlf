// calendar-tab.js
let calMonth = new Date().getMonth();
let calYear  = new Date().getFullYear();

async function renderCalendarTab() {
  const el = document.getElementById("tab-calendar");
  if (!el) return;
  try {
    if (calView === "events")  { await renderEventsList(el); return; }
    if (calView === "journal") { await renderJournalList(el); return; }
    if (calView === "agenda")  { await renderAgenda(el); return; }
    if (calView === "health")  { await renderHealthNotes(el); return; }
    await renderMonthView(el);
  } catch(e) {
    console.error("renderCalendarTab error:", e);
    el.innerHTML = '<div class="empty-state"><p>Error loading view. Pull down to retry.</p></div>';
  }
}

async function renderMonthView(el) {
  const today    = new Date();
  const todayStr = dateToStr(today);
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = getDaysInMonth(calYear, calMonth);

  const prevMonth = calMonth === 0 ? 11 : calMonth - 1;
  const prevYear  = calMonth === 0 ? calYear - 1 : calYear;
  const prevDays  = getDaysInMonth(prevYear, prevMonth);
  const nextMonth = calMonth === 11 ? 0 : calMonth + 1;
  const nextYear  = calMonth === 11 ? calYear + 1 : calYear;

  const monthEvents       = await eventsForMonth(calYear, calMonth);
  const monthExpenses     = await expenseGetAll();
  const monthJournal      = await journalGetAll();
  const monthHabitRecords = await dbGetAll("habit_records");
  const monthNotes        = await notesGetAll();

  const dotMap = {};
  const padStr = calYear + "-" + String(calMonth + 1).padStart(2, "0");

  monthEvents.forEach(function(e) {
    if (!dotMap[e.date]) dotMap[e.date] = {};
    dotMap[e.date].calendar = true;
  });
  monthExpenses.forEach(function(e) {
    if (e.date && e.date.startsWith(padStr)) {
      if (!dotMap[e.date]) dotMap[e.date] = {};
      dotMap[e.date].expense = true;
    }
  });
  monthJournal.forEach(function(e) {
    if (e.date && e.date.startsWith(padStr)) {
      if (!dotMap[e.date]) dotMap[e.date] = {};
      dotMap[e.date].journal = true;
    }
  });
  monthHabitRecords.forEach(function(r) {
    if (r.date && r.date.startsWith(padStr) && r.value > 0) {
      if (!dotMap[r.date]) dotMap[r.date] = {};
      dotMap[r.date].habits = true;
    }
  });
  monthNotes.forEach(function(n) {
    const d = dateToStr(new Date(n.modifiedAt));
    if (d.startsWith(padStr)) {
      if (!dotMap[d]) dotMap[d] = {};
      dotMap[d].notes = true;
      if ((n.tags||[]).includes("health")) dotMap[d].health = true;
    }
  });

  const monthName = new Date(calYear, calMonth).toLocaleDateString("en-US", {month:"long",year:"numeric"});

  let html = '<div class="cal-header">'
    + '<button class="cal-nav-btn" onclick="calNav(-1)">&#9650;</button>'
    + '<span class="cal-month-title">' + monthName + '</span>'
    + '<button class="cal-nav-btn" onclick="calNav(1)">&#9660;</button>'
    + '</div><div class="cal-grid">'
    + ["SUN","MON","TUE","WED","THU","FRI","SAT"].map(function(d){
        return '<div class="cal-day-hdr">' + d + '</div>';
      }).join("");

  function makeDots(dots) {
    var s = '<div class="cal-dots">';
    if (dots.notes)    s += '<div class="cal-dot dot-notes"></div>';
    if (dots.habits)   s += '<div class="cal-dot dot-habits"></div>';
    if (dots.expense)  s += '<div class="cal-dot dot-expense"></div>';
    if (dots.calendar) s += '<div class="cal-dot dot-calendar"></div>';
    if (dots.journal)  s += '<div class="cal-dot dot-journal"></div>';
    if (dots.health)   s += '<div class="cal-dot dot-health"></div>';
    s += '</div>';
    return s;
  }

  for (var i = 0; i < firstDay; i++) {
    var d = prevDays - firstDay + 1 + i;
    var ds = prevYear + "-" + String(prevMonth+1).padStart(2,"0") + "-" + String(d).padStart(2,"0");
    html += '<div class="cal-cell other-month" onclick="openDaySummary(\'' + ds + '\')">'
          + '<div class="cal-date">' + d + '</div><div class="cal-dots"></div></div>';
  }

  for (var d2 = 1; d2 <= daysInMonth; d2++) {
    var ds2 = calYear + "-" + String(calMonth+1).padStart(2,"0") + "-" + String(d2).padStart(2,"0");
    var isToday = ds2 === todayStr;
    var dots = dotMap[ds2] || {};
    html += '<div class="cal-cell ' + (isToday ? "today" : "") + '" onclick="openDaySummary(\'' + ds2 + '\')">'
          + '<div class="cal-date">' + d2 + '</div>'
          + makeDots(dots) + '</div>';
  }

  var totalCells = firstDay + daysInMonth;
  var remaining  = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (var d3 = 1; d3 <= remaining; d3++) {
    var ds3 = nextYear + "-" + String(nextMonth+1).padStart(2,"0") + "-" + String(d3).padStart(2,"0");
    html += '<div class="cal-cell other-month" onclick="openDaySummary(\'' + ds3 + '\')">'
          + '<div class="cal-date">' + d3 + '</div><div class="cal-dots"></div></div>';
  }

  if (firstDay + daysInMonth + remaining < 42) {
    var start = remaining + 1;
    for (var d4 = start; d4 < start + 7; d4++) {
      var ds4 = nextYear + "-" + String(nextMonth+1).padStart(2,"0") + "-" + String(d4).padStart(2,"0");
      html += '<div class="cal-cell other-month" onclick="openDaySummary(\'' + ds4 + '\')">'
            + '<div class="cal-date">' + d4 + '</div><div class="cal-dots"></div></div>';
    }
  }

  html += '</div>';
  el.innerHTML = html;
  _initCalSwipe(el);
}

function calNav(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendarTab();
}

function _initCalSwipe(el) {
  let _sy = 0, _sx = 0;
  el.addEventListener("touchstart", e => {
    _sy = e.touches[0].clientY;
    _sx = e.touches[0].clientX;
  }, { passive: true });
  el.addEventListener("touchend", e => {
    const dy = e.changedTouches[0].clientY - _sy;
    const dx = e.changedTouches[0].clientX - _sx;
    if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      calNav(dy < 0 ? 1 : -1);
    }
  }, { passive: true });
}

async function renderEventsList(el) {
  const events   = await eventsGetAll();
  const expenses = await expenseGetTrips();
  const journal  = await journalGetAll();
  const notes    = (await notesGetAll()).slice(0, 20);

  let items = [];
  events.forEach(e  => items.push({date:e.date, icon:"&#128197;", title:e.title, sub:e.time||"", badge:"Event",   action:()=>openPlanEditor(e)}));
  expenses.forEach(t => items.push({date:t.date, icon:"&#128176;", title:"Trip — "+t.items.length+" items", sub:"&#8377;"+t.total, badge:"Expense", action:()=>{switchTab("expense");}}));
  journal.forEach(e  => items.push({date:e.date, icon:"&#128211;", title:"Journal entry", sub:(e.body||"").substring(0,50), badge:"Journal", action:()=>openJournalEditor(e)}));
  notes.forEach(n    => { const d=dateToStr(new Date(n.modifiedAt)); items.push({date:d, icon:(n.tags||[]).includes("health")?"&#128138;":"&#128221;", title:n.title||"Untitled", sub:"", badge:(n.tags||[]).includes("health")?"Health":"Note", action:()=>{closeFullscreen();openNoteViewer(n);}}); });

  items.sort((a,b)=>b.date.localeCompare(a.date));
  if (!items.length) { el.innerHTML='<div class="empty-state"><p>No items yet</p></div>'; return; }

  const byDate = {};
  items.forEach(it => { if (!byDate[it.date]) byDate[it.date]=[]; byDate[it.date].push(it); });
  window._evListItems = items;
  let idx = 0;
  el.innerHTML = Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,its]) =>
    '<div class="event-date-group">' + formatDate(date) + '</div>' +
    its.map(it => {
      const i = idx++;
      return '<div class="event-item" onclick="window._evListItems['+i+'].action()">'
        + '<span class="event-item-icon">'+it.icon+'</span>'
        + '<div class="event-item-body"><div class="event-item-title">'+escHtml(it.title)+'</div>'
        + (it.sub?'<div class="event-item-sub">'+it.sub+'</div>':'')
        + '</div><span class="event-source-badge">'+it.badge+'</span></div>';
    }).join("")
  ).join("");
}

async function renderAgenda(el) {
  const events  = await eventsGetAll();
  const today   = dateToStr(new Date());
  const upcoming = events.filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
  if (!upcoming.length) { el.innerHTML='<div class="empty-state"><p>No upcoming events</p></div>'; return; }
  const byDate = {};
  upcoming.forEach(e=>{if(!byDate[e.date])byDate[e.date]=[];byDate[e.date].push(e);});
  window._agendaItems = [];
  el.innerHTML = Object.entries(byDate).map(([date,evs]) =>
    '<div class="event-date-group">' + formatDate(date) + '</div>' +
    evs.map(e => {
      const i = window._agendaItems.length; window._agendaItems.push(e);
      return '<div class="event-item" onclick="openPlanEditor(window._agendaItems['+i+'])">'
        + '<span class="event-item-icon">'+(e.icon||"&#128197;")+'</span>'
        + '<div class="event-item-body"><div class="event-item-title">'+escHtml(e.title)+'</div>'
        + (e.time?'<div class="event-item-sub">&#128336; '+e.time+'</div>':'')
        + '</div></div>';
    }).join("")
  ).join("");
}

async function openDaySummary(date) {
  const events   = await eventsForDate(date);
  const journal  = await journalGetByDate(date);
  const expenses = await expenseGetByDate(date);
  const allNotes = await notesGetAll();
  const dayNotes = allNotes.filter(n=>dateToStr(new Date(n.modifiedAt))===date);
  const today    = dateToStr(new Date());

  let items = [];
  events.forEach(e   => items.push({icon:e.icon||"&#128197;", title:e.title, sub:e.time||"", badge:"Event",   action:()=>openPlanEditor(e)}));
  journal.forEach(e  => items.push({icon:"&#128211;", title:"Journal · "+(e.body||"").substring(0,40), sub:"", badge:"Journal", action:()=>openJournalEditor(e)}));
  expenses.forEach(e => items.push({icon:"&#128176;", title:e.item||"Expense", sub:"&#8377;"+e.price, badge:"Expense", action:()=>openExpenseInput(e.id)}));
  dayNotes.filter(n=>(n.tags||[]).includes("health")).forEach(n => items.push({icon:"&#128138;", title:n.title||(n.body||"").split("\n")[0]||"Health note", sub:"", badge:"Health", action:()=>openNoteViewer(n)}));

  window._dsItems = items;

  let listHtml = items.length
    ? items.map((it,i)=>'<div class="event-item" onclick="window._dsItems['+i+'].action();closeFullscreen()">'
        +'<span class="event-item-icon">'+it.icon+'</span>'
        +'<div class="event-item-body"><div class="event-item-title">'+escHtml(it.title)+'</div>'
        +(it.sub?'<div class="event-item-sub">'+it.sub+'</div>':'')
        +'</div><span class="event-source-badge">'+it.badge+'</span></div>'
      ).join("")
    : '<div class="empty-state" style="padding:30px"><p>Nothing on this day</p></div>';

  const html = '<div class="fs-header">'
    + '<button class="fs-back" onclick="closeFullscreen()">&#8592;</button>'
    + '<span style="font-size:1.1rem;font-weight:700;flex:1">'+formatDate(date)+'</span>'
    + (date===today?'<button onclick="openJournalEditor(null,\''+date+'\')" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:.88rem;font-weight:700">+Journal</button>':"")
    + '</div>'
    + listHtml
    + '<div style="padding:16px"><button class="btn btn-primary btn-full" onclick="closeDayAndNewPlan(\''+date+'\')">+ Add Plan / Event</button></div>';

  openFullscreen(html);
}

// ── Health Notes view ────────────────────────────────────────────────
async function renderHealthNotes(el) {
  const targetEl = el || document.getElementById("tab-calendar");
  const allNotes = await notesGetAll();
  const health   = allNotes.filter(n => (n.tags||[]).includes("health"));

  if (!health.length) {
    targetEl.innerHTML = '<div class="empty-state"><div class="ei">&#128138;</div><p>No health notes yet.<br>Tap + → Health Note to add one.</p></div>';
    return;
  }

  // Sort newest first
  health.sort((a, b) => (b.modifiedAt||0) - (a.modifiedAt||0));

  // Group by date
  const byDate = {};
  health.forEach(n => {
    const d = dateToStr(new Date(n.modifiedAt));
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(n);
  });

  window._healthNotes = health;
  let idx = 0;

  targetEl.innerHTML = Object.entries(byDate)
    .sort((a,b) => b[0].localeCompare(a[0]))
    .map(([date, notes]) =>
      '<div class="event-date-group">&#128138; ' + formatDate(date) + '</div>' +
      notes.map(n => {
        const i = idx++;
        const preview = (n.body||'').replace(/\n/g,' ').substring(0, 60);
        const title   = n.title || (n.body||'').split('\n')[0] || 'Health note';
        return '<div class="event-item" onclick="openNoteViewer(window._healthNotes['+i+'])">'
          + '<span class="event-item-icon" style="color:#ef4444">&#128138;</span>'
          + '<div class="event-item-body">'
            + '<div class="event-item-title">' + escHtml(title) + '</div>'
            + (preview ? '<div class="event-item-sub">' + escHtml(preview) + '</div>' : '')
          + '</div>'
          + '<span class="event-source-badge" style="background:rgba(239,68,68,.12);color:#ef4444">Health</span>'
        + '</div>';
      }).join('')
    ).join('');
}

function closeDayAndNewPlan(date) { closeFullscreen(); setTimeout(()=>openPlanEditor(null,date),300); }
