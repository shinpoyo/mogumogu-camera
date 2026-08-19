/**
 * 画面の常設パーツ。上のバッジと、右下の「たべた！」ボタン。
 *
 * ボタンの縦位置は CSS 変数 --deck を基準にする。
 * --deck はテーマが setDeck() で申告した「下に必要な高さ」。
 */
export function createHud(bus, els, { onBite, onFlip, onGear }) {
  const { counter, biteBtn, topbar, start, err } = els;

  biteBtn.addEventListener("click", () => {
    biteBtn.classList.remove("tapped");
    void biteBtn.offsetWidth;
    biteBtn.classList.add("tapped");
    onBite();
  });
  els.flipBtn.addEventListener("click", onFlip);
  els.gearBtn.addEventListener("click", onGear);

  bus.on("bite", ({ bites }) => { counter.textContent = "ひとくち " + bites; });
  bus.on("camera:error", ({ message }) => { err.textContent = message; });
  bus.on("camera:start", () => {
    err.textContent = "";
    start.classList.add("hidden");
    topbar.classList.remove("hidden");
    biteBtn.classList.remove("hidden");
  });

  return {
    resetCounter() { counter.textContent = "ひとくち 0"; },
    /** テーマが必要とする下の余白。0 なら画面の下ぎりぎりまで寄せる */
    setDeck(px) {
      document.documentElement.style.setProperty("--deck", Math.round(Math.max(24, px)) + "px");
    },
  };
}
