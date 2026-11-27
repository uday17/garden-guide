/* ==========================================================================
   GrowWell — Garden Game sounds
   Tiny Web Audio effects; no audio files or network requests needed.
   ========================================================================== */
window.GameSound = (function () {
  "use strict";

  let ctx = null;
  let muted = false;
  let lastPlayed = {};

  function context() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function throttle(name, ms) {
    const now = Date.now();
    if (lastPlayed[name] && now - lastPlayed[name] < ms) return true;
    lastPlayed[name] = now;
    return false;
  }

  function tone(freq, dur, opts) {
    if (muted) return;
    const c = context();
    if (!c) return;
    const o = opts || {};
    const start = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, start);
    if (o.slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + o.slide), start + dur);
    }
    const volume = o.gain == null ? .07 : o.gain;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(.02, dur / 3));
    gain.gain.exponentialRampToValueAtTime(.0001, start + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + dur + .03);
  }

  function noise(dur, opts) {
    if (muted) return;
    const c = context();
    if (!c) return;
    const o = opts || {};
    const start = c.currentTime + (o.delay || 0);
    const length = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = c.createBufferSource();
    source.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = o.filterType || "lowpass";
    filter.frequency.setValueAtTime(o.freq || 1200, start);
    if (o.slideTo) filter.frequency.exponentialRampToValueAtTime(o.slideTo, start + dur);
    const gain = c.createGain();
    const volume = o.gain == null ? .035 : o.gain;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .02);
    gain.gain.exponentialRampToValueAtTime(.0001, start + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    source.start(start);
    source.stop(start + dur + .03);
  }

  const api = {
    click: function () {
      if (throttle("click", 90)) return;
      tone(540, .055, { type: "sine", gain: .045 });
    },
    select: function () {
      tone(520, .07, { type: "sine", gain: .05 });
      tone(780, .09, { type: "sine", gain: .04, delay: .06 });
    },
    plant: function () {
      tone(170, .22, { type: "triangle", gain: .07, slide: -50 });
      noise(.22, { freq: 520, slideTo: 180, gain: .045 });
      tone(880, .1, { type: "sine", gain: .03, delay: .16 });
    },
    water: function () {
      noise(.42, { filterType: "bandpass", freq: 1600, slideTo: 500, gain: .05 });
      noise(.3, { filterType: "bandpass", freq: 900, slideTo: 1600, gain: .025, delay: .12 });
      tone(620, .16, { type: "sine", gain: .028, slide: -260, delay: .06 });
      tone(780, .13, { type: "sine", gain: .022, slide: -320, delay: .2 });
    },
    skip: function () {
      tone(320, .07, { type: "triangle", gain: .035 });
      tone(240, .08, { type: "triangle", gain: .025, delay: .07 });
    },
    fail: function () {
      if (throttle("fail", 250)) return;
      tone(420, .18, { type: "triangle", gain: .05, slide: -90 });
      tone(300, .2, { type: "triangle", gain: .045, slide: -80, delay: .14 });
      tone(210, .28, { type: "sine", gain: .04, slide: -60, delay: .28 });
    },
    win: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone(f, .22, { type: "sine", gain: .045, delay: i * .11 });
      });
    },
    toggleMuted: function () {
      muted = !muted;
      if (!muted) api.click();
      return muted;
    },
    isMuted: function () { return muted; }
  };

  return api;
})();
