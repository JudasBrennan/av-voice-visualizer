console.log('[av-voice-visualizer] main.js loaded');

import { Overlay } from './overlay.js';
import { VisualTile } from './visual-tile.js';

const MODULE_ID = 'av-voice-visualizer';

Hooks.once('init', () => {
  console.log(`[${MODULE_ID}] init — Foundry`, game?.release, 'Build:', game?.build);

  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

  class AVWaveformWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: 'avviz-window',
      classes: ['avviz'],
      tag: 'section',
      window: { title: 'Voice Visualizer', resizable: true, minimize: true, width: 820, height: 620 },
      position: { width: 820, height: 620 }
    };
    static PARTS = { body: { template: `modules/${MODULE_ID}/templates/window.hbs` } };
    static instance;
    static getInstance(){ if (!this.instance) this.instance = new this(); return this.instance; }

    async _prepareContext() {
      const av = game.webrtc?.client;
      const connected = new Set(av?.getConnectedUsers?.() ?? []);
      const players = game.users.filter(u => u.active).map(u => ({
        id: u.id, name: u.name, status: connected.has(u.id) ? 'connected' : 'not connected', color: u.color
      }));
      console.log(`[${MODULE_ID}] _prepareContext players:`, players.map(p=>`${p.name} (${p.status})`));
      return { players };
    }

    async _onRender(context, options) {
      if (this.__rendering) return;
      this.__rendering = true;
      try {
        if (!this._ac) this._ac = new (window.AudioContext || window.webkitAudioContext)();
        await this._buildTiles(this.element);
        if (this._raf) cancelAnimationFrame(this._raf);
        const loop = () => { for (const t of this._tiles ?? []) t.draw?.(); this._raf = requestAnimationFrame(loop); };
        this._raf = requestAnimationFrame(loop);
      } catch (e) { console.error(`[${MODULE_ID}] _onRender error:`, e); }
      finally { this.__rendering = false; }
    }

    _buildTiles(root) {
      const av = game.webrtc?.client;
      const host = root ?? this.element;
      if (!host || !host.querySelectorAll) { console.warn(`[${MODULE_ID}] _buildTiles: no host element yet`); return; }
      (this._tiles ?? []).forEach(t => { try { t.destroy?.(); } catch(e) {} });
      this._tiles = [];

      const tiles = host.querySelectorAll('.avviz-tile');
      tiles.forEach(tileEl => {
        const uid = tileEl.dataset.userId;
        const canvas = tileEl.querySelector('.avviz-canvas');
        const stream = av?.getLevelsStreamForUser?.(uid) || av?.getMediaStreamForUser?.(uid);
        console.log(`[${MODULE_ID}] tile for ${uid} stream:`, !!stream);
        if (!canvas || !stream) return;
        const tile = new VisualTile({ userId: uid, mediaStream: stream, canvas, audioContext: this._ac });
        this._tiles.push(tile);
      });

      try { this._ros?.disconnect(); } catch(e) {}
      this._ros = new ResizeObserver(() => this._tiles.forEach(t => t.resize?.()));
      this._ros.observe(host);
      console.log(`[${MODULE_ID}] _buildTiles done; analyser tiles:`, this._tiles.length);
    }

    async close(options) {
      try { if (this._raf) cancelAnimationFrame(this._raf); this._ros?.disconnect?.(); this._tiles?.forEach?.(t => t.destroy?.()); this._tiles = []; } catch(e) {}
      return super.close(options);
    }
  }

  globalThis.__AVV_WindowClass = AVWaveformWindow;
  globalThis.AVViz = { open: () => AVWaveformWindow.getInstance().render(true), overlayToggle: () => Overlay.toggle() };

  function ensureToolsInRecord(controlsRecord) {
    try {
      const rec = controlsRecord && typeof controlsRecord === 'object' ? controlsRecord : null;
      console.log(`[${MODULE_ID}] ensureToolsInRecord: keys=`, rec ? Object.keys(rec) : null);
      if (!rec) return false;
      const keys = Object.keys(rec); if (!keys.length) return false;
      let group = rec['tokens'] ?? rec['token'] ?? rec[keys[0]];
      if (!group || !group.tools || typeof group.tools !== 'object') return false;
      if (!group.tools['avviz-open']) group.tools['avviz-open'] = {
        name: 'avviz-open', title: 'Voice Viz', icon: 'fa-solid fa-wave-square', button: true, order: 998,
        onClick: () => AVWaveformWindow.getInstance().render(true)
      };
      if (!group.tools['avviz-overlay-toggle']) group.tools['avviz-overlay-toggle'] = {
        name: 'avviz-overlay-toggle', title: 'Voice Viz Overlay', icon: 'fa-solid fa-layer-group', button: true, order: 999,
        onClick: () => Overlay.toggle()
      };
      console.log(`[${MODULE_ID}] tools injected into '${group.name ?? 'unknown'}'`);
      return true;
    } catch (e) { console.error(`[${MODULE_ID}] ensureToolsInRecord error:`, e); return false; }
  }

  Hooks.on('getSceneControlButtons', (controlsRecord) => { console.log(`[${MODULE_ID}] getSceneControlButtons (record)`); ensureToolsInRecord(controlsRecord); });
  Hooks.on('renderSceneControls', () => { console.log(`[${MODULE_ID}] renderSceneControls -> ensure tools exist`); ensureToolsInRecord(ui.controls?.controls); });

  Hooks.once('ready', () => {
    console.log(`[${MODULE_ID}] ready — users:`, game.users.map(u => ({id:u.id, name:u.name, active:u.active, isGM:u.isGM})));
    console.log(`[${MODULE_ID}] WebRTC client present:`, !!game.webrtc?.client);
  });
});
