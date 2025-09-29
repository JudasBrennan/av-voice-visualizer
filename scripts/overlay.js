console.log('[av-voice-visualizer] overlay module loaded');

class OverlayVisualizer {
  constructor({ userId, hostEl, stream, audioContext }) {
    this.uid = userId; this.host = hostEl; this.ac = audioContext;
    this.src = this.ac.createMediaStreamSource(stream);
    this.ana = this.ac.createAnalyser(); this.ana.fftSize = 1024; this.ana.smoothingTimeConstant = 0.85;
    this.src.connect(this.ana); this.buf = new Uint8Array(this.ana.fftSize);
    this.canvas = document.createElement('canvas'); this.canvas.className = 'avviz-overlay';
    Object.assign(this.canvas.style, { position:'absolute', inset:'0', pointerEvents:'none', zIndex:5 });
    this.host.classList.add('avviz-host'); if (getComputedStyle(this.host).position === 'static') this.host.style.position = 'relative';
    this.host.appendChild(this.canvas); this.ctx2d = this.canvas.getContext('2d'); this.resize();
  }
  resize(){ const dpr = window.devicePixelRatio || 1; const r = this.host.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width * dpr)), h = Math.max(1, Math.floor(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; this.ctx2d.setTransform(dpr,0,0,dpr,0,0); } }
  draw(){ this.ana.getByteTimeDomainData(this.buf); const r=this.host.getBoundingClientRect(); const w=r.width, h=r.height; const ctx=this.ctx2d; ctx.clearRect(0,0,w,h);
    const pad=Math.max(6,Math.floor(w*0.03)), barH=Math.max(24,Math.min(64,Math.floor(h*0.26))); const x=pad,y=h-barH-pad,rw=w-pad*2,rh=barH; const radius=Math.min(14,rh/2);
    let sum=0; for (let i=0;i<this.buf.length;i++){ const v=(this.buf[i]-128)/128; sum+=v*v; } const rms=Math.sqrt(sum/this.buf.length); if (rms>0.06) this._decay=8; const glow=(this._decay=Math.max(0,(this._decay||0)-1))>0;
    ctx.save(); ctx.globalAlpha=0.85; roundRect(ctx,x,y,rw,rh,radius); ctx.fillStyle='rgba(42,47,69,0.75)'; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle=glow?'#22d3ee':'#532a75'; ctx.shadowColor=glow?'rgba(34,211,238,0.25)':'transparent'; ctx.shadowBlur=glow?10:0; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.beginPath(); const innerPad=8, iw=rw-innerPad*2, ih=rh-innerPad*2, step=iw/this.buf.length;
    for (let i=0;i<this.buf.length;i++){ const xx=x+innerPad+i*step; const yy=y+innerPad+ih/2+((this.buf[i]-128)/128)*(ih*0.42); i===0?ctx.moveTo(xx,yy):ctx.lineTo(xx,yy); }
    ctx.lineWidth=2.6; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle='#2dd4ff'; ctx.stroke(); ctx.restore(); }
  destroy(){ try{this.src.disconnect();}catch{} try{this.ana.disconnect();}catch{} this.canvas?.remove(); this.host?.classList.remove('avviz-host'); }
}
function roundRect(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

class OverlayManager {
  constructor(){ this.enabled=false; this.map=new Map(); }
  async start(){ if (this.enabled) return; this.enabled=true; this.ac ||= new (window.AudioContext||window.webkitAudioContext)(); try{await this.ac.resume();}catch{} this._observe(); this._sync(); this._loop(); }
  stop(){ this.enabled=false; cancelAnimationFrame(this._raf); this._mo?.disconnect(); for (const v of this.map.values()) v.destroy(); this.map.clear(); }
  toggle(){ this.enabled ? this.stop() : this.start(); }

  _observe(){ this._mo?.disconnect(); this._mo=new MutationObserver(()=>this._sync()); this._mo.observe(document.body,{subtree:true,childList:true}); window.addEventListener('resize',()=>{ for(const v of this.map.values()) v.resize(); }); }

  _containerForUser(userId){
    const view = (game.webrtc && game.webrtc.view) || (ui.webrtc && ui.webrtc.view) || ui.webrtc;
    let el = view?.getUserCameraView?.(userId) || document.querySelector(`.camera-view[data-user-id="${userId}"]`);
    // Do not attach inside our own visualizer window
    if (el?.closest?.('.avviz-window')) el = null;
    return el;
  }

  _findUserHostEls(){
    const map = new Map();
    for (const u of game.users) {
      const el = this._containerForUser(u.id);
      if (el) map.set(u.id, el);
    }
    return map;
  }

  _sync(){
    if(!this.enabled) return;
    const av = game.webrtc?.client; if(!av) return;
    const connected = new Set(av?.getConnectedUsers?.() ?? []);
    const hosts = this._findUserHostEls();
    const seen = new Set();
    for (const [uid, el] of hosts.entries()) {
      if (!connected.has(uid) || el.closest('.avviz-window')) continue;
      seen.add(uid);
      if (!this.map.has(uid)) {
        const stream = av.getLevelsStreamForUser(uid) || av.getMediaStreamForUser(uid);
        if (!stream) continue;
        const viz = new OverlayVisualizer({ userId: uid, hostEl: el, stream, audioContext: this.ac });
        this.map.set(uid, viz);
      } else {
        const viz = this.map.get(uid);
        if (viz.host !== el) {
          viz.destroy();
          const stream = av.getLevelsStreamForUser(uid) || av.getMediaStreamForUser(uid);
          const nv = new OverlayVisualizer({ userId: uid, hostEl: el, stream, audioContext: this.ac });
          this.map.set(uid, nv);
        } else {
          viz.resize();
        }
      }
    }
    for (const [uid, viz] of Array.from(this.map.entries())) {
      if (!seen.has(uid)) { viz.destroy(); this.map.delete(uid); }
    }
  }

  _loop(){ if(!this.enabled) return; for (const v of this.map.values()) v.draw(); this._raf = requestAnimationFrame(()=>this._loop()); }
}

export const Overlay = new OverlayManager();
