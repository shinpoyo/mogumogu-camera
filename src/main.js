/**
 * 組み立て役。各モジュールを作って線をつなぐだけで、自分では何も判断しない。
 *
 * 何かを追加・変更したいとき
 *   設定を増やす      → core/store.js（既定値・検証） + ui/panel.js（SETTINGS に1行）
 *   演出を増やす      → themes/ にファイルを足し、themes/index.js に登録するだけ
 *   画像を差し替える  → config.js の assets にパスを書くだけ
 * ここを触る必要はない。
 */
import { createBus } from "./core/bus.js";
import { createStore } from "./core/store.js";
import { createState } from "./core/state.js";
import { createCamera } from "./input/camera.js";
import { createMotion } from "./input/motion.js";
import { createRing } from "./input/ring.js";
import { createParticles } from "./fx/particles.js";
import { createSound } from "./fx/sound.js";
import { createShout, createScreen, createSpeech } from "./fx/screen.js";
import { createHud } from "./ui/hud.js";
import { createPanel } from "./ui/panel.js";
import { themes, themeOptions, getTheme } from "./themes/index.js";
import { config, figure } from "./config.js";

const $ = (id) => document.getElementById(id);
const els = {
  stage: $("stage"), video: $("video"), fx: $("fx"), ring: $("ring"),
  layer: $("themeLayer"), flash: $("flash"), shout: $("shout"),
  topbar: $("topbar"), counter: $("counter"), flipBtn: $("flipBtn"), gearBtn: $("gearBtn"),
  biteBtn: $("biteBtn"), panel: $("panel"),
  start: $("start"), startLead: $("startLead"), startBtn: $("startBtn"), err: $("err"),
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const bus = createBus();
const store = createStore(bus);
const state = createState(bus, store);

const camera = createCamera(bus, els.video);
const motion = createMotion(bus, els.video, () => ({
  x: store.get("ringX"), y: store.get("ringY"),
  r: store.get("ringSize") / 200, sens: store.get("sens"),
}));
const ring = createRing(bus, els.ring, store);

const fx = createParticles(els.fx);
const sound = createSound(() => store.get("sound"));
const speech = createSpeech(() => store.get("voice"));
const shout = createShout(els.shout);
const screen = createScreen(els.stage, els.flash, reduceMotion);

// ---- テーマの ための タイマー管理。切りかえ・リセットで まとめて止める ----
const timers = new Set();
function later(fn, ms) {
  const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
  timers.add(id);
  return id;
}
function every(fn, intervalMs, totalMs) {
  const start = performance.now();
  const id = setInterval(() => {
    if (performance.now() - start >= totalMs) { clearTimers1(id); return; }
    fn();
  }, intervalMs);
  timers.add(id);
  return id;
}
function clearTimers1(id) { clearTimeout(id); clearInterval(id); timers.delete(id); }
function clearTimers() { timers.forEach((id) => { clearTimeout(id); clearInterval(id); }); timers.clear(); }

// ---- 手動の「たべた！」。HUD・パネルより先に定義しておく ----
function manualBite() {
  sound.unlock();
  motion.touch();
  state.bite();
}

// ---- HUD と パネル。テーマが setDeck() で参照するので、テーマの初期化より先に作る ----
const hud = createHud(bus, els, {
  onBite: manualBite,
  onFlip: () => camera.flip(),
  onGear: () => panel.toggle(),
});
const panel = createPanel(bus, els.panel, store, {
  themeOptions,
  onBite: manualBite,
  onReset: () => {
    fx.clear();
    state.resetAll();
    hud.resetCounter();
  },
});

const ctx = {
  layer: els.layer, fx, sound, speech, shout, screen,
  later, every, reduceMotion,
  figure: (key, emoji, cls) => figure(key, emoji, cls),
  setDeck: (px) => hud.setDeck(px),
};

fx.preload(config.okazu.concat(["⭐", "✨", "🎉", "💫", "🌈", "🍀"]));

// ---- テーマの 切りかえ ----
let current = getTheme(store.get("theme"));

function mountTheme(theme) {
  theme.mount(ctx);
  els.startLead.innerHTML = theme.lead || els.startLead.innerHTML;
  theme.build(state.goal);
  theme.progress(state.filled, state.goal);
}
mountTheme(current);

function switchTheme(id) {
  clearTimers();
  screen.stopShake();
  current.unmount();
  current = getTheme(id);
  mountTheme(current);
}

// ---- 状態 → テーマ の 配線 ----
bus.on("bite", ({ filled, goal, counted }) => {
  if (!counted) return;
  current.progress(filled, goal);
  current.bite(filled, goal);
});

bus.on("complete", ({ goal }) => {
  current.celebrate(goal, () => state.reset());
});

bus.on("reset", () => {
  clearTimers();
  screen.stopShake();
  current.reset();
});

bus.on("goal", ({ goal, filled }) => {
  current.build(goal);
  current.progress(filled, goal);
});

bus.on("settings:change", ({ key, value }) => {
  if (key === "theme") switchTheme(value);
  if (key === "goal") state.retarget();
});

// ---- 開始 ----
els.startBtn.addEventListener("click", () => {
  sound.unlock();
  camera.start();
});

let running = false;
bus.on("camera:start", () => {
  running = true;
  ring.init();
  fx.resize();
  motion.relearn();
  requestAnimationFrame(loop);
});

// ---- 描画・検知の ループ ----
let last = 0;
function loop(t) {
  if (!running) return;
  requestAnimationFrame(loop);
  const dt = last ? t - last : 0;
  last = t;
  fx.frame(dt);
  motion.tick(dt, store.get("detect"));
}

window.addEventListener("resize", () => {
  fx.resize();
  ring.place();
});
window.addEventListener("orientationchange", () => {
  setTimeout(() => { fx.resize(); ring.place(); current.build(state.goal); current.progress(state.filled, state.goal); }, 300);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) motion.relearn();
});

// ---- 診断用。自動テストと性能計測に使う ----
window.__mogu = {
  get bites() { return state.bites; },
  get filled() { return state.filled; },
  get goal() { return state.goal; },
  get parts() { return fx.count; },
  get fxScale() { return fx.scale; },
  get frameMs() { return fx.frameMs; },
  get theme() { return current.id; },
  onBite: manualBite,
  setGoal: (n) => store.set("goal", n),
  setRingSize: (v) => store.set("ringSize", v),
  setTheme: (id) => store.set("theme", id),
  burst: (...a) => fx.burst(...a),
  spark: (...a) => fx.spark(...a),
  blast: (...a) => fx.blast(...a),
};
