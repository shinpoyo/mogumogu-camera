/**
 * ちいさなイベントバス。
 *
 * モジュール同士は直接呼び合わず、必ずここを通す。
 * こうしておくと、あとから受け手を足しても送り手を触らずに済む。
 */
export function createBus() {
  const handlers = new Map();

  return {
    /** 購読する。戻り値を呼ぶと解除できる */
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type).add(fn);
      return () => handlers.get(type).delete(fn);
    },

    /** 発火する。受け手がいなくてもエラーにしない */
    emit(type, payload) {
      const set = handlers.get(type);
      if (!set) return;
      // 実行中に解除されても壊れないよう、複製してから回す
      for (const fn of [...set]) {
        try {
          fn(payload);
        } catch (e) {
          console.error("[bus] " + type, e);
        }
      }
    },
  };
}
