/**
 * 差し替えたいものを、ここ1か所にまとめてある。
 * コードを読まなくても、このファイルだけ見れば入れ替えられるようにするのが狙い。
 */

export const config = {
  /**
   * 画像の差し替え。
   *
   * null のあいだは絵文字で代用する。画像を使いたいときは
   * assets/ フォルダにファイルを置いて、パスを書くだけでよい。
   *
   *   "patrol.hero": "./assets/hero.png"
   *
   * 正方形に近い PNG（背景が透明なもの）が向いている。
   * 目安は 256x256 くらい。大きすぎると読み込みが遅くなる。
   *
   * ※ 既存のキャラクターの画像を使う場合は、ご家庭など私的な範囲にとどめ、
   *   このリポジトリには入れないでください（assets/ は .gitignore してある）。
   */
  assets: {
    "patrol.hero": null,        // パトロールに出かける主役
    "princess.girl": null,      // おひめさま（へんしん前）
    "princess.crowned": null,   // おひめさま（へんしん後）
    "rocket.ship": null,        // ロケット
  },

  /** おべんとうに入るおかず。テーマ bento と、ひとくちの粒に使う */
  okazu: ["🍙", "🥚", "🥦", "🍅", "🍤", "🍓"],

  /** ひとくちごとのほめ言葉 */
  praise: ["もぐもぐ！", "すごい！", "やったね！", "じょうず！", "いいね！", "ナイス！"],

  /** ひとくちごとの読み上げ */
  voiceLines: [
    "もぐもぐ、じょうず！",
    "すごいね！",
    "おいしそう！",
    "もうひとくち いけるかな",
    "ナイスもぐもぐ！",
  ],
};

/** 画像パスを取り出す。設定されていなければ null */
export function asset(key) {
  return config.assets[key] || null;
}

/**
 * 画像があれば <img>、なければ絵文字の <span> を返す。
 * テーマはこれを使うかぎり、画像の有無を気にしなくてよい。
 */
export function figure(key, fallbackEmoji, className = "") {
  const src = asset(key);
  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.className = className;
    img.decoding = "async";
    return img;
  }
  const span = document.createElement("span");
  span.textContent = fallbackEmoji;
  span.className = className;
  return span;
}
