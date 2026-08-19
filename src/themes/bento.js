/**
 * おべんとう。ひとくちごとにマスがおかずで埋まる、いちばん素直なテーマ。
 */
import { config } from "../config.js";

const OKAZU = config.okazu;

let ctx = null;
let root = null;
let cells = [];

export default {
  id: "bento",
  label: "おべんとう",
  lead: "カメラに うつった おくちが うごくと<br>おべんとうが ひとつずつ うまります。<br>ぜんぶ うまったら おいわいです。",

  mount(c) {
    ctx = c;
    root = document.createElement("div");
    root.className = "tm-bento";
    ctx.layer.appendChild(root);
  },

  unmount() {
    root.remove();
    root = null;
    cells = [];
  },

  build(goal) {
    root.innerHTML = "";
    cells = [];
    // 7マス以上は2段にする。1段に詰めると1マスが小さくなりすぎる
    const cols = goal <= 6 ? goal : Math.ceil(goal / 2);
    root.style.gridTemplateColumns = `repeat(${cols},1fr)`;
    // 列数から横はばを決める。1fr と aspect-ratio だけだと
    // 列が少ないときに1マスが肥大する（口数2で219pxになった）
    root.style.width = `min(92vw,${cols * 76}px)`;
    for (let i = 0; i < goal; i++) {
      const c = document.createElement("div");
      c.className = "bt-cell";
      root.appendChild(c);
      cells.push(c);
    }
    ctx.setDeck(root.getBoundingClientRect().height + 26);
  },

  progress(filled) {
    cells.forEach((c, i) => {
      if (i < filled) {
        c.textContent = OKAZU[i % OKAZU.length];
        c.classList.add("filled");
      } else {
        c.textContent = "";
        c.classList.remove("filled");
      }
    });
  },

  bite(filled) {
    const c = cells[filled - 1];
    if (!c) return;
    c.classList.add("pop");
    ctx.later(() => c.classList.remove("pop"), 520);
    ctx.sound.chime(filled - 1);
  },

  celebrate(goal, done) {
    ctx.later(() => {
      ctx.shout.say("おべんとう かんせい！");
      ctx.sound.fanfare();
      ctx.speech.speak("ぜんぶ たべられたね、すごい！");
    }, 600);

    const times = ctx.reduceMotion ? 2 : 6;
    for (let i = 0; i < times; i++) {
      ctx.later(() => {
        ctx.fx.burst(
          Math.random() * window.innerWidth,
          window.innerHeight * (0.2 + Math.random() * 0.5),
          24, OKAZU.concat(["⭐", "✨", "🎉"])
        );
      }, 700 + i * 160);
    }
    ctx.later(done, 3000);
  },

  reset() {
    this.progress(0);
  },
};
