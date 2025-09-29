// Non-module boot to ensure logging and import order.
console.log('[av-voice-visualizer] boot.js loaded');
(async () => {
  try { await import('./main.js'); console.log('[av-voice-visualizer] boot imported main.js'); }
  catch (e) { console.error('[av-voice-visualizer] boot failed to import main.js', e); }
})();
