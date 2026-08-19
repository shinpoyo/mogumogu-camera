/**
 * 口の動きの検知。顔認識は使わず、わっかの内側だけのフレーム差分で判定する。
 *
 * 手順
 *   1. 映像を 96x72 に縮小して描く
 *   2. 輝度に変換する（0.299R + 0.587G + 0.114B）
 *   3. わっかの内側だけ、前フレームとの差の絶対値の平均をとる
 *   4. その値が baseline を threshold ぶん上回ったら「ひとくち」
 *
 * baseline をゆっくり追従させることで、明るさの変化には反応せず、
 * 急な動きにだけ反応する。見る範囲や条件が変わったら relearn() を呼ぶこと。
 *
 * 流すイベント: motion:bite {}
 */
const W = 96;
const H = 72;
const WARMUP = 30;         // baseline を作るあいだは発火させない
const COOLDOWN = 2000;     // 一度の咀嚼で何度も数えない
const INTERVAL = 90;       // 約11回/秒

export function createMotion(bus, video, getSettings) {
  const work = document.createElement("canvas");
  work.width = W;
  work.height = H;
  const wctx = work.getContext("2d", { willReadFrequently: true });

  let prev = null;
  let baseline = 0;
  let warm = 0;
  let lastTrigger = 0;
  let acc = 0;

  function relearn() {
    prev = null;
    baseline = 0;
    warm = 0;
  }

  function sample() {
    if (!video.videoWidth) return;
    wctx.drawImage(video, 0, 0, W, H);
    const d = wctx.getImageData(0, 0, W, H).data;
    const n = W * H;
    const gray = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = i * 4;
      gray[i] = d[p] * 0.299 + d[p + 1] * 0.587 + d[p + 2] * 0.114;
    }
    if (!prev) { prev = gray; return; }

    const { x, y, r, sens } = getSettings();
    const cx = x * W;
    const cy = y * H;
    const rr = r * Math.min(W, H) * 1.6;   // 表示の輪よりやや広く見る
    const x0 = Math.max(0, (cx - rr) | 0);
    const x1 = Math.min(W, (cx + rr) | 0);
    const y0 = Math.max(0, (cy - rr) | 0);
    const y1 = Math.min(H, (cy + rr) | 0);

    let sum = 0;
    let count = 0;
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const dx = xx - cx;
        const dy = yy - cy;
        if (dx * dx + dy * dy > rr * rr) continue;
        const i = yy * W + xx;
        sum += Math.abs(gray[i] - prev[i]);
        count++;
      }
    }
    prev = gray;
    if (!count) return;

    const mean = sum / count;
    if (warm < WARMUP) {
      warm++;
      baseline = baseline ? baseline * 0.9 + mean * 0.1 : mean;
      return;
    }
    baseline = baseline * 0.97 + mean * 0.03;    // ゆっくり順応させる

    const threshold = 14 - sens;                 // 感度1→13, 10→4
    const now = performance.now();
    if (mean - baseline > threshold && now - lastTrigger > COOLDOWN) {
      lastTrigger = now;
      bus.emit("motion:bite", {});
    }
  }

  return {
    relearn,
    /** 描画ループから毎フレーム呼ぶ。中で間引く */
    tick(dt, active) {
      if (!active) { acc = 0; return; }
      acc += dt;
      if (acc < INTERVAL) return;
      acc = 0;
      sample();
    },
    /** 手動で1口入れたときも、直後の自動検知を抑える */
    touch() {
      lastTrigger = performance.now();
    },
  };
}
