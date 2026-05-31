// expense-tab.js
let expenseEditId = null;

async function renderExpenseTab() {
  renderExpenseHistory();
}

async function renderExpenseHistory() {
  const trips = await expenseGetTrips();
  const el = document.getElementById("tab-expense");
  if (!trips.length) {
    el.innerHTML = `<div class="empty-state"><div class="ei">&#128176;</div><p>No expenses yet. Tap + to add one.</p></div>`;
    return;
  }
  el.innerHTML = trips.map((trip,ti)=>`
    <div>
      <div class="trip-header" onclick="toggleTrip(${ti})">
        <div>
          <div class="trip-title">&#128197; ${formatDate(trip.date)}</div>
          <div class="trip-meta">${trip.items.length} items &nbsp;&#8226;&nbsp; &#8377;${trip.total} &nbsp;&#8226;&nbsp; ${trip.totalWeight}kg</div>
        </div>
        <span id="trip-arrow-${ti}" style="font-size:1.2rem;color:var(--text-secondary)">&#9654;</span>
      </div>
      <div id="trip-items-${ti}" class="trip-items hidden">
        ${trip.items.map((item)=>`
          <div class="trip-item-row" onclick="openExpenseInput(${item.id})">
            <div class="trip-item-name">${escHtml(item.item||"Item")}</div>
            <div class="trip-item-meta">&#8377;${item.price||0} &nbsp; ${item.weight_label||""}</div>
          </div>`).join("")}
      </div>
    </div>`).join("");
}

function toggleTrip(ti) {
  const items = document.getElementById("trip-items-"+ti);
  const arrow = document.getElementById("trip-arrow-"+ti);
  if (!items) return;
  const open = !items.classList.contains("hidden");
  items.classList.toggle("hidden", open);
  if(arrow) arrow.innerHTML = open?"&#9654;":"&#9660;";
}

async function renderExpenseAnalytics() {
  const all = await expenseGetAll();
  const total = all.reduce((s,i)=>s+(parseFloat(i.price)||0),0).toFixed(2);
  const totalW = all.reduce((s,i)=>s+(parseFloat(i.weight_kg)||0),0).toFixed(2);
  const el = document.getElementById("tab-expense");

  // Category totals
  const catTotals = {};
  all.forEach(i=>{
    const c=i.category||"Other";
    catTotals[c]=(catTotals[c]||0)+(parseFloat(i.price)||0);
  });

  el.innerHTML = `
    <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;gap:16px;justify-content:space-around;background:var(--surface)">
      <div style="text-align:center"><div style="font-size:1.4rem;font-weight:700;color:var(--accent-expense)">&#8377;${total}</div><div style="font-size:.72rem;color:var(--text-secondary)">Total Spent</div></div>
      <div style="text-align:center"><div style="font-size:1.4rem;font-weight:700">${totalW}kg</div><div style="font-size:.72rem;color:var(--text-secondary)">Total Weight</div></div>
      <div style="text-align:center"><div style="font-size:1.4rem;font-weight:700">${all.length}</div><div style="font-size:.72rem;color:var(--text-secondary)">Items</div></div>
    </div>
    <div style="padding:16px">
      <h3 style="font-size:.85rem;color:var(--text-secondary);margin-bottom:12px">BY CATEGORY</h3>
      ${Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>{
        const pct=Math.round(amt/parseFloat(total)*100)||0;
        return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:.88rem;margin-bottom:3px">
            <span>${CATEGORY_ICONS[cat]||"&#128194;"} ${cat}</span>
            <span>&#8377;${amt.toFixed(2)} (${pct}%)</span>
          </div>
          <div style="height:6px;background:var(--border);border-radius:3px">
            <div style="height:100%;width:${pct}%;background:var(--accent-expense);border-radius:3px"></div>
          </div>
        </div>`;
      }).join("")}
    </div>`;
}

async function openExpenseInput(id) {
  let item = null;
  if (id) item = await dbGet("expenses", id);
  expenseEditId = id || null;
  const isEdit = !!item;
  const customShops = JSON.parse(localStorage.getItem("vian-custom-shops")||"[]");
  const shops = [...SHOPS, ...customShops];

  const html = `
    <div class="fs-header">
      <button class="fs-back" onclick="closeFullscreen()">&#8592;</button>
      <span style="font-size:1.1rem;font-weight:700;flex:1">${isEdit?"Edit Item":"New Expense"}</span>
      <button class="fs-menu-btn" onclick="saveExpenseItem()" style="color:var(--accent);font-weight:700">${isEdit?"Finish Editing":"Add Item"}</button>
    </div>
    <div class="form-page">
      <div class="form-group">
        <label>Item Name</label>
        <input id="ei-item" value="${escAttr(item&&item.item||"")}" placeholder="e.g. Rice" oninput="expenseAutoSuggest(this.value)"/>
        <div id="ei-suggest" style="display:none;border:1px solid var(--border);border-radius:8px;margin-top:4px;overflow:hidden;max-height:120px;overflow-y:auto"></div>
      </div>
      <div class="form-group">
        <label>Price (&#8377;)</label>
        <input id="ei-price" type="number" value="${item?item.price:""}" placeholder="0.00" step="0.01"/>
      </div>
      <div class="form-group">
        <label>Weight</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="weight-btns">
          ${WEIGHT_PRESETS.map(w=>`<button class="freq-btn ${item&&item.weight_label===w.label?"active":""}" onclick="selectWeight('${w.label}',${w.kg},this)">${w.label}</button>`).join("")}
        </div>
        <input id="ei-weight" type="number" class="${item&&item.weight_label==="Other"?"":"hidden"}" value="${item?item.weight_kg:""}" placeholder="Weight in kg" style="margin-top:8px"/>
      </div>
      <div class="form-group">
        <label>Shop</label>
        <select id="ei-shop">
          ${shops.map(s=>`<option ${item&&item.shop===s?"selected":""}>${s}</option>`).join("")}
          <option value="__new">+ Add new shop</option>
        </select>
      </div>
      <div class="form-group">
        <label>Category</label>
        <select id="ei-cat" onchange="updateSubcats()">
          ${Object.keys(CATEGORIES).map(c=>`<option ${item&&item.category===c?"selected":""}>${c}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Subcategory</label>
        <select id="ei-subcat"></select>
      </div>
      <div class="form-group">
        <label>Date</label>
        <input id="ei-date" type="date" value="${item?item.date:dateToStr(new Date())}"/>
      </div>
      <div class="form-group">
        <label>Comments</label>
        <input id="ei-comments" value="${escAttr(item&&item.comments||"")}" placeholder="Optional notes"/>
      </div>
      <div style="height:80px"></div>
    </div>`;

  openFullscreen(html);
  updateSubcats(item&&item.subcategory);

  document.getElementById("ei-shop").addEventListener("change",function(){
    if(this.value==="__new"){
      const name=prompt("New shop name:");
      if(name){
        const list=JSON.parse(localStorage.getItem("vian-custom-shops")||"[]");
        if(!list.includes(name)){list.push(name);localStorage.setItem("vian-custom-shops",JSON.stringify(list));}
        const opt=document.createElement("option"); opt.value=name; opt.text=name; opt.selected=true;
        this.insertBefore(opt,this.lastElementChild);
      }
    }
  });
}

window._selectedWeight = {label:"",kg:null};
function selectWeight(label, kg, btn) {
  window._selectedWeight={label,kg};
  document.querySelectorAll("#weight-btns .freq-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  const custom=document.getElementById("ei-weight");
  if(custom){custom.classList.toggle("hidden",label!=="Other");}
}

function updateSubcats(selected) {
  const cat=document.getElementById("ei-cat");
  if(!cat)return;
  const subs=CATEGORIES[cat.value]||[];
  const el=document.getElementById("ei-subcat");
  if(!el)return;
  el.innerHTML=subs.map(s=>`<option ${s===selected?"selected":""}>${s}</option>`).join("");
}

function expenseAutoSuggest(q) {
  const box=document.getElementById("ei-suggest");
  if(!box)return;
  if(!q.trim()){box.style.display="none";return;}
  const history=expenseAutoHistory();
  const matches=history.filter(i=>i.toLowerCase().includes(q.toLowerCase())).slice(0,6);
  if(!matches.length){box.style.display="none";return;}
  box.style.display="block";
  box.innerHTML=matches.map(m=>`<div style="padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:.9rem" onclick="document.getElementById('ei-item').value='${escAttr(m)}';document.getElementById('ei-suggest').style.display='none'">${escHtml(m)}</div>`).join("");
}

async function saveExpenseItem() {
  const item=document.getElementById("ei-item").value.trim();
  if(!item){showToast("Please enter item name");return;}
  const w=window._selectedWeight;
  const wInput=document.getElementById("ei-weight");
  const wKg = w.label==="Other"&&wInput?(parseFloat(wInput.value)||0):w.kg;
  const obj = {
    item, price:parseFloat(document.getElementById("ei-price").value)||0,
    weight_label:w.label||"", weight_kg:wKg||0,
    shop:document.getElementById("ei-shop").value,
    category:document.getElementById("ei-cat").value,
    subcategory:document.getElementById("ei-subcat").value,
    date:document.getElementById("ei-date").value||dateToStr(new Date()),
    comments:document.getElementById("ei-comments").value,
  };
  if(expenseEditId) obj.id=expenseEditId;
  await expenseSave(obj);
  expenseAutoAdd(item);
  showToast(expenseEditId?"Item updated!":"Item added!");
  closeFullscreen();
}

function openOCRImport() {
  const html=`
    <div class="fs-header"><button class="fs-back" onclick="closeFullscreen()">&#8592;</button><span style="font-weight:700;font-size:1.1rem">Import Calendar Events</span></div>
    <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
      <p style="font-size:.88rem;color:var(--text-secondary)">Paste text from OCR or physical calendar. Each line should contain a date and event name.</p>
      <textarea id="ocr-input" style="min-height:200px;border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--surface);color:var(--text);font-family:inherit;font-size:.9rem" placeholder="Feb 14 - Valentine Day&#10;Full Moon March 3 11:23 PM&#10;Holi - March 25"></textarea>
      <button class="btn btn-primary btn-full" onclick="previewOCR()">Parse & Preview</button>
      <div id="ocr-preview"></div>
    </div>`;
  openFullscreen(html);
}

async function previewOCR() {
  const text=document.getElementById("ocr-input").value;
  const events=parseOCRText(text);
  window._ocrEvents=events;
  const preview=document.getElementById("ocr-preview");
  if(!events.length){preview.innerHTML=`<p style="color:var(--text-secondary);font-size:.88rem">No events found. Check the format.</p>`;return;}
  preview.innerHTML=`<h3 style="font-size:.85rem;margin-bottom:10px;color:var(--text-secondary)">${events.length} events found:</h3>`+
    events.map((e,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
      <input type="checkbox" checked id="ocr-ev-${i}"/>
      <span style="font-size:.88rem">${e.date} &mdash; ${escHtml(e.title)}</span>
    </div>`).join("")+
    `<button class="btn btn-primary btn-full" style="margin-top:12px" onclick="confirmOCRImport()">Import Selected</button>`;
}

async function confirmOCRImport() {
  const events=(window._ocrEvents||[]).filter((_,i)=>{const cb=document.getElementById("ocr-ev-"+i);return cb&&cb.checked;});
  for(const ev of events) await eventSave(ev);
  showToast(events.length+" events imported!");
  closeFullscreen();
}
