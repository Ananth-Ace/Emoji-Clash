// ════════════════════════════════════════════════════════════════════════
//  AudioManager — Web Audio API  (no external files needed)
// ════════════════════════════════════════════════════════════════════════
const AudioManager = {
  _ctx:           null,
  _master:        null,
  _muted:         false,
  _musicPlaying:  false,
  _musicTimer:    null,
  _melodyIdx:     0,
  _bassIdx:       0,
  _melNextTime:   0,
  _bassNextTime:  0,

  // ── Init (lazy, requires user gesture first) ─────────────────────────
  init() {
    if (this._ctx) {
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return;
    }
    this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
    this._master = this._ctx.createGain();
    this._master.gain.value = 0.55;
    this._master.connect(this._ctx.destination);
  },

  // ── Low-level tone ────────────────────────────────────────────────────
  _tone(freq, startAt, dur, type = 'sine', vol = 0.3, atk = 0.01, rel = 0.1) {
    if (!this._ctx || this._muted) return;
    const osc  = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain);
    gain.connect(this._master);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(vol, startAt + atk);
    gain.gain.setValueAtTime(vol, startAt + dur - rel);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.02);
  },

  _noise(startAt, dur, vol = 0.4, maxFreq = 1200) {
    if (!this._ctx || this._muted) return;
    const size = Math.floor(this._ctx.sampleRate * dur);
    const buf  = this._ctx.createBuffer(1, size, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src  = this._ctx.createBufferSource();
    const filt = this._ctx.createBiquadFilter();
    const gain = this._ctx.createGain();
    filt.type = 'lowpass';
    filt.frequency.value = maxFreq;
    src.buffer = buf;
    src.connect(filt); filt.connect(gain); gain.connect(this._master);
    gain.gain.setValueAtTime(vol, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    src.start(startAt);
    src.stop(startAt + dur + 0.01);
  },

  // ════════════════════════════════════════════════════════════════════
  //  SFX
  // ════════════════════════════════════════════════════════════════════
  playDeploy() {
    this.init();
    const t = this._ctx.currentTime;
    this._tone(280, t,        0.07, 'triangle', 0.22, 0.005, 0.05);
    this._tone(560, t + 0.05, 0.09, 'triangle', 0.18, 0.005, 0.07);
  },

  playHit() {
    this.init();
    this._noise(this._ctx.currentTime, 0.06, 0.35, 900);
  },

  playExplosion() {
    this.init();
    const t = this._ctx.currentTime;
    this._noise(t, 0.30, 0.7, 400);
    this._tone(80, t, 0.25, 'sine', 0.3, 0.005, 0.2);
  },

  playVictory() {
    this.init();
    const t = this._ctx.currentTime;
    [262, 330, 392, 523, 659].forEach((f, i) => {
      this._tone(f, t + i * 0.13, 0.22, 'triangle', 0.28, 0.01, 0.10);
    });
    [523, 659, 784].forEach(f => this._tone(f, t + 0.75, 0.7, 'sine', 0.18, 0.02, 0.45));
  },

  playDefeat() {
    this.init();
    const t = this._ctx.currentTime;
    [392, 349, 294, 220].forEach((f, i) => {
      this._tone(f, t + i * 0.22, 0.38, 'sine', 0.26, 0.02, 0.22);
    });
  },

  playCoin() {
    this.init();
    const t = this._ctx.currentTime;
    this._tone(523, t,        0.07, 'triangle', 0.22, 0.005, 0.04);
    this._tone(784, t + 0.07, 0.10, 'triangle', 0.22, 0.005, 0.07);
  },

  playClick() {
    this.init();
    this._tone(500, this._ctx.currentTime, 0.04, 'sine', 0.12, 0.002, 0.03);
  },

  playLevelUp() {
    this.init();
    const t = this._ctx.currentTime;
    [330, 415, 523, 622, 784].forEach((f, i) => {
      this._tone(f, t + i * 0.10, 0.18, 'triangle', 0.25, 0.008, 0.08);
    });
  },

  // ════════════════════════════════════════════════════════════════════
  //  BACKGROUND MUSIC  (8-bit style looping battle theme)
  // ════════════════════════════════════════════════════════════════════
  _TEMPO: 130,  // BPM

  // Pentatonic major: C D E G A
  _melody: [
    [330,0.5],[392,0.5],[440,1.0],[392,0.5],[330,0.5],
    [294,0.5],[330,1.0],[0,  0.5],[0,  0.5],
    [262,0.5],[330,0.5],[392,1.0],[440,0.5],[392,0.5],
    [330,1.5],[294,0.5],
    [392,0.5],[440,0.5],[523,1.0],[440,0.5],[392,0.5],
    [330,0.5],[392,1.0],[0,  0.5],[0,  0.5],
    [262,0.5],[330,0.5],[392,0.5],[440,0.5],[523,1.0],
    [440,1.0],[392,1.0]
  ],

  _bass: [
    [131,2],[98, 2],
    [131,2],[110,2],
    [131,2],[98, 2],
    [87, 2],[98, 2]
  ],

  startMusic() {
    if (this._musicPlaying) return;
    this.init();
    this._musicPlaying = true;
    const now          = this._ctx.currentTime;
    this._melNextTime  = now + 0.05;
    this._bassNextTime = now + 0.05;
    this._melodyIdx    = 0;
    this._bassIdx      = 0;
    this._schedulerTick();
  },

  _schedulerTick() {
    if (!this._musicPlaying) return;
    const LOOKAHEAD = 0.25;
    const beatLen   = 60 / this._TEMPO;
    const now       = this._ctx.currentTime;

    while (this._melNextTime < now + LOOKAHEAD) {
      const [freq, beats] = this._melody[this._melodyIdx % this._melody.length];
      const dur = beats * beatLen;
      if (freq > 0) this._tone(freq, this._melNextTime, dur * 0.82, 'triangle', 0.10, 0.01, dur * 0.25);
      this._melNextTime += dur;
      this._melodyIdx++;
    }

    while (this._bassNextTime < now + LOOKAHEAD) {
      const [freq, beats] = this._bass[this._bassIdx % this._bass.length];
      const dur = beats * beatLen;
      this._tone(freq,     this._bassNextTime, dur * 0.65, 'sawtooth', 0.07, 0.02, dur * 0.20);
      this._tone(freq * 2, this._bassNextTime, dur * 0.65, 'triangle', 0.04, 0.02, dur * 0.20);
      this._bassNextTime += dur;
      this._bassIdx++;
    }

    this._musicTimer = setTimeout(() => this._schedulerTick(), 80);
  },

  stopMusic() {
    this._musicPlaying = false;
    if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; }
  },

  toggleMute() {
    this._muted = !this._muted;
    if (this._master) this._master.gain.value = this._muted ? 0 : 0.55;
    return this._muted;
  },

  isMuted() { return this._muted; }
};
