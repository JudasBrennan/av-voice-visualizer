export class VisualTile {
  constructor({ userId, mediaStream, canvas, audioContext }) {
    this.uid = userId; this.canvas = canvas; this.ctx2d = canvas.getContext('2d');
    this.ac = audioContext; this.src = this.ac.createMediaStreamSource(mediaStream);
    this.ana = this.ac.createAnalyser(); this.ana.fftSize = 1024; this.ana.smoothingTimeConstant = 0.85;
    this.src.connect(this.ana); this.buf = new Uint8Array(this.ana.fftSize); this.speakingDecay = 0; this.resize();
  }
  resize(){ const dpr = window.devicePixelRatio || 1; const r=this.canvas.getBoundingClientRect(); const w=Math.max(1,Math.floor(r.width*dpr)), h=Math.max(1,Math.floor(r.height*dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){ this.canvas.width=w; this.canvas.height=h; this.ctx2d.setTransform(dpr,0,0,dpr,0,0); } }
  draw(){ this.ana.getByteTimeDomainData(this.buf); const w=this.canvas.clientWidth, h=this.canvas.clientHeight; const ctx=this.ctx2d; ctx.clearRect(0,0,w,h);
    let sum=0; for(let i=0;i<this.buf.length;i++){ const v=(this.buf[i]-128)/128; sum+=v*v; } const rms=Math.sqrt(sum/this.buf.length); if(rms>0.06) this.speakingDecay=8;
    this.canvas.parentElement?.classList.toggle('is-speaking', this.speakingDecay-- > 0);
    ctx.lineWidth=2.8; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle='#2dd4ff'; ctx.beginPath(); const step=w/this.buf.length;
    for(let i=0;i<this.buf.length;i++){ const x=i*step; const y=h/2+((this.buf[i]-128)/128)*(h*0.42); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); } ctx.stroke();
  }
  destroy(){ try{ this.src.disconnect(); }catch{} try{ this.ana.disconnect(); }catch{} }
}
