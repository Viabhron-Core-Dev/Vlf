// app.js — VibeForge Vian Helper

// ── PWA install prompt ───────────────────────────────────────────────
// Chrome fires 'beforeinstallprompt' when the PWA is installable.
// We capture it and show an "Install App" button in settings.
window._pwaInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // stop Chrome's mini-bar
  window._pwaInstallPrompt = e;
  // Show install button anywhere it exists in the DOM
  document.querySelectorAll('.pwa-install-btn').forEach(b => b.style.display = 'block');
  console.log('PWA installable!');
});
window.addEventListener('appinstalled', () => {
  window._pwaInstallPrompt = null;
  showToast('App installed! ✓');
  document.querySelectorAll('.pwa-install-btn').forEach(b => b.style.display = 'none');
});

function triggerPWAInstall() {
  if (!window._pwaInstallPrompt) {
    // Fallback: Chrome install instruction
    showToast('Open Chrome menu → "Add to Home Screen"', 4000);
    return;
  }
  window._pwaInstallPrompt.prompt();
  window._pwaInstallPrompt.userChoice.then(result => {
    if (result.outcome === 'accepted') showToast('Installing…');
    window._pwaInstallPrompt = null;
  });
}

async function init() {
  try {
    applyTheme(getTheme());
    await initDB();
    if ("serviceWorker" in navigator) {
      // Coach pattern: no scope override — manifest declares it
      navigator.serviceWorker.register("sw.js")
        .then(reg => {
          console.log("SW registered:", reg.scope);
          reg.update();
        })
        .catch(err => console.warn("SW failed:", err));
    }
    await renderNotesTab();
    updateMenuStrip("notes");
    updateJournalFab();
    initKeyboardHandler();
    initScrollToTop();
  } catch(err) {
    console.error("Init error:", err);
    document.getElementById("tab-notes").innerHTML =
      `<div style="padding:20px;color:red;font-size:.85rem">
        <b>Startup error:</b><br>${err.message||err}
      </div>`;
  }
}

function showToast(msg, duration) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove("show"), duration || 2400);
}

// ── Keyboard handler ─────────────────────────────────────────────────
// Resizes #fullscreen to match visual viewport — keeps toolbar pinned above keyboard.
function initKeyboardHandler() {
  if (!window.visualViewport) return;

  function onVP() {
    const fs = document.getElementById("fullscreen");
    if (!fs || !fs.classList.contains("visible")) return;
    const vv = window.visualViewport;
    // Shrink fullscreen to match visible area
    fs.style.top    = vv.offsetTop  + "px";
    fs.style.left   = vv.offsetLeft + "px";
    fs.style.width  = vv.width  + "px";
    fs.style.height = vv.height + "px";
  }

  function resetFS() {
    const fs = document.getElementById("fullscreen");
    if (fs) fs.style.cssText = fs.style.cssText
      .replace(/top:[^;]+;?/g,"")
      .replace(/left:[^;]+;?/g,"")
      .replace(/width:[^;]+;?/g,"")
      .replace(/height:[^;]+;?/g,"");
  }

  window.visualViewport.addEventListener("resize", onVP);
  window.visualViewport.addEventListener("scroll", onVP);

  // Reset sizes when fullscreen is hidden
  const fsEl = document.getElementById("fullscreen");
  const observer = new MutationObserver(() => {
    if (!fsEl.classList.contains("visible")) resetFS();
    else onVP();
  });
  observer.observe(fsEl, { attributes: true, attributeFilter: ["class"] });
}

// ── Scroll-to-top button ─────────────────────────────────────────────
function initScrollToTop() {
  const btn = document.createElement("button");
  btn.id = "scroll-top-btn";
  btn.innerHTML = "&#8679;";
  btn.title = "Back to top";
  document.body.appendChild(btn);

  const content = document.getElementById("content");
  content.addEventListener("scroll", () => {
    const active = document.querySelector(".tab.active");
    const isLong = active && ["tab-notes","tab-calendar","tab-expense"].includes(active.id);
    toggleScrollBtn(btn, content.scrollTop > 300 && isLong);
  });

  // paper-area is the scroll container inside fullscreen
  document.getElementById("fullscreen").addEventListener("scroll", e => {
    if (e.target.classList && (e.target.classList.contains("paper-area") || e.target.classList.contains("form-page"))) {
      toggleScrollBtn(btn, e.target.scrollTop > 300);
    }
  }, true);

  btn.addEventListener("click", () => {
    const fsFull = document.getElementById("fullscreen");
    if (fsFull && fsFull.classList.contains("visible")) {
      const pa = fsFull.querySelector(".paper-area, .form-page");
      if (pa) pa.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      content.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

function toggleScrollBtn(btn, show) {
  btn.classList.toggle("visible", show);
}

// ── Close menus on content tap ───────────────────────────────────────
document.getElementById("content").addEventListener("click", (e) => {
  if (e.target.closest("#universal-menu") || e.target.closest(".ms-dropdown")) return;
  document.getElementById("universal-menu").classList.add("hidden");
  if (typeof closeFabPicker === "function") closeFabPicker();
  if (typeof closeAllMSDropdowns === "function") closeAllMSDropdowns();
});

init();