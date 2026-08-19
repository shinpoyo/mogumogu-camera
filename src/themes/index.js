/**
 * えんしゅつ（テーマ）の登録簿。
 *
 * ── テーマが約束すること ────────────────────────────────
 *   id      文字列。保存される識別子
 *   label   設定パネルに出す名前
 *   lead    開始画面の説明（任意）
 *   mount(ctx)             ctx.layer の中に自分の DOM を作る
 *   unmount()              片付ける
 *   build(goal)            完了口数に合わせて組み直す
 *   progress(filled, goal) すすみぐあいを見た目に反映する
 *   bite(filled, goal)     ひとくちごとの小さな演出（任意）
 *   celebrate(goal, done)  お祝い。終わったら done() を呼ぶ
 *   reset()                盤面を戻す
 *
 * ── テーマに渡される ctx ────────────────────────────────
 *   layer        自分用の DOM の置き場所
 *   fx           パーティクル（burst / spark / smoke / drift）
 *   sound        音（tone / noise / chime / siren / sparkle …）
 *   speech       読み上げ
 *   shout        画面まんなかの文字
 *   screen       flash / shake
 *   later(fn,ms) あとで実行。reset のとき自動で取り消される
 *   every(fn,ms,total) くり返し。止めるのを忘れられない形にしてある
 *   reduceMotion 動きを控える設定か
 *   figure(key, emoji, class) 画像か絵文字の要素を作る
 *   setDeck(px)  画面の下にこれだけ場所がほしい、と申告する
 *
 * テーマを増やすときは、ファイルを作って下の配列に足すだけでよい。
 * ほかのモジュールは一切さわらなくてよい。
 */
import bento from "./bento.js";
import rocket from "./rocket.js";
import princess from "./princess.js";
import patrol from "./patrol.js";

export const themes = [rocket, bento, princess, patrol];

export const themeOptions = themes.map((t) => ({ id: t.id, label: t.label }));

export function getTheme(id) {
  return themes.find((t) => t.id === id) || themes[0];
}
