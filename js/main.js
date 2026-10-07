/* =========================================================================
   SI-RDK · main.js — boot
   ========================================================================= */
function boot() {
  setupChartDefaults();
  loadState();
  bindGlobalEvents();
  if (appState.currentUser) {
    scanOverdue(); saveState();
    showApp();
    const r = location.hash.slice(1);
    ui.route = Pages[r] ? r : 'dashboard';
    renderPage();
  } else {
    renderLogin();
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
