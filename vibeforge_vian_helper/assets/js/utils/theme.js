// theme.js
function applyTheme(theme) {
  document.body.dataset.theme = theme||"light";
  localStorage.setItem("vian-theme",theme);
  const mc = document.querySelector("meta[name=theme-color]");
  if (mc) mc.content = theme==="dark"?"#1f2937":"#0D9488";
}
function getTheme() { return localStorage.getItem("vian-theme")||"light"; }
function toggleTheme() { const t=getTheme()==="light"?"dark":"light"; applyTheme(t); return t; }