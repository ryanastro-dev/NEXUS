(() => {
  const statusEl = document.getElementById("status-text");
  if (!statusEl) return;

  const messages = [
    "Initializing core systems...",
    "Verifying security keys...",
    "Connecting monitor channels...",
    "Restoring workspace state...",
  ];

  let idx = 0;
  window.setInterval(() => {
    idx = (idx + 1) % messages.length;
    statusEl.textContent = messages[idx];
  }, 1800);
})();
