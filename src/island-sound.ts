/** A quiet struck-bronze chime, synthesized only in response to a bell discovery. */
export function createBellChime() {
  let context: AudioContext | null = null, lastStrike = -Infinity;
  return {
    play() {
      if (performance.now() - lastStrike < 4200) return;
      lastStrike = performance.now();
      try {
        context ??= new AudioContext();
        const audio = context;
        void audio.resume().then(() => {
          if (audio.state !== 'running') return;
          const now = audio.currentTime;
          for (const [frequency, volume, decay] of [[587.3, .065, 3.7], [1175, .028, 2.4], [1608, .013, 1.5], [2380, .008, .9]]) {
            const oscillator = audio.createOscillator(), gain = audio.createGain();
            oscillator.type = 'sine'; oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + .008);
            gain.gain.exponentialRampToValueAtTime(.0001, now + decay);
            oscillator.connect(gain); gain.connect(audio.destination);
            oscillator.start(now); oscillator.stop(now + decay + .05);
            oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
          }
        }).catch(() => { /* Visual bell movement remains available if audio is blocked. */ });
      } catch { /* Audio is optional on browsers without Web Audio. */ }
    },
    dispose() { if (context && context.state !== 'closed') void context.close(); context = null; },
  };
}
