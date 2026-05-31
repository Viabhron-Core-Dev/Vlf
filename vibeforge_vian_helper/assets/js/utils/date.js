// date.js
function dateToStr(d) {
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function strToDate(s) { const[y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function formatDate(s) {
  if (!s) return "";
  const d = typeof s==="string" ? strToDate(s) : s;
  return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}
function formatDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})+" "+d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
}
function relativeDate(ts) {
  if (!ts) return "";
  const diff = Date.now()-ts;
  if (diff<60000) return "just now";
  if (diff<3600000) return Math.floor(diff/60000)+"m ago";
  if (diff<86400000) return Math.floor(diff/3600000)+"h ago";
  if (diff<604800000) return Math.floor(diff/86400000)+"d ago";
  return formatDateTime(ts);
}
function getDaysInMonth(year,month) { return new Date(year,month+1,0).getDate(); }
function getLastNDays(n) {
  const days=[];
  for(let i=n-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(dateToStr(d)); }
  return days;
}
function dayName(dateStr) { return strToDate(dateStr).toLocaleDateString("en-IN",{weekday:"short"}); }