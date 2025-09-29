# Changelog

## 0.3.1
- **Fix**: Overlay no longer binds to elements inside the visualizer window (no more duplicate “big bar” under tiles).
- **Targeting**: Prefer `CameraViews#getUserCameraView(userId)` when available; conservative fallback if not.
- **Docs**: Added README and CHANGELOG.

## 0.3.0
- **Render**: Window now uses `PARTS` + `_onRender` (v13 Handlebars app) to avoid empty body.
- **Lifecycle**: `_buildTiles(root)` defaults to `this.element`, cleans up analysers, guards re‑entrancy.
- **Controls**: Record‑based injection for v13; adds **Voice Viz** and **Voice Viz Overlay** to **Tokens**.
- **Boot**: `scripts/boot.js` ensures `main.js` import + startup logs.

## 0.2.9
- **Context**: Window lists **all active users**; analyser attaches only when a user has an A/V stream.
- **Logs**: Extra diagnostics for stream discovery.

## 0.2.8
- Initial packaged proof‑of‑concept: waveform window + optional overlay; early controls injection and logging.
