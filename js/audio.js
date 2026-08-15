/* ============================================================
   Masterchessis — audio.js
   Moteur sonore immersif 100 % Web Audio API (Autonome, sans fichiers mp3 externes)
   Synthétise les bruits d'échecs réalistes : déplacements bois, captures, échecs,
   jingles de victoire, combos tactiques et montées de niveau.
   ============================================================ */
(function () {
  'use strict';

  let ctx = null;

  function getAudioContext() {
    if (!ctx && (typeof window !== 'undefined')) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        ctx = new AudioContext();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  // Activer l'audio sur première interaction utilisateur
  if (typeof window !== 'undefined') {
    const unlock = () => {
      getAudioContext();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  const Sound = {
    enabled: true,

    // 1. Coup standard (tap de bois chaleureux)
    playMove() {
      if (!this.enabled) return;
      const ac = getAudioContext();
      if (!ac) return;

      try {
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.07);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gain);
        gain.connect(ac.destination);

        osc.start(now);
        osc.stop(now + 0.08);
      } catch (e) {}
    },

    // 2. Capture (impact net et claquant)
    playCapture() {
      if (!this.enabled) return;
      const ac = getAudioContext();
      if (!ac) return;

      try {
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(ac.destination);

        osc.start(now);
        osc.stop(now + 0.11);
      } catch (e) {}
    },

    // 3. Échec au Roi (Alerte / sonnette d'attention)
    playCheck() {
      if (!this.enabled) return;
      const ac = getAudioContext();
      if (!ac) return;

      try {
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.linearRampToValueAtTime(680, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ac.destination);

        osc.start(now);
        osc.stop(now + 0.19);
      } catch (e) {}
    },

    // 4. Succès / Étape de puzzle ou leçon réussie (arpège mélodieux)
    playSuccess() {
      if (!this.enabled) return;
      const ac = getAudioContext();
      if (!ac) return;

      try {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do aigu
        const now = ac.currentTime;

        notes.forEach((freq, idx) => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          const start = now + idx * 0.07;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.18, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

          osc.connect(gain);
          gain.connect(ac.destination);

          osc.start(start);
          osc.stop(start + 0.26);
        });
      } catch (e) {}
    },

    // 5. Erreur / Mauvais coup (buzzer doux)
    playWrong() {
      if (!this.enabled) return;
      const ac = getAudioContext();
      if (!ac) return;

      try {
        const now = ac.currentTime;
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.18);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(ac.destination);

        osc.start(now);
        osc.stop(now + 0.21);
      } catch (e) {}
    },

    // 6. Victoire de partie / Leçon complétée (Fanfare triomphale)
    playWin() {
      if (!this.enabled) return;
      const ac = getAudioContext();
      if (!ac) return;

      try {
        const chords = [
          { f: 523.25, t: 0 },    // C5
          { f: 659.25, t: 0.1 },  // E5
          { f: 783.99, t: 0.2 },  // G5
          { f: 1046.50, t: 0.35 } // C6
        ];
        const now = ac.currentTime;

        chords.forEach(c => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          const start = now + c.t;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(c.f, start);

          gain.gain.setValueAtTime(0.25, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

          osc.connect(gain);
          gain.connect(ac.destination);

          osc.start(start);
          osc.stop(start + 0.65);
        });
      } catch (e) {}
    }
  };

  window.ChessSound = window.Sound = Sound;
})();
