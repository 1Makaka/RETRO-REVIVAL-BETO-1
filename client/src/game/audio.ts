/**
 * Frantic Battles - Retro Chiptune & Sound Effects Engine (Web Audio API)
 * Plays authentic 8-bit retro fantasy music and combat sound effects
 */

export type MusicTrackId = 
  | 'Wiklund' | 'Neowave' | 'VoidOverlord' | 'ShadowRealm' | 'BloodMoon'
  | 'bgm_rune_wanderers' | 'bgm_sunset_citadel' | 'bgm_midnight_wyrm'
  | 'bgm_crimson_eclipse' | 'bgm_gilded_sentinel' | 'bgm_void_sovereign'
  | 'bgm_crypt_butcher' | 'bgm_chaos_overlord' | 'bgm_brave_cat';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentTrack: MusicTrackId = 'bgm_rune_wanderers';
  private dungeonMusicState: 'ambient' | 'combat' | 'boss' = 'ambient';
  private isMusicPlaying = false;
  private musicTimer: number | null = null;
  private musicEnabled = true;
  private sfxEnabled = true;
  private step = 0;
  private loopCount = 0;

  constructor() {
    // Check saved preferences
    const savedMVol = localStorage.getItem('fb_music_enabled');
    const savedSVol = localStorage.getItem('fb_sfx_enabled');
    const savedTrack = (localStorage.getItem('selected_bgm') || localStorage.getItem('fb_selected_track')) as MusicTrackId;

    if (savedMVol !== null) this.musicEnabled = savedMVol === 'true';
    if (savedSVol !== null) this.sfxEnabled = savedSVol === 'true';

    const validTracks: MusicTrackId[] = [
      'Wiklund', 'Neowave', 'VoidOverlord', 'ShadowRealm', 'BloodMoon',
      'bgm_rune_wanderers', 'bgm_sunset_citadel', 'bgm_midnight_wyrm',
      'bgm_crimson_eclipse', 'bgm_gilded_sentinel', 'bgm_void_sovereign',
      'bgm_crypt_butcher', 'bgm_chaos_overlord', 'bgm_brave_cat'
    ];
    if (validTracks.includes(savedTrack)) {
      this.currentTrack = savedTrack;
    } else {
      this.currentTrack = 'bgm_rune_wanderers';
    }
  }

  private initCtx() {
    try {
      if (this.ctx && this.ctx.state === 'closed') {
        this.ctx = null;
      }
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const rawCtx = new AudioCtx();
        
        // Safety intercept to prevent 'Cannot suspend/resume a closed AudioContext' errors
        const originalSuspend = rawCtx.suspend;
        rawCtx.suspend = function(this: AudioContext) {
          if (this.state === 'closed') return Promise.resolve();
          return originalSuspend.apply(this);
        };
        const originalResume = rawCtx.resume;
        rawCtx.resume = function(this: AudioContext) {
          if (this.state === 'closed') return Promise.resolve();
          return originalResume.apply(this);
        };

        this.ctx = rawCtx;
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.musicEnabled ? 0.35 : 0;
        this.musicGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxEnabled ? 0.45 : 0;
        this.sfxGain.connect(this.ctx.destination);
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (err) {
      console.warn('Failed to initialize AudioContext safely:', err);
    }
  }

  public getSelectedTrack(): MusicTrackId {
    return this.currentTrack || 'Wiklund';
  }

  public isMusicOn(): boolean {
    return this.musicEnabled;
  }

  public isSfxOn(): boolean {
    return this.sfxEnabled;
  }

  public toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    localStorage.setItem('fb_music_enabled', String(this.musicEnabled));
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicEnabled ? 0.35 : 0;
    }
    if (this.musicEnabled && !this.isMusicPlaying) {
      this.startMusic();
    } else if (!this.musicEnabled && this.isMusicPlaying) {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  public toggleSfx(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    localStorage.setItem('fb_sfx_enabled', String(this.sfxEnabled));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxEnabled ? 0.45 : 0;
    }
    if (this.sfxEnabled) {
      this.playClick();
    }
    return this.sfxEnabled;
  }

  public setMuteAll(mute: boolean) {
    this.musicEnabled = !mute;
    this.sfxEnabled = !mute;
    localStorage.setItem('fb_music_enabled', String(this.musicEnabled));
    localStorage.setItem('fb_sfx_enabled', String(this.sfxEnabled));
    if (this.musicGain) this.musicGain.gain.value = this.musicEnabled ? 0.35 : 0;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxEnabled ? 0.45 : 0;
    if (mute) this.stopMusic();
    else this.startMusic();
  }

  public selectTrack(track: MusicTrackId) {
    const oldTrack = this.currentTrack;
    this.currentTrack = track;
    localStorage.setItem('fb_selected_track', track);
    localStorage.setItem('selected_bgm', track);

    if (this.isMusicPlaying && this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      // Fade out
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0, now + 0.4);

      setTimeout(() => {
        if (this.isMusicPlaying) {
          this.stopMusic();
          this.step = 0;
          this.startMusic();
          if (this.musicGain && this.ctx && this.musicEnabled) {
            const now2 = this.ctx.currentTime;
            this.musicGain.gain.setValueAtTime(0, now2);
            this.musicGain.gain.linearRampToValueAtTime(0.35, now2 + 0.4);
          }
        }
      }, 400);
    } else if (this.musicEnabled) {
      this.startMusic();
      if (this.musicGain && this.ctx) {
        const now2 = this.ctx.currentTime;
        this.musicGain.gain.setValueAtTime(0, now2);
        this.musicGain.gain.linearRampToValueAtTime(0.35, now2 + 0.4);
      }
    }
  }

  public setDungeonMusicState(state: 'ambient' | 'combat' | 'boss') {
    const changed = this.dungeonMusicState !== state;
    this.dungeonMusicState = state;
    if (changed && this.isMusicPlaying) {
      this.stopMusic();
      this.startMusic();
    } else if (state === 'ambient' && !this.isMusicPlaying && this.musicEnabled) {
      this.startMusic();
    }
  }

  public startMusic() {
    this.initCtx();
    if (!this.musicEnabled) return;
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.step = 0;
    this.scheduleNextChiptuneNotes();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleNextChiptuneNotes() {
    if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    // Determine active playback mode
    let effectiveTrack: MusicTrackId = this.currentTrack;
    if (this.dungeonMusicState === 'boss') {
      effectiveTrack = 'bgm_crypt_butcher';
    } else if (this.dungeonMusicState === 'combat') {
      effectiveTrack = 'bgm_crimson_eclipse';
    }

    let tempo = 144;
    if (effectiveTrack === 'Wiklund' || effectiveTrack === 'bgm_brave_cat') tempo = 132;
    else if (effectiveTrack === 'VoidOverlord' || effectiveTrack === 'bgm_void_sovereign') tempo = 120;
    else if (effectiveTrack === 'BloodMoon' || effectiveTrack === 'bgm_crypt_butcher') tempo = 138;
    else if (effectiveTrack === 'ShadowRealm' || effectiveTrack === 'bgm_midnight_wyrm') tempo = 90;
    else if (effectiveTrack === 'Neowave' || effectiveTrack === 'bgm_chaos_overlord') tempo = 144;
    else if (effectiveTrack === 'bgm_rune_wanderers') tempo = 110;
    else if (effectiveTrack === 'bgm_sunset_citadel') tempo = 84;
    else if (effectiveTrack === 'bgm_crimson_eclipse') tempo = 150;
    else if (effectiveTrack === 'bgm_gilded_sentinel') tempo = 115;

    const beatDuration = 60 / tempo;
    const stepDuration = beatDuration / 2; // 16th notes

    if (effectiveTrack === 'bgm_rune_wanderers') {
      this.playRuneWanderersStep(now, this.step);
    } else if (effectiveTrack === 'bgm_sunset_citadel') {
      this.playSunsetCitadelStep(now, this.step);
    } else if (effectiveTrack === 'bgm_midnight_wyrm' || effectiveTrack === 'ShadowRealm') {
      this.playMidnightWyrmStep(now, this.step);
    } else if (effectiveTrack === 'bgm_crimson_eclipse') {
      this.playCrimsonEclipseStep(now, this.step);
    } else if (effectiveTrack === 'bgm_gilded_sentinel') {
      this.playGildedSentinelStep(now, this.step);
    } else if (effectiveTrack === 'bgm_void_sovereign' || effectiveTrack === 'VoidOverlord') {
      this.playVoidSovereignStep(now, this.step);
    } else if (effectiveTrack === 'bgm_crypt_butcher' || effectiveTrack === 'BloodMoon') {
      this.playCryptButcherStep(now, this.step);
    } else if (effectiveTrack === 'bgm_chaos_overlord' || effectiveTrack === 'Neowave') {
      this.playChaosOverlordStep(now, this.step);
    } else {
      this.playBraveCatStep(now, this.step);
    }

    this.step = (this.step + 1) % 64;
    this.musicTimer = window.setTimeout(() => {
      this.scheduleNextChiptuneNotes();
    }, stepDuration * 1000);
  }

  // Track 1: "Wiklund" - Glorious, Heroic & Melodic Retro Fantasy Adventure (Sweet warm chords, heroic melody, rich harmony)
  private playWiklundStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;

    // Rich Pentatonic & Diatonic scale in D Major (Warm, heroic, cheerful RPG vibes)
    const scale = [
      293.66, 329.63, 369.99, 440.00, 493.88, 554.37, 587.33, 659.25, 739.99, 880.00, 987.77, 1108.73, 1174.66
    ]; // D4, E4, F#4, A4, B4, C#5, D5, E5, F#5, A5, B5, C#6, D6

    // 64-step epic heroic melodic line
    const melody = [
      // Phrase A (Joyful Departure)
      6, -1, 7, 8,  9, -1, 8, 7,  6, -1, 4, -1,  3, 4, 6, -1,
      7, -1, 8, 9,  10, -1, 9, 8,  7, -1, 6, -1,  4, 6, 7, -1,
      // Phrase B (Heroic Ascent)
      8, 9, 10, 12,  10, 9, 8, 7,  9, 8, 7, 6,  4, 6, 7, 8,
      9, -1, 8, -1,  7, 6, 4, 3,  4, 6, 7, 6,  4, 3, 0, -1
    ];

    const noteIdx = melody[step % 64];

    // Main Warm Flute / Pulse Lead
    if (noteIdx >= 0) {
      const freq = scale[noteIdx];
      // Warm pulse wave
      this.playSynthNote(freq, 'triangle', 0.16, now, 0.28, this.musicGain);
      this.playSynthNote(freq, 'square', 0.11, now, 0.12, this.musicGain);

      // Sweet harmony on accents
      if (step % 4 === 0) {
        this.playSynthNote(freq * 0.75, 'sine', 0.14, now, 0.15, this.musicGain);
      }
    }

    // Gentle Sparkle Bell Arpeggio (D -> G -> Bm -> A)
    const arpChords = [
      [293.66, 369.99, 440.00, 587.33], // D maj
      [196.00, 246.94, 293.66, 392.00], // G maj
      [246.94, 293.66, 369.99, 493.88], // B min
      [220.00, 277.18, 329.63, 440.00]  // A maj
    ];
    const curChord = arpChords[Math.floor((step % 32) / 8)];
    const arpNote = curChord[step % 4];
    this.playSynthNote(arpNote * 1.5, 'sine', 0.08, now, 0.09, this.musicGain);

    // Warm, bouncy melodic bass
    const bassRoots = [146.83, 98.00, 123.47, 110.00];
    const bRoot = bassRoots[Math.floor((step % 32) / 8)];
    if (step % 4 === 0 || step % 8 === 6) {
      this.playSynthNote(bRoot, 'triangle', 0.16, now, 0.38, this.musicGain);
    } else if (step % 2 === 0) {
      this.playSynthNote(bRoot * 1.5, 'triangle', 0.10, now, 0.24, this.musicGain);
    }

    // Soft, crisp acoustic-style retro beat (Kick on downbeat, soft brushed snare, gentle shaker)
    if (step % 8 === 0 || step % 16 === 10) {
      this.playSynthNote(80, 'sine', 0.09, now, 0.35, this.musicGain);
    }
    if (step % 8 === 4) {
      this.playNoiseHit(now, 0.08, 0.18, this.musicGain);
    }
    if (step % 2 === 1) {
      this.playNoiseHit(now, 0.02, 0.06, this.musicGain);
    }
  }

  // Track 2: "Neowave" - Rich Synthwave / Castle Theme
  private playNeowaveStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;

    const chords = [
      [220.0, 261.63, 329.63, 440.0], // Am
      [174.61, 220.0, 261.63, 349.23], // F
      [146.83, 220.0, 293.66, 349.23], // Dm
      [164.81, 196.0, 246.94, 329.63], // Em
    ];
    const chordIdx = Math.floor((step % 32) / 8);
    const chord = chords[chordIdx];
    const arpNote = chord[step % 4];

    // Synth Arp Lead
    this.playSynthNote(arpNote * 1.5, 'sawtooth', 0.12, now, 0.18, this.musicGain);

    // Deep Rolling Saw Bass
    if (step % 2 === 0) {
      const bassFreq = (step % 4 === 0) ? chord[0] * 0.5 : chord[0] * 0.75;
      this.playSynthNote(bassFreq, 'sawtooth', 0.18, now, 0.32, this.musicGain);
    }

    // Groove Percussion
    if (step % 8 === 0 || step % 16 === 10) {
      this.playSynthNote(70, 'sine', 0.10, now, 0.38, this.musicGain);
    }
    if (step % 8 === 4) {
      this.playNoiseHit(now, 0.11, 0.26, this.musicGain);
    }
  }

  // Track 3: "VoidOverlord" - High-Octane Fast Action Battle Techno
  private playVoidOverlordStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;

    const actionScale = [293.66, 349.23, 440.0, 523.25, 587.33, 698.46, 880.0]; // D4, F4, A4, C5, D5, F5, A5
    const actionPattern = [
      0, 2, 4, 3,  2, 4, 6, 5,  4, 2, 0, 2,  3, 4, 5, 6,
      6, 5, 4, 3,  2, 1, 0, 2,  4, 6, 5, 4,  3, 2, 1, 0
    ];

    const noteIdx = actionPattern[step % 32];
    const freq = actionScale[noteIdx];
    this.playSynthNote(freq, 'sawtooth', 0.09, now, 0.28, this.musicGain);

    // Fast Driving Sub-Bass line
    const bassFreqs = [73.42, 73.42, 87.31, 110.0];
    const bassIdx = Math.floor((step % 32) / 8);
    if (step % 2 === 0) {
      this.playSynthNote(bassFreqs[bassIdx], 'square', 0.12, now, 0.40, this.musicGain);
    }

    // Heavy Double Kick & Snare
    if (step % 4 === 0 || step % 8 === 2) {
      this.playSynthNote(95, 'sine', 0.09, now, 0.48, this.musicGain);
    }
    if (step % 8 === 4) {
      this.playNoiseHit(now, 0.12, 0.32, this.musicGain);
    }
  }

  // Track 4: "ShadowRealm" - Dark Fantasy Dungeon Atmospheric Chiptune
  private playShadowRealmStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;

    const shadowScale = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    const shadowMelody = [0, 2, 3, 5, 4, 3, 2, 1, 0, 3, 5, 7, 6, 5, 3, 2];

    if (step % 2 === 0) {
      const idx = shadowMelody[Math.floor((step % 32) / 2)];
      this.playSynthNote(shadowScale[idx], 'sawtooth', 0.18, now, 0.38, this.musicGain);
    }

    // Melodic High Arp Pluck
    if (step % 4 === 1) {
      const highFreq = shadowScale[(step % 8)];
      this.playSynthNote(highFreq * 1.5, 'square', 0.12, now, 0.25, this.musicGain);
    }

    // Heavy Driving Dark Dungeon Bass
    if (step % 2 === 0) {
      const bassNotes = [55.0, 55.0, 43.65, 49.0];
      const bIdx = Math.floor((step % 32) / 8);
      this.playSynthNote(bassNotes[bIdx], 'square', 0.20, now, 0.45, this.musicGain);
    }

    if (step % 4 === 0) {
      this.playSynthNote(85, 'sine', 0.09, now, 0.42, this.musicGain);
    }
    if (step % 8 === 4) {
      this.playNoiseHit(now, 0.12, 0.28, this.musicGain);
    }
  }

  // Track 5: "BloodMoon" - Epic Boss Fight Adrenaline Chiptune (168 BPM)
  private playBloodMoonStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;

    // Dramatic Crimson Minor Run (E Minor / Harmonic Minor)
    const bossScale = [329.63, 369.99, 392.00, 440.00, 493.88, 523.25, 622.25, 659.25]; // E4 to E5 Harmonic
    const bossPattern = [
      0, 2, 4, 7,  6, 4, 2, 0,  1, 3, 5, 7,  6, 4, 3, 1,
      4, 7, 6, 4,  7, 6, 4, 2,  6, 5, 4, 3,  2, 1, 0, 7
    ];

    const bIdx = bossPattern[step % 32];
    const freq = bossScale[bIdx];
    this.playSynthNote(freq, 'sawtooth', 0.10, now, 0.35, this.musicGain);
    this.playSynthNote(freq * 0.5, 'square', 0.08, now, 0.25, this.musicGain);

    // Rapid 16th Machine Gun Bass (E2 / C2 / B1)
    const bassNotes = [82.41, 65.41, 61.74, 82.41];
    const curBass = bassNotes[Math.floor((step % 32) / 8)];
    this.playSynthNote(curBass, 'square', 0.09, now, 0.50, this.musicGain);

    // Explosive Double Bass Beats & Hard Snares
    if (step % 4 === 0 || step % 8 === 2 || step % 8 === 6) {
      this.playSynthNote(110, 'sine', 0.08, now, 0.55, this.musicGain); // Heavy Kick
    }
    if (step % 8 === 4 || step % 16 === 14) {
      this.playNoiseHit(now, 0.14, 0.40, this.musicGain); // Hard Snare
    }
    if (step % 2 === 1) {
      this.playNoiseHit(now, 0.04, 0.14, this.musicGain); // Rapid Hi-Hat
    }
  }

  private playSynthNote(
    freq: number,
    type: OscillatorType,
    duration: number,
    startTime: number,
    gainVal: number,
    dest: GainNode
  ) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {
      // Audio node cleanup safeguard
    }
  }

  private playNoiseHit(startTime: number, duration: number, gainVal: number, dest: GainNode, filterType: BiquadFilterType = 'highpass', filterFreq = 1000) {
    if (!this.ctx) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterFreq;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      whiteNoise.start(startTime);
      whiteNoise.stop(startTime + duration);
    } catch {
      // Audio safety
    }
  }

  private playPitchSweep(
    startFreq: number,
    endFreq: number,
    type: OscillatorType,
    duration: number,
    startTime: number,
    gainVal: number,
    dest: GainNode
  ) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), startTime + duration);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {
      // Audio node cleanup safeguard
    }
  }

  // --- Sound Effects (SFX) ---

  public playClick() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playSynthNote(784, 'square', 0.05, now, 0.2, this.sfxGain);
  }

  // 1. SWORD / BLADE ATTACK (Zaza, broadswords, scythes)
  public playSwordSlash() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playPitchSweep(540, 160, 'triangle', 0.09, now, 0.45, this.sfxGain);
    this.playNoiseHit(now, 0.07, 0.25, this.sfxGain, 'bandpass', 2200);
  }

  public playAttack() {
    this.playSwordSlash();
  }

  public playSlash() {
    this.playSwordSlash();
  }

  // 2. KRAUL SHADOW WHIP ATTACK (Unique snapping leather & dark cursed energy)
  public playKraulWhipAttack() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // High-speed supersonic snap
    this.playPitchSweep(1800, 220, 'sawtooth', 0.06, now, 0.45, this.sfxGain);
    this.playNoiseHit(now + 0.01, 0.05, 0.35, this.sfxGain, 'highpass', 3500);
    // Dark ominous resonance
    this.playPitchSweep(120, 45, 'sine', 0.15, now + 0.02, 0.3, this.sfxGain);
  }

  // 3. MAGIC / ARCANE ATTACK (Omen, mystical staves)
  public playMagicArcaneShoot() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Ethereal dual crystal glissando
    this.playPitchSweep(587.33, 987.77, 'sine', 0.12, now, 0.35, this.sfxGain);
    this.playPitchSweep(880.00, 1318.51, 'triangle', 0.10, now + 0.02, 0.25, this.sfxGain);
    this.playNoiseHit(now + 0.01, 0.08, 0.12, this.sfxGain, 'bandpass', 4500);
  }

  // 4. CHEMICAL FLASK LAUNCH (Grim - bubbling fluid pop & glass lob)
  public playFlaskLaunch() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Liquid bubble gulp / pop
    this.playPitchSweep(240, 560, 'sine', 0.07, now, 0.4, this.sfxGain);
    this.playPitchSweep(560, 320, 'sine', 0.08, now + 0.04, 0.35, this.sfxGain);
    this.playNoiseHit(now, 0.05, 0.15, this.sfxGain, 'bandpass', 1400);
  }

  // 5. CROSSBOW / BOW SHOOT (Wooden tension snap & whistling bolt)
  public playCrossbowShoot() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Bowstring snap
    this.playPitchSweep(440, 110, 'triangle', 0.04, now, 0.45, this.sfxGain);
    // Arrow flight whistling "thwip"
    this.playPitchSweep(950, 1250, 'sine', 0.07, now + 0.02, 0.25, this.sfxGain);
    this.playNoiseHit(now, 0.04, 0.2, this.sfxGain, 'highpass', 2800);
  }

  // 6. PISTOL / FIREARM SHOOT (Sharp explosive gunshot pop)
  public playPistolShoot() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playPitchSweep(320, 60, 'square', 0.06, now, 0.5, this.sfxGain);
    this.playNoiseHit(now, 0.08, 0.45, this.sfxGain, 'bandpass', 1800);
  }

  // 7. THUNDER BOLT / HAMMER ATTACK (Bjorn electrical spark)
  public playThunderBolt() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playPitchSweep(750, 90, 'sawtooth', 0.12, now, 0.4, this.sfxGain);
    this.playNoiseHit(now, 0.14, 0.35, this.sfxGain, 'highpass', 1500);
  }

  // 8. SPEAR THRUST (Alrik piercing thrust whoosh)
  public playSpearThrust() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playPitchSweep(480, 240, 'triangle', 0.08, now, 0.45, this.sfxGain);
    this.playNoiseHit(now, 0.06, 0.25, this.sfxGain, 'bandpass', 3000);
  }

  // 9. STONE FISTS ATTACK (Torf heavy stone crush)
  public playStoneFistAttack() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playPitchSweep(110, 40, 'sawtooth', 0.14, now, 0.5, this.sfxGain);
    this.playNoiseHit(now, 0.16, 0.4, this.sfxGain, 'lowpass', 600);
  }

  // 10. GRENADE LAUNCHER / BOMBS
  public playGrenadeLaunch() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playPitchSweep(180, 90, 'square', 0.12, now, 0.45, this.sfxGain);
    this.playNoiseHit(now, 0.12, 0.3, this.sfxGain, 'lowpass', 900);
  }

  // 11. POISON STAFF / TOXIC SPELL
  public playPoisonSpell() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playPitchSweep(340, 680, 'sine', 0.14, now, 0.35, this.sfxGain);
    this.playPitchSweep(520, 280, 'sine', 0.12, now + 0.04, 0.3, this.sfxGain);
  }

  public playStaffWhack() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playSynthNote(260, 'triangle', 0.08, now, 0.4, this.sfxGain);
    this.playNoiseHit(now, 0.06, 0.25, this.sfxGain, 'bandpass', 1200);
  }

  public playShoot() {
    this.playCrossbowShoot();
  }

  // ================= HIT / IMPACT SOUNDS =================

  // Generic hit fallback
  public playHit() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playNoiseHit(now, 0.09, 0.35, this.sfxGain, 'highpass', 1200);
    this.playSynthNote(120, 'triangle', 0.08, now, 0.3, this.sfxGain);
  }

  // Blade / Slashing hit (Crisp cutting steel impact)
  public playBladeHit() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playPitchSweep(720, 240, 'triangle', 0.08, now, 0.45, this.sfxGain);
    this.playNoiseHit(now, 0.08, 0.4, this.sfxGain, 'bandpass', 3200);
  }

  // Kraul Shadow Whip Hit (Lashing whip snap + dark cursed resonance)
  public playWhipHit() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Whip crack impact
    this.playPitchSweep(1400, 180, 'sawtooth', 0.07, now, 0.45, this.sfxGain);
    this.playNoiseHit(now, 0.06, 0.4, this.sfxGain, 'highpass', 3000);
    // Dark life-drain bass vibration
    this.playSynthNote(75, 'triangle', 0.16, now + 0.02, 0.4, this.sfxGain);
  }

  // Magic / Arcane Hit (Crystalline ethereal burst)
  public playMagicHit() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playSynthNote(1046.50, 'sine', 0.12, now, 0.35, this.sfxGain);
    this.playSynthNote(1318.51, 'triangle', 0.10, now + 0.03, 0.3, this.sfxGain);
    this.playNoiseHit(now, 0.07, 0.2, this.sfxGain, 'bandpass', 4000);
  }

  // Acid / Toxic Hit (Corrosive bubbling sizzle)
  public playAcidHit() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Sizzling acid high frequencies
    this.playNoiseHit(now, 0.16, 0.35, this.sfxGain, 'highpass', 2400);
    this.playPitchSweep(380, 520, 'sine', 0.08, now, 0.25, this.sfxGain);
    this.playPitchSweep(540, 260, 'sine', 0.09, now + 0.04, 0.25, this.sfxGain);
  }

  // Piercing / Arrow Hit (Deep puncture thud)
  public playPierceHit() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playPitchSweep(380, 110, 'triangle', 0.07, now, 0.45, this.sfxGain);
    this.playNoiseHit(now, 0.07, 0.3, this.sfxGain, 'bandpass', 1900);
  }

  // Blunt / Heavy Smash Hit (Fists, hammers, heavy boulders)
  public playBluntHit() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playPitchSweep(95, 35, 'sawtooth', 0.14, now, 0.5, this.sfxGain);
    this.playNoiseHit(now, 0.14, 0.4, this.sfxGain, 'lowpass', 700);
  }

  // Critical Hit (Heavy punch + bright high chime)
  public playCritHit() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playPitchSweep(120, 40, 'sawtooth', 0.2, now, 0.5, this.sfxGain);
    this.playSynthNote(1567.98, 'square', 0.12, now, 0.3, this.sfxGain);
    this.playSynthNote(2093.00, 'triangle', 0.15, now + 0.04, 0.35, this.sfxGain);
    this.playNoiseHit(now, 0.15, 0.4, this.sfxGain, 'bandpass', 2200);
  }

  public playCast() {
    this.playMagicArcaneShoot();
  }

  public playPoison() {
    this.playAcidHit();
  }

  public playWhirlwind() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      this.playSynthNote(220 + i * 80, 'sawtooth', 0.08, now + i * 0.06, 0.2, this.sfxGain);
    }
  }

  public playMonsterUlt() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playSynthNote(90, 'sawtooth', 0.5, now, 0.5, this.sfxGain);
    this.playNoiseHit(now, 0.4, 0.4, this.sfxGain);
    this.playSynthNote(180, 'triangle', 0.4, now + 0.1, 0.4, this.sfxGain);
  }

  public playExplosion() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playNoiseHit(now, 0.35, 0.5, this.sfxGain);
    this.playSynthNote(80, 'sine', 0.4, now, 0.4, this.sfxGain);
  }

  public playEarthquake() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playSynthNote(70, 'triangle', 0.3, now, 0.4, this.sfxGain);
    this.playNoiseHit(now + 0.05, 0.2, 0.3, this.sfxGain);
  }

  public playLevelUp() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      this.playSynthNote(freq, 'triangle', 0.15, now + idx * 0.08, 0.3, this.sfxGain!);
    });
  }

  public playVictory() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      this.playSynthNote(freq, 'square', 0.25, now + idx * 0.12, 0.3, this.sfxGain!);
    });
  }

  public playWhoosh() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playNoiseHit(now, 0.18, 0.25, this.sfxGain);
  }

  public playBoulderThrow() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playSynthNote(65, 'triangle', 0.22, now, 0.45, this.sfxGain);
    this.playNoiseHit(now + 0.04, 0.25, 0.35, this.sfxGain);
  }

  public playSmash() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playSynthNote(75, 'square', 0.18, now, 0.5, this.sfxGain);
    this.playNoiseHit(now + 0.02, 0.22, 0.45, this.sfxGain);
  }

  public playStoneSkin() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playSynthNote(120, 'square', 0.15, now, 0.4, this.sfxGain);
    this.playSynthNote(240, 'triangle', 0.25, now + 0.08, 0.35, this.sfxGain);
    this.playNoiseHit(now, 0.12, 0.3, this.sfxGain);
  }

  public playUndergroundBurrow() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playSynthNote(50, 'sawtooth', 0.35, now, 0.5, this.sfxGain);
    this.playNoiseHit(now, 0.3, 0.4, this.sfxGain);
  }

  public playBurrow() {
    this.playUndergroundBurrow();
  }

  public playEruption() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playNoiseHit(now, 0.45, 0.6, this.sfxGain);
    this.playSynthNote(60, 'triangle', 0.4, now, 0.55, this.sfxGain);
    this.playSynthNote(110, 'sawtooth', 0.3, now + 0.05, 0.45, this.sfxGain);
  }

  public playErupt() {
    this.playEruption();
  }

  public playRockShatter() {
    this.initCtx();
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.playNoiseHit(now, 0.25, 0.4, this.sfxGain);
    this.playSynthNote(90, 'triangle', 0.15, now, 0.35, this.sfxGain);
  }

  // Rune Wanderers (Темный атмосферный фолк)
  private playRuneWanderersStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;
    const scale = [185.00, 220.00, 246.94, 277.18, 329.63, 369.99, 440.00, 493.88];
    const melody = [0, 2, 3, 4, 5, 4, 3, 2, 4, 3, 2, 0, 2, -1, 3, -1];
    const noteIdx = melody[step % 16];
    if (noteIdx >= 0) {
      this.playSynthNote(scale[noteIdx], 'triangle', 0.28, now, 0.24, this.musicGain);
      this.playSynthNote(scale[noteIdx] * 1.5, 'sine', 0.22, now + 0.04, 0.12, this.musicGain);
    }
    if (step % 4 === 1 && Math.random() > 0.5) {
      this.playNoiseHit(now, 0.25, 0.08, this.musicGain, 'highpass', 4000);
    }
    if (step % 8 === 0) {
      this.playSynthNote(92.50, 'sine', 0.35, now, 0.35, this.musicGain);
    }
  }

  // Sunset Citadel (Спокойный Lo-Fi)
  private playSunsetCitadelStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;
    const chords = [
      [164.81, 220.00, 261.63, 329.63],
      [146.83, 196.00, 246.94, 293.66],
      [130.81, 164.81, 196.00, 261.63],
      [146.83, 174.61, 220.00, 293.66]
    ];
    const chordIdx = Math.floor((step % 32) / 8);
    const chord = chords[chordIdx];
    const arpNote = chord[step % 4];
    this.playSynthNote(arpNote * 2, 'sine', 0.30, now, 0.25, this.musicGain);
    if (step % 8 === 4) {
      this.playNoiseHit(now, 0.06, 0.12, this.musicGain, 'lowpass', 1200);
    }
    if (step % 8 === 0) {
      this.playSynthNote(chord[0] * 0.5, 'sine', 0.40, now, 0.35, this.musicGain);
    }
  }

  // Midnight Wyrm (Холодный мистический эмбиент)
  private playMidnightWyrmStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;
    const roots = [123.47, 123.47, 98.00, 110.00];
    const r = roots[Math.floor((step % 32) / 8)];
    if (step % 8 === 0) {
      this.playSynthNote(r, 'sine', 0.8, now, 0.45, this.musicGain);
      this.playSynthNote(r * 2, 'triangle', 0.6, now, 0.25, this.musicGain);
    }
    if (step % 16 === 2 || step % 16 === 10) {
      const bellFreq = 987.77 + (step % 4) * 110;
      this.playSynthNote(bellFreq, 'sine', 0.5, now, 0.15, this.musicGain);
      this.playSynthNote(bellFreq * 1.5, 'sine', 0.2, now + 0.05, 0.08, this.musicGain);
    }
  }

  // Crimson Eclipse (Агрессивный 16-битный чиптюн)
  private playCrimsonEclipseStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;
    const scale = [392.00, 466.16, 523.25, 587.33, 698.46, 783.99];
    const mel = [0, 3, 2, 1, 3, 5, 4, 3, 5, 3, 2, 1, 0, -1, 1, -1];
    const note = mel[step % 16];
    if (note >= 0) {
      this.playSynthNote(scale[note], 'square', 0.12, now, 0.18, this.musicGain);
    }
    if (step % 4 === 0) {
      this.playSynthNote(90, 'sine', 0.09, now, 0.40, this.musicGain);
    }
    if (step % 8 === 4) {
      this.playNoiseHit(now, 0.14, 0.28, this.musicGain, 'highpass', 1500);
    }
  }

  // Gilded Sentinel (Эпическая тема рыцарства)
  private playGildedSentinelStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;
    const roots = [146.83, 164.81, 196.00, 220.00];
    const r = roots[Math.floor((step % 32) / 8)];
    if (step % 8 === 0) {
      this.playSynthNote(r, 'sawtooth', 0.45, now, 0.35, this.musicGain);
      this.playSynthNote(r * 1.5, 'sawtooth', 0.40, now + 0.03, 0.25, this.musicGain);
    }
    const melody = [587.33, 659.25, 698.46, 783.99, 880.00, 783.99, 698.46, 587.33];
    if (step % 4 === 0) {
      const mFreq = melody[Math.floor(step / 4) % 8];
      this.playSynthNote(mFreq, 'triangle', 0.35, now, 0.22, this.musicGain);
    }
    if (step % 8 === 2 || step % 8 === 6) {
      this.playNoiseHit(now, 0.06, 0.15, this.musicGain, 'bandpass', 1600);
    }
    if (step % 8 === 4) {
      this.playNoiseHit(now, 0.12, 0.25, this.musicGain, 'bandpass', 1500);
    }
  }

  // Void Sovereign (Космический Dark Synthwave)
  private playVoidSovereignStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;
    const chords = [
      [116.54, 138.59, 174.61],
      [98.00, 116.54, 146.83],
      [130.81, 155.56, 196.00],
      [110.00, 130.81, 164.81]
    ];
    const idx = Math.floor((step % 32) / 8);
    const chord = chords[idx];
    const note = chord[step % 3];
    this.playSynthNote(note * 2, 'square', 0.11, now, 0.15, this.musicGain);
    if (step % 2 === 0) {
      this.playSynthNote(chord[0] * 0.5, 'sawtooth', 0.20, now, 0.38, this.musicGain);
    }
    if (step % 4 === 0) {
      this.playSynthNote(65, 'sine', 0.10, now, 0.42, this.musicGain);
    }
    if (step % 8 === 4) {
      this.playNoiseHit(now, 0.15, 0.32, this.musicGain, 'highpass', 1800);
    }
  }

  // Crypt Butcher (Боевой металл)
  private playCryptButcherStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;
    const roots = [82.41, 82.41, 65.41, 73.42];
    const r = roots[Math.floor((step % 16) / 4)];
    if (step % 2 === 0) {
      this.playSynthNote(r, 'sawtooth', 0.18, now, 0.45, this.musicGain);
      this.playSynthNote(r * 1.5, 'sawtooth', 0.15, now, 0.35, this.musicGain);
    }
    if (step % 8 === 4) {
      this.playNoiseHit(now, 0.22, 0.35, this.musicGain, 'bandpass', 800);
      this.playSynthNote(120, 'square', 0.14, now, 0.30, this.musicGain);
    }
    if (step % 4 === 0 || step % 8 === 1) {
      this.playSynthNote(55, 'sine', 0.08, now, 0.48, this.musicGain);
    }
  }

  // Chaos Overlord (Озорной босс-файт)
  private playChaosOverlordStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;
    const scale = [261.63, 293.66, 311.13, 349.23, 392.00, 466.16, 523.25, 587.33];
    const mel = [0, 4, 3, 2, 4, 6, 5, 4, 7, 5, 4, 3, 2, 1, 0, -1];
    const note = mel[step % 16];
    if (note >= 0) {
      this.playSynthNote(scale[note] * 1.5, 'square', 0.08, now, 0.20, this.musicGain);
      this.playSynthNote(scale[note] * 3, 'sine', 0.05, now + 0.04, 0.10, this.musicGain);
    }
    if (step % 4 === 0) {
      this.playSynthNote(110, 'triangle', 0.07, now, 0.35, this.musicGain);
    }
    if (step % 4 === 2) {
      this.playNoiseHit(now, 0.05, 0.20, this.musicGain, 'highpass', 3500);
    }
  }

  // Brave Cat's Journey / Wiklund (Сказка Менестреля)
  private playBraveCatStep(now: number, step: number) {
    if (!this.ctx || !this.musicGain) return;
    const scale = [196.00, 220.00, 246.94, 293.66, 329.63, 392.00, 440.00, 493.88, 587.33];
    const melody = [0, 2, 3, 5, 4, 3, 2, 0, 3, 5, 7, 8, 7, 5, 3, 2];
    const note = melody[step % 16];
    if (note >= 0) {
      this.playSynthNote(scale[note] * 1.5, 'sine', 0.22, now, 0.30, this.musicGain);
      if (step % 2 === 0) {
        this.playSynthNote(scale[note % 5], 'triangle', 0.15, now + 0.02, 0.18, this.musicGain);
      }
    }
    if (Math.random() > 0.7) {
      this.playNoiseHit(now, 0.03, 0.09, this.musicGain, 'bandpass', 5000);
    }
    if (step % 8 === 0 || step % 8 === 6) {
      this.playSynthNote(75, 'sine', 0.12, now, 0.25, this.musicGain);
    }
  }
}

export const soundEngine = new SoundEngine();
