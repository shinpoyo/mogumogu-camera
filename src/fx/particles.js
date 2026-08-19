/**
 * パーティクル。
 *
 * 守っているルール（→ CLAUDE.md「エフェクトのルール」）
 *  - 絵柄は起動時に一度だけ小さなキャンバスへ焼き、毎フレームは drawImage だけ
 *  - 同時に生きる粒に上限を置き、超えたら古いものから splice で捨てる
 *  - 種類ごとにまとめて描き、合成モードの切替は1フレーム2回まで
 *  - 1粒ごとの save/restore は呼ばない
 *  - フレーム時間を見て、重い端末では自動で数を減らす
 *
 * これを崩すと 1244個で 38ms/フレームまで落ちる（実測）。
 */
const SPR = 64;          // スプライトの一辺
const SPARK_HUES = 6;
const MAX_PARTS = 460;

function makeSprite(paint) {
  const c = document.createElement("canvas");
  c.width = c.height = SPR;
  paint(c.getContext("2d"));
  return c;
}

function radial(stops) {
  return makeSprite((g2) => {
    const g = g2.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
    for (const [at, color] of stops) g.addColorStop(at, color);
    g2.fillStyle = g;
    g2.fillRect(0, 0, SPR, SPR);
  });
}

export function createParticles(canvas) {
  const ctx = canvas.getContext("2d");
  let parts = [];
  let scale = 1;         // 重いときに下がる係数
  let frameMs = 16;

  const sparkSpr = [];
  for (let i = 0; i < SPARK_HUES; i++) {
    const hue = 18 + i * (36 / SPARK_HUES);
    sparkSpr.push(radial([
      [0, "rgba(255,252,235,1)"],
      [0.45, `hsla(${hue},100%,62%,.85)`],
      [1, `hsla(${hue},100%,50%,0)`],
    ]));
  }
  const smokeSpr = radial([
    [0, "rgba(198,205,216,.34)"],
    [0.6, "rgba(198,205,216,.22)"],
    [1, "rgba(198,205,216,0)"],
  ]);
  const glyphs = Object.create(null);

  /** 絵文字を焼いて使い回す。テーマから好きな字を渡してよい */
  function glyph(ch) {
    let s = glyphs[ch];
    if (!s) {
      s = makeSprite((g2) => {
        g2.font = Math.round(SPR * 0.78) + "px serif";
        g2.textAlign = "center";
        g2.textBaseline = "middle";
        g2.fillText(ch, SPR / 2, SPR / 2);
      });
      glyphs[ch] = s;
    }
    return s;
  }

  const trim = () => {
    if (parts.length > MAX_PARTS) parts.splice(0, parts.length - MAX_PARTS);
  };
  const amount = (n) => Math.max(1, Math.round(n * scale));

  return {
    /** 絵柄を先に焼いておく。最初のひとくちで詰まらせないため */
    preload(chars) {
      for (const ch of chars) glyph(ch);
    },

    resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    },

    /** 絵文字がはじけ飛ぶ。chars を渡すとその中から選ぶ */
    burst(x, y, n, chars) {
      const list = chars && chars.length ? chars : ["⭐", "✨", "🎉", "💫", "🌈", "🍀"];
      const count = amount(n);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 7;
        parts.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, life: 1,
          spr: glyph(list[(Math.random() * list.length) | 0]),
          size: 16 + Math.random() * 26, rot: Math.random() * 6,
        });
      }
      trim();
    },

    /** 下向きの火花。ロケットの噴射など */
    spark(x, y, n, spread = 0.9) {
      const count = amount(n);
      for (let i = 0; i < count; i++) {
        const a = Math.PI / 2 + (Math.random() - 0.5) * spread;
        const s = 2 + Math.random() * 9;
        parts.push({
          kind: "spark", x: x + (Math.random() - 0.5) * 22, y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1,
          decay: 0.026 + Math.random() * 0.022, grav: 0.03,
          size: 9 + Math.random() * 17, rot: 0,
          spr: sparkSpr[(Math.random() * SPARK_HUES) | 0],
        });
      }
      trim();
    },

    /**
     * 全方向に飛び散る火花。爆発と花火に使う。
     * speed をそろえるとまるく広がって花火らしくなる。
     */
    blast(x, y, n, { speed = 9, jitter = 0.35, hue = null, decay = 0.018, grav = 0.06 } = {}) {
      const count = amount(n);
      for (let i = 0; i < count; i++) {
        // 角度を均等に配ってから少しゆらすと、輪の形が保たれる
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
        const s = speed * (1 - jitter + Math.random() * jitter * 2);
        parts.push({
          kind: "spark", x, y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1,
          decay: decay + Math.random() * 0.012, grav,
          size: 10 + Math.random() * 16, rot: 0,
          spr: sparkSpr[hue === null ? (Math.random() * SPARK_HUES) | 0 : hue % SPARK_HUES],
        });
      }
      trim();
    },

    /** ゆっくり広がって上がる煙 */
    smoke(x, y, n) {
      const count = amount(n);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 6;
        parts.push({
          kind: "smoke", x, y,
          vx: Math.cos(a) * s, vy: Math.abs(Math.sin(a)) * s * 0.5, life: 1,
          decay: 0.010 + Math.random() * 0.010, grav: -0.01,
          size: 12 + Math.random() * 22, rot: 0, spr: smokeSpr,
        });
      }
      trim();
    },

    /** ゆっくり舞い落ちる。花びらや羽根むけ */
    drift(x, y, n, chars) {
      const list = chars && chars.length ? chars : ["✨"];
      const count = amount(n);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        parts.push({
          x, y, vx: Math.cos(a) * (1 + Math.random() * 3), vy: -1 - Math.random() * 2.5,
          life: 1, decay: 0.008 + Math.random() * 0.006, grav: 0.045,
          spr: glyph(list[(Math.random() * list.length) | 0]),
          size: 14 + Math.random() * 20, rot: Math.random() * 6,
        });
      }
      trim();
    },

    clear() {
      parts = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    /**
     * 1フレーム進めて描く。dt はミリ秒。
     * ここでフレーム時間を見て、重ければ scale を下げる。
     */
    frame(dt) {
      if (dt > 0 && dt < 100) {
        frameMs = frameMs * 0.9 + dt * 0.1;
        if (frameMs > 26 && scale > 0.35) scale = Math.max(0.35, scale - 0.06);
        else if (frameMs < 19 && scale < 1) scale = Math.min(1, scale + 0.01);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!parts.length) return;

      let hasSpark = false;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += p.grav !== undefined ? p.grav : 0.28;
        p.vx *= 0.99;
        p.life -= p.decay !== undefined ? p.decay : 0.016;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        if (p.kind === "spark") hasSpark = true;
        else p.rot += 0.08;
      }

      if (hasSpark) {
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (p.kind !== "spark") continue;
          ctx.globalAlpha = p.life;
          ctx.drawImage(p.spr, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        }
        ctx.globalCompositeOperation = "source-over";
      }
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p.kind === "spark") continue;
        ctx.globalAlpha = p.life;
        if (p.kind === "smoke") {
          const r = p.size * (2.2 - p.life);
          ctx.drawImage(p.spr, p.x - r, p.y - r, r * 2, r * 2);
        } else {
          const d = p.size * 1.3;
          ctx.setTransform(1, 0, 0, 1, p.x, p.y);
          ctx.rotate(p.rot);
          ctx.drawImage(p.spr, -d / 2, -d / 2, d, d);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
      ctx.globalAlpha = 1;
    },

    get count() { return parts.length; },
    get scale() { return scale; },
    get frameMs() { return frameMs; },
  };
}
