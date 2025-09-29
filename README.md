# AV Voice Visualizer (Overlay + Window)

A lightweight Foundry VTT module that renders a **live audio waveform** for each user connected to Foundry’s A/V system.
You can view waveforms in a **window** (per‑user tiles) and optionally **overlay** a waveform on each user’s camera/portrait
in the A/V dock.

> Built for Foundry **v13** APIs (verified on **13.348**). Uses only official Foundry APIs and the Web Audio API—no extra deps.

---

## Features
- **Waveform window** (ApplicationV2 + Handlebars): auto‑lists active users; draws a waveform for those with A/V streams.
- **Camera overlay** (optional): draws a compact waveform over each user’s camera/portrait in the A/V dock.
- **Modern v13 tool injection**: adds two buttons to the **Tokens** toolbox:
  - **Voice Viz** — opens the window
  - **Voice Viz Overlay** — toggles overlay on/off
- **Minimal footprint**: no settings, no DB writes; clean teardown when closed.

## Install
1. Download the latest release’s `module.zip` and extract to:
   ```
   <Foundry data>/Data/modules/av-voice-visualizer/
   ```
2. Enable **AV Voice Visualizer** in **Manage Modules** and reload the world.

### Compatibility
- Foundry **v13+** (verified on **13.348**).
- Works with the **core A/V (WebRTC)** system. If a user is not connected to Foundry A/V, their tile remains visible but no waveform is drawn.

## Usage
1. Open the **Token Controls** tool shelf.
2. Click **Voice Viz** to open the window.
3. (Optional) Click **Voice Viz Overlay** to show waveforms over the A/V dock portraits.

**Tips**
- If the window shows tiles but no movement, ensure at least one user is actually connected to Foundry’s A/V (green mic icon).
- Click **Start Audio** if your browser requires a user gesture to resume the `AudioContext`.
- Use **Refresh** to re‑scan for newly connected users.

## Known Limitations
- The module **reads** streams from the AV system; it does **not** manage signaling/negotiation. WebRTC errors (e.g. m‑line order)
  are upstream in Foundry’s AV stack or network conditions.
- Overlay targets the core CameraViews. If a theme replaces the A/V DOM heavily, overlay targeting might need a selector tweak.

## Troubleshooting
- **Window is empty** → ensure v13+, and that `templates/window.hbs` loads (Network tab shows 200).
- **No waveform while connected** → in console:
  ```js
  const id = game.user.id;
  const s = game.webrtc?.client?.getLevelsStreamForUser?.(id)
         || game.webrtc?.client?.getMediaStreamForUser?.(id);
  console.log("stream?", !!s, "tracks", s?.getAudioTracks?.().length);
  ```
- **Overlay appears inside the window** → Fixed in **v0.3.1** (overlay ignores anything inside `.avviz-window`).

## Development
- **APIs:** `getSceneControlButtons` (record form in v13), `ApplicationV2` + `HandlebarsApplicationMixin` (`PARTS`, `_onRender`),
  `game.webrtc.client.getConnectedUsers()`, `getLevelsStreamForUser()`, `getMediaStreamForUser()`; Web Audio `AudioContext`/`AnalyserNode`.
- **Design goals:** small diffs, no external deps, comments explain *why*, not *what*.
- **Attribution:** Portions of scaffolding were **generated with ChatGPT and edited by maintainers**.

## Macro Quickstart
```js
// Open the visualizer window
AVViz.open();

// Toggle the overlay
AVViz.overlayToggle();
```

## License
MIT
