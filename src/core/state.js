/**
 * すすみぐあいの状態だけを持つ。見た目のことは一切知らない。
 *
 * bites（累計）と filled（いま埋まっている数）を分けているのは、
 * お祝いの最中にひとくち検知が入っても盤面がずれないようにするため。
 * お祝い中は filled を進めず、カウントと歓声だけ返す。
 *
 * 流すイベント
 *   bite      {bites, filled, goal, counted}  ひとくち。counted=false はお祝い中の分
 *   complete  {goal}                          filled が goal に届いた
 *   reset     {}                              盤面を戻した
 *   goal      {goal, filled}                  完了口数が変わった
 */
export function createState(bus, store) {
  let bites = 0;
  let filled = 0;
  let busy = false; // お祝いの最中

  const goal = () => store.get("goal");

  function bite() {
    bites++;
    const counted = !busy;
    if (counted) filled++;
    bus.emit("bite", { bites, filled, goal: goal(), counted });
    if (counted && filled >= goal()) {
      busy = true;
      bus.emit("complete", { goal: goal() });
    }
  }

  function reset() {
    filled = 0;
    busy = false;
    bus.emit("reset", {});
  }

  function resetAll() {
    bites = 0;
    reset();
  }

  /** 完了口数が変わったとき。減らして到達済みならそのままお祝いへ進む */
  function retarget() {
    const g = goal();
    if (filled > g) filled = g;
    bus.emit("goal", { goal: g, filled });
    if (!busy && filled >= g) {
      busy = true;
      bus.emit("complete", { goal: g });
    }
  }

  return {
    bite,
    reset,
    resetAll,
    retarget,
    get bites() { return bites; },
    get filled() { return filled; },
    get goal() { return goal(); },
    get busy() { return busy; },
  };
}
