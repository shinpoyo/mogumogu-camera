/**
 * パトロール。ひとくちごとにランプが灯り、全部そろうと主役が
 * まんなかへ出てきて、画面を横切ってパトロールに出発する。
 *
 * 主役の絵は config.js の "patrol.hero" で差し替えられる。
 * 未設定なら絵文字で代用するので、画像がなくても動く。
 */
const TRAIL = ["💨", "✨", "⭐"];

let ctx = null;
let root = null;
let lampsBox = null;
let heroBox = null;
let go = null;
let goInner = null;
let lamps = [];

export default {
  id: "patrol",
  label: "パトロール",
  lead: "カメラに うつった おくちが うごくと<br>ランプが ひとつずつ つきます。<br>ぜんぶ ついたら パトロールに しゅっぱつ！",

  mount(c) {
    ctx = c;

    root = document.createElement("div");
    root.className = "tm-patrol";
    lampsBox = document.createElement("div");
    lampsBox.className = "pt-lamps";
    heroBox = document.createElement("div");
    heroBox.className = "pt-hero";
    heroBox.appendChild(ctx.figure("patrol.hero", "🦸", "pt-img"));
    root.appendChild(lampsBox);
    root.appendChild(heroBox);

    // 出発するときの大きい主役。位置決めと動きの箱を分ける
    go = document.createElement("div");
    go.className = "tm-patrol-go";
    goInner = document.createElement("div");
    goInner.className = "pt-goinner";
    goInner.appendChild(ctx.figure("patrol.hero", "🦸", "pt-goimg"));
    go.appendChild(goInner);

    ctx.layer.appendChild(root);
    ctx.layer.appendChild(go);
    ctx.fx.preload(TRAIL);
  },

  unmount() {
    root.remove(); go.remove();
    root = go = goInner = lampsBox = heroBox = null;
    lamps = [];
  },

  build(goal) {
    lampsBox.innerHTML = "";
    lamps = [];
    for (let i = 0; i < goal; i++) {
      const l = document.createElement("div");
      l.className = "pt-lamp";
      lampsBox.appendChild(l);
      lamps.push(l);
    }
    lampsBox.style.height = Math.min(190, Math.max(112, goal * 16)) + "px";
    ctx.setDeck(0);
  },

  progress(filled) {
    lamps.forEach((l, i) => l.classList.toggle("on", i < filled));
  },

  bite(filled, goal) {
    ctx.sound.chime(filled - 1);
    ctx.sound.tone(320 + (filled / goal) * 220, { dur: 0.22, vol: 0.1, type: "square" });
    if (ctx.reduceMotion) return;
    heroBox.classList.add("bump");
    ctx.later(() => heroBox.classList.remove("bump"), 380);
  },

  celebrate(goal, done) {
    ctx.later(() => {
      ctx.shout.say("じゅんび かんりょう！");
      ctx.sound.fanfare();
      ctx.speech.speak("ぜんぶ たべられたね、すごい！");
    }, 500);

    // ランプが 赤青に 切りかわる
    ctx.later(() => {
      lampsBox.classList.add("alert");
      ctx.sound.siren(3);
    }, 1300);

    // まんなかへ 出てくる
    ctx.later(() => {
      heroBox.classList.add("gone");
      go.classList.add("on");
      goInner.classList.remove("dash");
      void goInner.offsetWidth;
      goInner.classList.add("arrive");
      ctx.sound.whoosh();
    }, 2000);

    ctx.later(() => {
      ctx.shout.say("パトロール しゅっぱつ！");
      ctx.speech.speak("パトロールに しゅっぱつ！");
      ctx.sound.siren(4);
    }, 2900);

    // 画面を 横切って かけぬける
    ctx.later(() => {
      goInner.classList.remove("arrive");
      void goInner.offsetWidth;
      goInner.classList.add("dash");
      ctx.screen.shake(1200, false);

      ctx.every(() => {
        const r = goInner.getBoundingClientRect();
        if (r.left > window.innerWidth + 80) return;
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        // うしろに ひく 光のすじ
        ctx.fx.blast(x, y, ctx.reduceMotion ? 2 : 5, { speed: 3.2, jitter: 0.7, grav: 0.02, decay: 0.03 });
        if (Math.random() < 0.4) ctx.fx.burst(x, y, 3, TRAIL);
      }, 50, 1700);
    }, 3500);

    // 見送りの ほし
    if (!ctx.reduceMotion) {
      for (let i = 0; i < 5; i++) {
        ctx.later(() => ctx.fx.burst(
          window.innerWidth * (0.15 + Math.random() * 0.7),
          window.innerHeight * (0.15 + Math.random() * 0.4), 16, ["⭐", "✨", "🎉"]
        ), 4600 + i * 260);
      }
    }

    ctx.later(() => {
      lampsBox.classList.remove("alert");
      ctx.shout.say("また あしたも たべようね");
      done();
    }, 6300);
  },

  reset() {
    go.classList.remove("on");
    goInner.classList.remove("arrive", "dash");
    heroBox.classList.remove("gone", "bump");
    lampsBox.classList.remove("alert");
  },
};
