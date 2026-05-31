// expense-db.js
const CATEGORIES = {
  "Food":["Fresh","Dry","Spice","Snack"],
  "Pharmacy":["Medicine","Other"],
  "Toiletry":["Soap","Toothpaste","Shampoo","Other"],
  "Bills":["Electricity","Water","Internet","Other"],
  "Extra":["Gifts","Repairs","Miscellaneous"],
  "Transport":["Auto","Uber","Bus","Train","Other"],
  "Electronics":["Charger","Earphones","Cable","Battery","Other"],
  "Clothes":["Shirt","Pants","Fabric","Accessories","Other"]
};
const CATEGORY_ICONS = {Food:"\u{1F35A}",Pharmacy:"\u{1F48A}",Toiletry:"\u{1F6C1}",Bills:"\u{1F4A1}",Extra:"\u{1F381}",Transport:"\u{1F695}",Electronics:"\u{1F4F1}",Clothes:"\u{1F455}"};
const SHOPS = ["Kirana","Market","Pharmacy"];
const WEIGHT_PRESETS = [{label:"100g",kg:0.1},{label:"250g",kg:0.25},{label:"500g",kg:0.5},{label:"1kg",kg:1},{label:"2kg",kg:2},{label:"Other",kg:null}];

async function expenseGetAll() { return dbGetAll("expenses"); }
async function expenseSave(e) {
  if (!e.createdAt) e.createdAt = Date.now();
  if (e.id) return dbPut("expenses",e);
  return dbAdd("expenses",e);
}
async function expenseDelete(id) { return dbDelete("expenses",id); }
async function expenseGetByDate(date) { return dbGetByIndex("expenses","date",date); }
async function expenseGetTrips() {
  const all = await expenseGetAll();
  const byDate = {};
  all.forEach(e=>{ if(!byDate[e.date])byDate[e.date]=[]; byDate[e.date].push(e); });
  return Object.entries(byDate)
    .sort((a,b)=>b[0].localeCompare(a[0]))
    .map(([date,items])=>({date,items,
      total: items.reduce((s,i)=>s+(parseFloat(i.price)||0),0).toFixed(2),
      totalWeight: items.reduce((s,i)=>s+(parseFloat(i.weight_kg)||0),0).toFixed(2)
    }));
}
function expenseAutoHistory() { return JSON.parse(localStorage.getItem("vian-expense-items")||"[]"); }
function expenseAutoAdd(item) {
  let list = expenseAutoHistory();
  list = [item,...list.filter(i=>i!==item)].slice(0,200);
  localStorage.setItem("vian-expense-items", JSON.stringify(list));
}