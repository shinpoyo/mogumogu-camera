# もぐもぐカメラ 開発ルール

子どもが手に持つ端末で動かすアプリです。演出が重いと、いちばん盛り上がる場面で
カクついて台無しになります。以下は 2026-08-18 に実際に起きた不具合と、
その計測から導いたルールです。

## 何が起きたか（再発防止の根拠）

ロケット発射後に処理が重くなった。原因は2つで、どちらも単独では直らない量でした。

| 条件（375×812・デスクトップ実測） | 1フレーム |
|---|---|
| 修正前・発射直後 1244個 | **38.45ms**（26fps） |
| スプライト化のみ | 9.86ms |
| 個数削減のみ 340個 | 13.39ms |
| 両方（修正後） | **3.19ms** |

内訳を切り分けると、**絵文字400個で28.0ms**、**火花800個で17.6ms**。
どちらも「1粒ごとに毎フレーム、重いCanvas APIを呼んでいた」のが正体でした。

- `ctx.font = size+"px serif"` の代入とその直後の `fillText`
  （フォント解決と絵文字のカラーグリフのラスタライズが毎回走る）
- `ctx.createRadialGradient()` でグラデーションを毎粒毎フレーム生成

デスクトップでこの数字なので、実機のスマホはこの3〜5倍かかります。

## ルール

### 1. 毎フレームの処理で「作る」ものを増やさない

1粒・1要素ごとのループの中で、以下を呼んではいけません。
起動時に一度だけ小さなキャンバスへ絵柄を焼き（スプライト）、
毎フレームは `drawImage` で貼るだけにします。

- `createRadialGradient` / `createLinearGradient` / `createPattern`
- `ctx.font` への代入、`fillText`、`measureText`
- `document.createElement`、配列やオブジェクトの新規生成
- `getBoundingClientRect`（レイアウトが同期で走る）

### 2. 同時に生きる粒には必ず上限を置く

`MAX_PARTS`（現在460）で頭打ちにし、超えたら古いものから捨てます。
捨てるときは `slice` で新しい配列を作らず `splice` で詰めます。
「エミッタを足したぶんだけ増える」構造にしないこと。

### 3. 種類ごとにまとめて描く

`globalCompositeOperation` の切り替えは1フレームに2回まで。
`save()` / `restore()` を1粒ごとに呼ばない（`globalAlpha` と
`setTransform` の直接操作で足ります）。

### 4. 重い端末では自動で減らす

描画ループでフレーム時間をならして見張り、26msを超えたら `fxScale` を下げ、
19msを下回ったらゆっくり戻します。粒の生成数はすべて `amount(n)` を通します。
タブ復帰などの大きな飛び（100ms超）は計測に混ぜないこと。

### 5. setInterval のエミッタは必ず止める

発射中の噴射のように くり返し撒くものは、必ず `ctx.every(fn, ms, total)` を
使います。停止タイマーが同時に仕込まれ、リセットとテーマ切り替えの
両方から `clearTimers()` で止まります。生の `setInterval` は使わないこと。
止め忘れると画面外で撒き続けます。

同じ理由で、テーマの中の遅延実行は `setTimeout` ではなく
`ctx.later(fn, ms)` を使います。

### 6. CSS アニメーションは transform と opacity だけ

`filter` / `blur` / `box-shadow` / `width` / `height` を
アニメーションさせない（毎フレームの再描画になります）。
全画面要素のシェイクは、映像を含む階層に当たるので必要な区間だけにします。

### 7. `prefers-reduced-motion` の分岐を必ず用意する

シェイク・フラッシュ・点滅は止め、粒の数も減らします。

## 演出を追加・変更したときの確認手順

**見た目で判断しない。必ず数字を出す。** 受け入れ基準は
「デスクトップ実測で p95 8ms 未満／最大 16.7ms 未満、予算超過フレーム0」。
実機はこの3〜5倍かかるため、デスクトップで余裕がないものは実機で破綻します。

ローカルサーバで開き、開発者コンソールで以下を実行します。

```js
// 1) rAF をタイマーに差し替え、1フレームの実処理時間を記録する
window.__ft = []; let t = 0;
window.requestAnimationFrame = (cb) => setTimeout(() => {
  t += 16; const a = performance.now(); cb(t); window.__ft.push(performance.now() - a);
}, 16);

// 2) いちばん重い場面を通す（例: ロケットで完食 → 発射 → 花火）
window.__mogu.setTheme("rocket");
window.__mogu.setGoal(3);
for (let i = 0; i < 3; i++) window.__mogu.onBite();

// 3) 12秒ほど待ってから集計する（花火まで含めるため）
const s = [...window.__ft].sort((a, b) => a - b);
({ 平均: window.__ft.reduce((a, b) => a + b, 0) / window.__ft.length,
   p95: s[Math.floor(s.length * .95)], 最大: Math.max(...window.__ft),
   予算超過: window.__ft.filter(v => v > 16.7).length,
   粒: window.__mogu.parts, fxScale: window.__mogu.fxScale });
```

`window.__mogu` は診断用の窓口です（`parts` / `fxScale` / `frameMs` /
`theme` / `setTheme` / `setGoal` / `setRingSize` / `onBite` /
`burst` / `spark` / `blast`）。

**テーマを増やしたら、そのテーマでも必ず測ること。** お祝いの演出は
テーマごとに違うので、ロケットで足りていても別テーマで破綻しうる。

## 計測メモ

- ブラウザのプレビューペインが非表示だと `requestAnimationFrame` と
  CSS アニメーションのタイムラインが停止します。上の差し替えが必要な理由です。
- 背景タブでは `setTimeout` も間引かれます。長時間の観測結果は割り引いて見ること。
- キャンバスのサイズが既定の 300×150 のままだと塗り面積が小さく、
  実際より速い数字が出ます。計測前に全画面サイズにすること。
- ブラウザの HTTP キャッシュで、編集したはずのモジュールが古いまま
  配信されることがあります。直したのに直らないときは、別ポートで開くか
  タブを開き直して確認すること（実際にこれで30分溶かした）。
