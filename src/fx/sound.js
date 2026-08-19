/**
 * 音。Web Audio でその場で合成する。音声ファイルは持たない。
 *
 * iOS の自動再生制限があるので、AudioContext はユーザー操作の中で作る。
 * unlock() を最初のタップから呼ぶこと。
 *
 * テーマから使う想定の部品:
 *   tone / noise …… 基本のふたつ。これを組み合わせれば大抵の音は作れる
 *   chime / fanfare / beep / charge / whoosh / rumble / siren / sparkle …… できあい
 */
export function createSound(isEnabled) {
  let ac = null;

  function ctx() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }

  /** 単音。type は triangle / square / sawtooth / sine */
  function tone(freq, { at = 0, dur = 0.28, vol = 0.18, type = "triangle", to = null } = {}) {
    const a = ctx();
    if (!a || !isEnabled()) return;
    const o = a.createOscillator();
    const g = a.createGain();
    const t0 = a.currentTime + at;
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.linearRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  /** ノイズ。filter で色をつける */
  function noise({ dur = 0.6, vol = 0.2, type = "lowpass", from = 300, to = 1800, back = null, q = 1 } = {}) {
    const a = ctx();
    if (!a || !isEnabled()) return;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = type; f.Q.value = q;
    const t0 = a.currentTime;
    f.frequency.setValueAtTime(from, t0);
    f.frequency.linearRampToValueAtTime(to, t0 + dur * 0.35);
    if (back) f.frequency.linearRampToValueAtTime(back, t0 + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  const SCALE = [523, 587, 659, 784, 880, 1047];

  return {
    unlock: ctx,

    tone,
    noise,

    /** ひとくちの音。順番に音階が上がる */
    chime(i) {
      const f = SCALE[i % SCALE.length];
      tone(f, { dur: 0.28, vol: 0.18 });
      tone(f * 2, { at: 0.06, dur: 0.22, vol: 0.08 });
    },

    fanfare() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.12, dur: 0.4, vol: 0.16 }));
    },

    beep(f) {
      tone(f, { dur: 0.18, vol: 0.2, type: "square" });
    },

    /** たまっていく音。ratio は 0..1 */
    charge(ratio) {
      tone(90 + ratio * 110, {
        dur: 0.4, vol: 0.05 + ratio * 0.07, type: "sawtooth", to: 150 + ratio * 260,
      });
    },

    /** すっと現れるときの風きり音 */
    whoosh() {
      noise({ dur: 0.6, vol: 0.14, type: "bandpass", from: 300, to: 2600, q: 1.4 });
    },

    /** 発射の轟音 */
    rumble(dur = 2.4) {
      noise({ dur, vol: 0.26, from: 300, to: 1800, back: 400 });
      tone(65, { dur, vol: 0.15, type: "sawtooth", to: 200 });
    },

    /** 爆発。腹に来る低い音 */
    boom(vol = 0.3) {
      noise({ dur: 1.1, vol, type: "lowpass", from: 900, to: 160, back: 60 });
      tone(120, { dur: 0.8, vol: vol * 0.6, type: "sine", to: 34 });
    },

    /** 花火が開く音。遠くで鳴る感じにするため少し高く短く */
    pop(vol = 0.16) {
      noise({ dur: 0.5, vol, type: "bandpass", from: 1200, to: 320, q: 0.8 });
      tone(180, { dur: 0.35, vol: vol * 0.5, type: "sine", to: 60 });
    },

    /** 花火のあとの、ぱちぱち */
    crackle(dur = 0.9) {
      noise({ dur, vol: 0.07, type: "highpass", from: 3000, to: 7000 });
    },

    /** きらきら。変身などの高い音 */
    sparkle() {
      [1047, 1319, 1568, 2093].forEach((f, i) =>
        tone(f, { at: i * 0.08, dur: 0.5, vol: 0.12, type: "sine" }));
      noise({ dur: 0.9, vol: 0.06, type: "highpass", from: 2000, to: 6000 });
    },

    /** パトカーのサイレン。times 回ゆれる */
    siren(times = 4) {
      for (let i = 0; i < times; i++) {
        tone(740, { at: i * 0.42, dur: 0.4, vol: 0.13, type: "square", to: 990 });
        tone(990, { at: i * 0.42 + 0.21, dur: 0.4, vol: 0.13, type: "square", to: 740 });
      }
    },
  };
}
