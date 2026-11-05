// 모든 소리는 브라우저에서 합성합니다. 외부 음원이나 API가 필요하지 않습니다.
export class GardenAudio {
  constructor() { this.enabled = false; this.step = 0; this.timer = null; }
  async start() {
    this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume(); this.enabled = true;
    this.timer ??= setInterval(() => this.music(), 430);
  }
  note(freq, duration = .6, volume = .035, type = 'sine', delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const time = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(volume, time + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(gain).connect(this.ctx.destination); osc.start(time); osc.stop(time + duration);
  }
  music() {
    const melody = [523.25,659.25,783.99,659.25,587.33,0,523.25,0,440,523.25,659.25,783.99,698.46,659.25,587.33,0,523.25,783.99,880,783.99,659.25,587.33,523.25,0,440,523.25,587.33,659.25,587.33,0,523.25,0];
    const i = this.step++ % melody.length;
    if (melody[i]) { this.note(melody[i], 1.1, .018); this.note(melody[i]*2, .35, .003); }
    if (i % 4 === 0) this.note([130.81,174.61,164.81,196][Math.floor(i/8)], 1.7, .018);
  }
  effect(kind) {
    const sets = { click:[660,880], gift:[523,659,784,1047], blow:[400,300,200], firework:[110,82,55], birthday:[523,659,784,1047,880,784,659,784,1047,1319,1175,1047] };
    (sets[kind] || sets.click).forEach((f,i)=>this.note(f,kind==='firework'?.8:.5,.035,'sine',i*.12));
  }
  async toggle() { if (!this.ctx) await this.start(); else { this.enabled=!this.enabled; if(this.enabled) await this.ctx.resume(); } return this.enabled; }
}
