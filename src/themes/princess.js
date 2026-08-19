/**
 * おひめさま。ひとくちごとに身につけるものが増えていき、
 * 全部そろうと画面まんなかへ進み出て、ドレスが咲いてへんしんする。
 *
 * ロケットと同じで、位置決めの箱（.tm-princess）と
 * 動かす箱（.pr-stage）は分けてある。transform がぶつかるため。
 */
import { config } from "../config.js";

// 身につける順。goal が小さいときは先頭から使う（王冠とドレスを先に）
const ITEMS = ["👑", "👗", "🎀", "👠", "📿", "💍", "🌸", "👜", "🧣", "🦋", "💎", "🌟"];
const PETALS = ["💖", "✨", "🌸", "🎀", "💫", "⭐"];

let ctx = null;
let root = null;
let stage = null;
let figureBox = null;
let itemsBox = null;
let skirt = null;
let items = [];

function swapFigure(emoji, key) {
  figureBox.innerHTML = "";
  figureBox.appendChild(ctx.figure(key, emoji, "pr-img"));
}

export default {
  id: "princess",
  label: "おひめさま",
  lead: "カメラに うつった おくちが うごくと<br>おひめさまが すこしずつ おしゃれに なります。<br>ぜんぶ そろうと へんしん！",

  mount(c) {
    ctx = c;
    root = document.createElement("div");
    root.className = "tm-princess";

    stage = document.createElement("div");
    stage.className = "pr-stage";

    const glow = document.createElement("div");
    glow.className = "pr-glow";
    skirt = document.createElement("div");
    skirt.className = "pr-skirt";
    figureBox = document.createElement("div");
    figureBox.className = "pr-figure";
    itemsBox = document.createElement("div");
    itemsBox.className = "pr-items";

    stage.appendChild(glow);
    stage.appendChild(skirt);
    stage.appendChild(figureBox);
    stage.appendChild(itemsBox);
    root.appendChild(stage);
    ctx.layer.appendChild(root);

    swapFigure("👧", "princess.girl");
    ctx.fx.preload(ITEMS.concat(PETALS));
  },

  unmount() {
    root.remove();
    root = stage = figureBox = itemsBox = skirt = null;
    items = [];
  },

  build(goal) {
    itemsBox.innerHTML = "";
    items = [];
    // まわりを ぐるりと 囲むように 置く。上から 時計まわり
    for (let i = 0; i < goal; i++) {
      const el = document.createElement("div");
      el.className = "pr-item";
      el.textContent = ITEMS[i % ITEMS.length];
      const a = -Math.PI / 2 + (i / goal) * Math.PI * 2;
      el.style.left = 50 + Math.cos(a) * 42 + "%";
      el.style.top = 50 + Math.sin(a) * 38 + "%";
      itemsBox.appendChild(el);
      items.push(el);
    }
    // ステージの高さ(190px) + 下の すきま(10px) + よゆう。
    // ここが せまいと 「たべた！」ボタンと ボードが かさなる
    ctx.setDeck(226);
  },

  progress(filled) {
    items.forEach((el, i) => el.classList.toggle("on", i < filled));
  },

  bite(filled) {
    const el = items[filled - 1];
    ctx.sound.chime(filled - 1);
    ctx.sound.tone(1318, { at: 0.05, dur: 0.5, vol: 0.09, type: "sine" });
    if (!el || ctx.reduceMotion) return;
    el.classList.add("pop");
    ctx.later(() => el.classList.remove("pop"), 520);
    const r = el.getBoundingClientRect();
    ctx.fx.burst(r.left + r.width / 2, r.top + r.height / 2, 12, ["✨", "💖", "🌸"]);
  },

  celebrate(goal, done) {
    ctx.later(() => {
      ctx.shout.say("ドレスアップ かんせい！");
      ctx.sound.fanfare();
      ctx.speech.speak("ぜんぶ たべられたね、すごい！");
    }, 500);

    // まんなかへ 進み出る
    ctx.later(() => {
      stage.classList.add("rise");
      ctx.sound.whoosh();
    }, 1400);

    // 身につけたものが ぐるりと まわる
    ctx.later(() => {
      if (!ctx.reduceMotion) itemsBox.classList.add("orbit");
    }, 2100);

    // へんしん
    ctx.later(() => {
      swapFigure("👸", "princess.crowned");
      stage.classList.add("shine");
      skirt.classList.add("bloom");
      figureBox.classList.add("pop");
      ctx.screen.flash();
      ctx.sound.sparkle();

      const r = figureBox.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      ctx.fx.blast(cx, cy, ctx.reduceMotion ? 10 : 34, { speed: 7.5, jitter: 0.2, decay: 0.016 });
      ctx.fx.burst(cx, cy, ctx.reduceMotion ? 8 : 24, PETALS);
    }, 2700);

    ctx.later(() => {
      ctx.shout.say("おひめさま へんしん！");
      ctx.speech.speak("おひめさまに へんしん！ すてきだね");
    }, 3400);

    // 花びらが ふりそそぐ
    if (!ctx.reduceMotion) {
      ctx.every(() => {
        ctx.fx.drift(
          window.innerWidth * (0.1 + Math.random() * 0.8),
          window.innerHeight * (0.16 + Math.random() * 0.2),
          3, PETALS
        );
      }, 220, 2400);
      [0, 700, 1400].forEach((d) =>
        ctx.later(() => {
          ctx.sound.tone(1568, { dur: 0.6, vol: 0.09, type: "sine" });
          ctx.fx.burst(
            window.innerWidth * (0.2 + Math.random() * 0.6),
            window.innerHeight * (0.2 + Math.random() * 0.3), 14, PETALS
          );
        }, 3800 + d));
    }

    ctx.later(() => {
      ctx.shout.say("また あしたも たべようね");
      done();
    }, 6400);
  },

  reset() {
    stage.classList.remove("rise", "shine");
    skirt.classList.remove("bloom");
    figureBox.classList.remove("pop");
    itemsBox.classList.remove("orbit");
    swapFigure("👧", "princess.girl");
  },
};
