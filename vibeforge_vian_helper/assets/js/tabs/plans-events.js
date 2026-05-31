// plans-events.js
function openPlanEditor(event, dateOverride) {
  const ev = event ? {...event} : {title:"",date:dateOverride||dateToStr(new Date()),time:"",endTime:"",color:"blue",body:"",icon:"&#128197;",type:"plan",reminder:"none",repeat:"none"};
  window._currentEvent = ev;
  const allIcons=["&#128197;","&#127968;","&#128188;","&#127808;","&#9992;&#65039;","&#128115;","&#127942;","&#127891;","&#128722;","&#128138;","&#128247;","&#128176;","&#127978;","&#10084;&#65039;","&#127869;","&#9917;","&#127947;","&#129528;","&#128664;","&#128640;","&#128293;","&#127974;","&#127881;","&#127382;","&#9200;","&#128203;","&#128222;","&#128190;","&#10003;","&#127755;"];
  const html=`
    <div class="fs-header">
      <button class="fs-back" onclick="closeFullscreen()">&#8592;</button>
      <button class="fs-menu-btn" id="ev-icon-btn" onclick="toggleIconPicker()" style="font-size:1.4rem">${ev.icon||"&#128197;"}</button>
      <input class="fs-title-input" id="ev-title" placeholder="Plan / Event title" value="${escAttr(ev.title||"")}"/>
      <button class="fs-menu-btn" onclick="savePlanEvent()" style="color:var(--accent);font-weight:700">Save</button>
    </div>
    <div id="icon-picker-panel" class="hidden" style="background:var(--surface);border-bottom:1px solid var(--border)">
      <div class="icon-picker-grid">${allIcons.map(ic=>`<div class="ip-icon ${ev.icon===ic?"selected":""}" onclick="setEventIcon('${ic}')">${ic}</div>`).join("")}</div>
    </div>
    <div class="event-fields">
      <div class="ef-row"><span class="ef-label">&#128197; Date</span><input type="date" class="ef-value" id="ev-date" value="${ev.date||dateToStr(new Date())}"/></div>
      <div class="ef-row"><span class="ef-label">&#128336; Time</span><input type="time" class="ef-value" id="ev-time" value="${ev.time||""}"/></div>
      <div class="ef-row"><span class="ef-label">&#128517; End</span><input type="time" class="ef-value" id="ev-endtime" value="${ev.endTime||""}"/></div>
      <div class="ef-row"><span class="ef-label">&#128276; Reminder</span>
        <select class="ef-value" id="ev-reminder">
          ${["none","5min","15min","30min","1hour","1day"].map(r=>`<option value="${r}" ${ev.reminder===r?"selected":""}>${r==="none"?"Off":r}</option>`).join("")}
        </select>
      </div>
      <div class="ef-row"><span class="ef-label">&#128260; Repeat</span>
        <select class="ef-value" id="ev-repeat">
          ${["none","daily","weekly","monthly","yearly"].map(r=>`<option value="${r}" ${ev.repeat===r?"selected":""}>${r==="none"?"None":r.charAt(0).toUpperCase()+r.slice(1)}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="paper-area paper-blue" id="ev-paper" style="flex:1">
      <div class="paper-lines">
        <textarea class="paper-textarea" id="ev-body" placeholder="Notes about this plan...">${escHtml(ev.body||"")}</textarea>
      </div>
    </div>
    <div class="editor-toolbar">
      <button class="tb-btn" onclick="document.execCommand('undo')">&#8617;</button>
      <button class="tb-btn" onclick="document.execCommand('redo')">&#8618;</button>
      ${ev.id?`<button class="tb-btn" style="margin-left:auto;color:#ef4444" onclick="deletePlanEvent(${ev.id})">&#128465;</button>`:""}
    </div>`;
  openFullscreen(html);
}

function toggleIconPicker() {
  document.getElementById("icon-picker-panel").classList.toggle("hidden");
}

function setEventIcon(icon) {
  window._currentEvent.icon=icon;
  document.getElementById("ev-icon-btn").innerHTML=icon;
  document.getElementById("icon-picker-panel").classList.add("hidden");
}

async function savePlanEvent() {
  const ev=window._currentEvent;
  ev.title=document.getElementById("ev-title").value.trim();
  if(!ev.title){showToast("Please enter a title");return;}
  ev.date=document.getElementById("ev-date").value;
  ev.time=document.getElementById("ev-time").value;
  ev.endTime=document.getElementById("ev-endtime").value;
  ev.reminder=document.getElementById("ev-reminder").value;
  ev.repeat=document.getElementById("ev-repeat").value;
  ev.body=document.getElementById("ev-body").value;
  ev.type="plan";
  await eventSave(ev);
  showToast(ev.id?"Event updated!":"Event saved!");
  closeFullscreen();
}

async function deletePlanEvent(id) {
  if(!confirm("Delete this event?")) return;
  await eventDelete(id);
  showToast("Deleted");
  closeFullscreen();
}
