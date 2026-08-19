/**
 * 設定の保管庫。localStorage への保存と復元、値の検証をここだけで行う。
 *
 * 設定を1つ増やすときは DEFAULTS と VALIDATORS に1行ずつ足すだけでよい。
 * 画面に出したいなら ui/panel.js の SETTINGS にも1行足す。
 */
const KEY = "mogumogu-camera:v2";
const KEY_V1 = "mogumogu-camera:v1";

export const DEFAULTS = {
  theme: "rocket",     // えんしゅつの種類。themes/index.js の id
  goal: 6,             // 完了までの口数
  detect: true,        // うごきを見るか
  sens: 5,             // はんのう しやすさ 1..10
  ringSize: 34,        // わっかの直径 vmin
  ringX: 0.5,          // わっかの位置（画面比率）
  ringY: 0.55,
  sound: true,
  voice: true,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (lo, hi, round) => (v, d) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return d;
  return clamp(round ? Math.round(n) : n, lo, hi);
};
const bool = (v, d) => (typeof v === "boolean" ? v : d);

const VALIDATORS = {
  theme: (v, d) => (typeof v === "string" && v ? v : d),
  goal: num(2, 12, true),
  detect: bool,
  sens: num(1, 10, true),
  ringSize: num(14, 60, false),
  ringX: num(0.05, 0.95, false),
  ringY: num(0.05, 0.9, false),
  sound: bool,
  voice: bool,
};

/** v1 の形から v2 へ移す。ロケットの ON/OFF は bento / rocket テーマに対応する */
function migrateV1(raw) {
  return {
    theme: raw.rocket === false ? "bento" : "rocket",
    goal: raw.goal,
    detect: raw.detect,
    sens: raw.sens,
    ringSize: raw.ringVmin,
    ringX: raw.ringPos && raw.ringPos.x,
    ringY: raw.ringPos && raw.ringPos.y,
    sound: raw.snd,
    voice: raw.voice,
  };
}

function readRaw() {
  try {
    const v2 = localStorage.getItem(KEY);
    if (v2) return JSON.parse(v2);
    const v1 = localStorage.getItem(KEY_V1);
    if (v1) return migrateV1(JSON.parse(v1));
  } catch (e) {
    /* プライベートモードなどで読めなくても既定値で動く */
  }
  return null;
}

export function createStore(bus) {
  const values = { ...DEFAULTS };
  const raw = readRaw() || {};
  for (const k of Object.keys(DEFAULTS)) {
    values[k] = VALIDATORS[k](raw[k], DEFAULTS[k]);
  }

  let saveTimer = null;
  function save() {
    // 連続で動かされるスライダーのために少しまとめる
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(values));
      } catch (e) {
        /* 保存できなくても動作は続ける */
      }
    }, 120);
  }

  return {
    get(key) {
      return values[key];
    },
    all() {
      return { ...values };
    },
    /**
     * 値を入れる。変わったときだけ settings:change を流す。
     * 呼び出し側が「変わったかどうか」を気にしなくて済むようにしている。
     */
    set(key, value) {
      if (!(key in DEFAULTS)) return false;
      const next = VALIDATORS[key](value, DEFAULTS[key]);
      if (next === values[key]) return false;
      const prev = values[key];
      values[key] = next;
      save();
      bus.emit("settings:change", { key, value: next, prev });
      return true;
    },
  };
}
