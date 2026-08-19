/**
 * 画面ぜんたいにかかる演出と、真ん中に出す文字。
 * テーマから直接 DOM を触らせないための窓口。
 */
export function createShout(el) {
  return {
    /** big:true で特大表示（カウントダウンなど） */
    say(text, big = false) {
      el.textContent = text;
      el.classList.remove("show", "count");
      void el.offsetWidth;                 // アニメーションをやり直させる
      el.classList.add(big ? "count" : "show");
    },
    clear() {
      el.textContent = "";
      el.classList.remove("show", "count");
    },
  };
}

export function createScreen(stage, flashEl, reduceMotion) {
  let shakeTimer = null;

  return {
    /** 白くひかる */
    flash() {
      if (reduceMotion) return;
      flashEl.classList.remove("on");
      void flashEl.offsetWidth;
      flashEl.classList.add("on");
    },

    /** ゆれる。hard で大きくゆれる。ms 後に自動で止まる */
    shake(ms = 1000, hard = false) {
      if (reduceMotion) return;
      clearTimeout(shakeTimer);
      stage.classList.add("shake");
      stage.classList.toggle("hard", hard);
      shakeTimer = setTimeout(() => stage.classList.remove("shake", "hard"), ms);
    },

    stopShake() {
      clearTimeout(shakeTimer);
      stage.classList.remove("shake", "hard");
    },
  };
}

export function createSpeech(isEnabled) {
  const ok = typeof window !== "undefined" && "speechSynthesis" in window;
  return {
    speak(text) {
      if (!ok || !isEnabled()) return;
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "ja-JP";
        u.rate = 1.05;
        u.pitch = 1.3;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      } catch (e) {
        /* 読み上げが無くても遊びは続く */
      }
    },
  };
}
