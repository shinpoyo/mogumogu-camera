/**
 * ロケット。ひとくちごとに燃料がたまり、満タンで画面まんなかから発射する。
 *
 * 中央寄せの transform と演出の transform はぶつかるので、
 * 位置決めの箱と、動かす箱を分けてある（.tm-rocket-big と .rk-stack）。
 */
let ctx = null;
let root = null;
let big = null;
let stack = null;
let bigFlame = null;
let shock = null;
let gauge = null;
let ship = null;
let flame = null;
let segs = [];

export default {
  id: "rocket",
  label: "ロケット",
  lead: "カメラに うつった おくちが うごくと<br>ロケットの ねんりょうが たまります。<br>まんタンに なったら はっしゃ！",

  mount(c) {
    ctx = c;

    root = document.createElement("div");
    root.className = "tm-rocket";
    gauge = document.createElement("div");
    gauge.className = "rk-gauge";
    ship = document.createElement("div");
    ship.className = "rk-ship";
    const body = ctx.figure("rocket.ship", "🚀", "rk-body");
    flame = document.createElement("div");
    flame.className = "rk-flame";
    ship.appendChild(body);
    ship.appendChild(flame);
    root.appendChild(gauge);
    root.appendChild(ship);

    big = document.createElement("div");
    big.className = "tm-rocket-big";
    stack = document.createElement("div");
    stack.className = "rk-stack";
    const bigBody = ctx.figure("rocket.ship", "🚀", "rk-bigbody");
    bigFlame = document.createElement("div");
    bigFlame.className = "rk-bigflame";
    stack.appendChild(bigBody);
    stack.appendChild(bigFlame);
    big.appendChild(stack);

    shock = document.createElement("div");
    shock.className = "rk-shock";

    ctx.layer.appendChild(root);
    ctx.layer.appendChild(shock);
    ctx.layer.appendChild(big);
  },

  unmount() {
    root.remove(); big.remove(); shock.remove();
    root = big = shock = stack = gauge = ship = flame = bigFlame = null;
    segs = [];
  },

  build(goal) {
    gauge.innerHTML = "";
    segs = [];
    for (let i = 0; i < goal; i++) {
      const s = document.createElement("div");
      s.className = "rk-seg";
      gauge.appendChild(s);
      segs.push(s);
    }
    gauge.style.height = Math.min(190, Math.max(112, goal * 16)) + "px";
    ctx.setDeck(0);   // 弁当箱がないので下ぎりぎりでよい
  },

  progress(filled, goal) {
    segs.forEach((s, i) => s.classList.toggle("on", i < filled));
    // ゴールが多くても炎がはみ出さないように、1口ぶんの伸びを割る
    const step = Math.max(3, Math.round(38 / goal));
    flame.style.height = filled ? 8 + filled * step + "px" : "0px";
    flame.classList.toggle("lit", filled > 0 && !ctx.reduceMotion);
    ship.classList.toggle("ready", filled >= goal - 1 && filled < goal && !ctx.reduceMotion);
  },

  bite(filled, goal) {
    ctx.sound.chime(filled - 1);
    ctx.sound.charge(filled / goal);
    if (ctx.reduceMotion) return;
    const r = ship.getBoundingClientRect();
    ctx.fx.spark(r.left + r.width / 2, r.bottom, 7);
  },

  celebrate(goal, done) {
    ship.classList.remove("ready");

    // 衝撃波の輪。少しずらして重ねると厚みが出る
    const ring = (wide) => {
      shock.classList.remove("on", "wide");
      void shock.offsetWidth;
      shock.classList.add("on");
      if (wide) shock.classList.add("wide");
    };

    ctx.later(() => {
      ctx.shout.say("ねんりょう まんタン！");
      ctx.sound.fanfare();
      ctx.speech.speak("ぜんぶ たべられたね、すごい！");
    }, 600);

    // せり上がる
    ctx.later(() => {
      ship.classList.add("gone");
      big.classList.add("on");
      stack.classList.remove("rev", "blast");
      void stack.offsetWidth;
      stack.classList.add("arrive");
      bigFlame.style.height = "26px";
      if (!ctx.reduceMotion) bigFlame.classList.add("lit");
      ctx.sound.whoosh();
    }, 1400);

    // エンジンを ふかす
    ctx.later(() => {
      stack.classList.remove("arrive");
      void stack.offsetWidth;
      if (!ctx.reduceMotion) stack.classList.add("rev");
      ctx.screen.shake(3800, false);
    }, 2100);

    // カウントダウン。ゆっくり数えたほうが「もうすぐだ」が伝わる。
    // 0.6 → 0.9 → 1.2秒おきと、実際に見ながら遅くしてきた値。
    const COUNT_AT = 2400;
    const COUNT_GAP = 1200;
    ["3", "2", "1"].forEach((t, i) => {
      ctx.later(() => {
        ctx.shout.say(t, true);
        ctx.sound.beep(520 + i * 110);
        bigFlame.style.height = 40 + i * 22 + "px";
        if (!ctx.reduceMotion) {
          const r = bigFlame.getBoundingClientRect();
          ctx.fx.spark(r.left + r.width / 2, r.bottom, 8 + i * 5);
          // 数えるたびに足元がひかる
          ctx.screen.shake(500, i === 2);
        }
      }, COUNT_AT + i * COUNT_GAP);
    });

    // ドカーン
    const LAUNCH = COUNT_AT + 3 * COUNT_GAP + 200;   // 「1」の 1.4秒あと
    ctx.later(() => {
      ctx.shout.say("はっしゃ！");
      ctx.speech.speak("ロケット、はっしゃ！");
      stack.classList.remove("rev");
      void stack.offsetWidth;
      stack.classList.add("blast");
      bigFlame.style.height = "110px";
      ctx.screen.flash();
      ctx.screen.shake(2200, true);
      ctx.sound.rumble(2.6);
      ctx.sound.boom(0.34);

      const r0 = bigFlame.getBoundingClientRect();
      const bx = r0.left + r0.width / 2;
      const by = r0.bottom;

      // 足元の爆発。輪になって飛び散る火花＋煙
      ctx.fx.blast(bx, by, ctx.reduceMotion ? 12 : 52, { speed: 11, grav: 0.12 });
      ctx.fx.smoke(bx, by, ctx.reduceMotion ? 6 : 26);
      // 衝撃波を少しずらして2枚重ねる
      [0, 220].forEach((d, i) => ctx.later(() => ring(i === 1), d));

      ctx.every(() => {
        const r = bigFlame.getBoundingClientRect();
        if (r.bottom < -60) return;
        ctx.fx.spark(r.left + r.width / 2, r.bottom, ctx.reduceMotion ? 3 : 9);
      }, 55, 1900);
    }, LAUNCH);

    // 花火のフィナーレ。ロケットが上がりきったころに空へ打ち上がる
    const SHOW = LAUNCH + 1500;
    const shells = ctx.reduceMotion ? 2 : 7;
    for (let i = 0; i < shells; i++) {
      ctx.later(() => {
        const x = window.innerWidth * (0.15 + Math.random() * 0.7);
        const y = window.innerHeight * (0.12 + Math.random() * 0.34);
        const hue = (Math.random() * 6) | 0;
        ctx.sound.pop(0.13 + Math.random() * 0.06);
        // まるい輪と、その内側の細かい火花で「開いた」感じを出す
        ctx.fx.blast(x, y, 30, { speed: 8.5, jitter: 0.12, hue, decay: 0.015 });
        ctx.fx.blast(x, y, 16, { speed: 4.5, jitter: 0.6, decay: 0.026 });
        ctx.fx.burst(x, y, 10, ["✨", "⭐", "💫"]);
        if (i % 3 === 2) ctx.sound.crackle(0.8);
      }, SHOW + i * 320);
    }

    ctx.later(() => {
      ctx.shout.say("また あしたも たべようね");
      done();
    }, SHOW + shells * 320 + 900);
  },

  reset() {
    big.classList.remove("on");
    stack.classList.remove("arrive", "rev", "blast");
    bigFlame.classList.remove("lit");
    bigFlame.style.height = "0px";
    ship.classList.remove("gone", "ready");
    shock.classList.remove("on");
    this.progress(0, 6);
  },

};
