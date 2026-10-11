/**
 * Moto GP Pro - AAA Procedural Audio Synthesizer
 * High-Fidelity Synthesized Audio Engine:
 * - Real-time Twin-Cylinder 4-Stroke Crossplane Engine Synthesizer (RPM & Gear tracking)
 * - Aerodynamic High-Speed Wind Rush generator
 * - Turbo Compressor Whistle on Nitro Boost
 * - Passing Traffic Doppler Shift Whoosh
 * - Apple Haptic UI Feedback Chimes & Synthwave Soundtrack
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.musicPlaying = false;
    this.musicInterval = null;

    // Master & Bus Nodes
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.engineGain = null;
    this.windGain = null;

    // Dynamic Engine Synthesizer Nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.turboOsc = null;
    this.turboGain = null;
    this.windNoise = null;
    this.windFilter = null;
    this.isEngineRunning = false;

    this.beatStep = 0;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master output node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Music Bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Engine Bus
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.32, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      // Wind Bus
      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.windGain.connect(this.masterGain);

      this.setupEngineSynth();
      console.log('🔊 High-Fidelity Audio Synthesizer Initialized');
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // =========================================================================
  // 1. DYNAMIC MOTORCYCLE ENGINE & WIND SYNTHESIS
  // =========================================================================

  setupEngineSynth() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Dual crossplane oscillators for rich mechanical motorcycle timbre
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    this.engineOsc1.frequency.setValueAtTime(55, t);
    this.engineOsc2.frequency.setValueAtTime(110, t);

    // Dynamic Lowpass Resonance Filter
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(320, t);
    this.engineFilter.Q.setValueAtTime(2.5, t);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);

    this.engineOsc1.start(t);
    this.engineOsc2.start(t);

    // 2. Turbo Spool-Up Whistle Generator
    this.turboOsc = this.ctx.createOscillator();
    this.turboGain = this.ctx.createGain();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.setValueAtTime(1200, t);
    this.turboGain.gain.setValueAtTime(0.0, t);
    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.engineGain);
    this.turboOsc.start(t);

    // 3. High-Speed Aerodynamic Wind Generator
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.windNoise = this.ctx.createBufferSource();
    this.windNoise.buffer = noiseBuffer;
    this.windNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(450, t);
    this.windFilter.Q.setValueAtTime(1.2, t);

    this.windNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windNoise.start(t);

    this.isEngineRunning = true;
  }

  updateEngine(rpm, speedKmh, isBraking, isBoosting) {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Map RPM (2,500 to 14,500) to fundamental frequency (42Hz - 210Hz)
    const baseFreq = 40 + (rpm / 14500) * 165;
    const filterFreq = 220 + (rpm / 14500) * 1600;

    if (this.engineOsc1 && this.engineOsc2) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, t, 0.05);
    }
    if (this.engineFilter) {
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.05);
    }

    // Turbo boost spool
    if (this.turboGain && this.turboOsc) {
      if (isBoosting) {
        this.turboGain.gain.setTargetAtTime(0.18, t, 0.1);
        this.turboOsc.frequency.setTargetAtTime(2400 + (rpm / 14500) * 1800, t, 0.1);
      } else {
        this.turboGain.gain.setTargetAtTime(0.0, t, 0.2);
      }
    }

    // Aerodynamic wind volume tracks KM/H
    if (this.windGain && this.windFilter) {
      const windVol = Math.min(0.35, (speedKmh / 280) * 0.35);
      this.windGain.gain.setTargetAtTime(windVol, t, 0.1);
      this.windFilter.frequency.setTargetAtTime(300 + (speedKmh / 280) * 800, t, 0.1);
    }
  }

  // =========================================================================
  // 2. SOUND EFFECTS & APPLE HAPTIC CHIMES
  // =========================================================================

  playLaneSwitch(direction = 'right') {
    if (!this.sfxEnabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'sine';
    const startFreq = direction === 'right' ? 360 : 480;
    const endFreq = direction === 'right' ? 560 : 280;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.12);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    if (pan) {
      pan.pan.setValueAtTime(direction === 'right' ? 0.45 : -0.45, t);
      osc.connect(gain);
      gain.connect(pan);
      pan.connect(this.sfxGain);
    } else {
      osc.connect(gain);
      gain.connect(this.sfxGain);
    }

    osc.start(t);
    osc.stop(t + 0.13);
  }

  playPassByDoppler() {
    if (!this.sfxEnabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.28);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(250, t + 0.28);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.29);
  }

  playJump() { this.playBoost(); }
  playSlide() {
    if (!this.sfxEnabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(320, t + 0.18);
    filter.Q.setValueAtTime(3.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.18);
  }

  playCoin(combo = 1) {
    if (!this.sfxEnabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const pitchIndex = Math.min(combo - 1, scale.length - 1);
    const baseFreq = scale[pitchIndex] || 523.25;

    [baseFreq, baseFreq * 2.01].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.24 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  playBoost() {
    if (!this.sfxEnabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.45);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.48);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.48);
  }

  playShield() {
    if (!this.sfxEnabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.14);
    osc.frequency.linearRampToValueAtTime(1180, t + 0.28);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.32);
  }

  playHit() {
    if (!this.sfxEnabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.32);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  playUiClick() {
    if (!this.sfxEnabled || !this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.04);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // =========================================================================
  // 3. BACKGROUND SYNTHWAVE SOUNDTRACK
  // =========================================================================

  startMusic() {
    if (!this.musicEnabled || this.musicPlaying) return;
    this.init();
    this.resume();
    this.musicPlaying = true;
    this.beatStep = 0;

    const stepDuration = 125; // 120 BPM sixteenth notes
    const bassNotes = [110, 110, 130.81, 110, 146.83, 110, 130.81, 98];
    const arpNotes = [220, 261.63, 329.63, 392.0, 440, 523.25, 659.25, 783.99];

    this.musicInterval = setInterval(() => {
      if (!this.musicEnabled || !this.musicPlaying || !this.ctx) return;
      const t = this.ctx.currentTime;
      const step = this.beatStep % 16;

      // Kick drum
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.08);

        kickGain.gain.setValueAtTime(0.45, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.1);
      }

      // Snare on 4, 12
      if (step === 4 || step === 12) {
        const snareOsc = this.ctx.createOscillator();
        const snareGain = this.ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(190, t);
        snareGain.gain.setValueAtTime(0.18, t);
        snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

        snareOsc.connect(snareGain);
        snareGain.connect(this.musicGain);
        snareOsc.start(t);
        snareOsc.stop(t + 0.08);
      }

      // Synth Bassline
      if (step % 2 === 0) {
        const noteIdx = (step / 2) % bassNotes.length;
        const bFreq = bassNotes[noteIdx];

        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        const bFilter = this.ctx.createBiquadFilter();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bFreq, t);

        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(450, t);
        bFilter.frequency.exponentialRampToValueAtTime(120, t + 0.15);

        bassGain.gain.setValueAtTime(0.24, t);
        bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

        bassOsc.connect(bFilter);
        bFilter.connect(bassGain);
        bassGain.connect(this.musicGain);

        bassOsc.start(t);
        bassOsc.stop(t + 0.18);
      }

      // Arpeggiator sparkle
      const arpFreq = arpNotes[step % arpNotes.length];
      const aOsc = this.ctx.createOscillator();
      const aGain = this.ctx.createGain();

      aOsc.type = 'sine';
      aOsc.frequency.setValueAtTime(arpFreq, t);

      aGain.gain.setValueAtTime(0.065, t);
      aGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      aOsc.connect(aGain);
      aGain.connect(this.musicGain);

      aOsc.start(t);
      aOsc.stop(t + 0.1);

      this.beatStep++;
    }, stepDuration);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.musicEnabled;
  }

  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(this.sfxEnabled ? 0.32 : 0, this.ctx.currentTime);
    }
    if (this.windGain && this.ctx) {
      this.windGain.gain.setValueAtTime(this.sfxEnabled ? 0.2 : 0, this.ctx.currentTime);
    }
    return this.sfxEnabled;
  }

  setMusicVolume(vol) {
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(Math.max(0, Math.min(1, parseFloat(vol))) * 0.45, this.ctx.currentTime);
    }
  }

  setSfxVolume(vol) {
    const v = Math.max(0, Math.min(1, parseFloat(vol)));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(v * 0.75, this.ctx.currentTime);
    }
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(v * 0.35, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

// Global singleton instance
window.soundEngine = new SoundEngine();
