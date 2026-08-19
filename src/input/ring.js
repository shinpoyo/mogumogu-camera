/**
 * わっか（検知範囲）の操作。
 *
 * 表示の大きさと検知の広さがずれると「見えている輪の外に反応する」ことになるので、
 * 大きさは CSS 変数 --ring-size に一本化し、検知側の比率は size/200 で導く。
 *
 * 変えかたは4通り: ドラッグ / 2本指ピンチ / ホイール / キーボード
 * 値は store に書き、変わったら settings:change が流れる。
 */
export function createRing(bus, el, store) {
  const pointers = new Map();
  let pinchStart = null;

  function place() {
    el.style.left = store.get("ringX") * 100 + "%";
    el.style.top = store.get("ringY") * 100 + "%";
  }

  function applySize() {
    document.documentElement.style.setProperty("--ring-size", store.get("ringSize") + "vmin");
  }

  function setSize(v) {
    store.set("ringSize", v);
    applySize();
  }

  function dist() {
    const p = [...pointers.values()];
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    el.classList.add("hide-label");
    if (pointers.size === 2) pinchStart = { d: dist(), size: store.get("ringSize") };
  });

  el.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size >= 2) {
      if (!pinchStart) pinchStart = { d: dist(), size: store.get("ringSize") };
      if (pinchStart.d > 8) setSize(pinchStart.size * (dist() / pinchStart.d));
      return;
    }
    store.set("ringX", e.clientX / window.innerWidth);
    store.set("ringY", e.clientY / window.innerHeight);
    place();
  });

  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    setSize(store.get("ringSize") + (e.deltaY < 0 ? 2 : -2));
  }, { passive: false });

  el.addEventListener("keydown", (e) => {
    const step = 0.02;
    const move = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0],
      ArrowUp: [0, -step], ArrowDown: [0, step],
    }[e.key];
    if (move) {
      store.set("ringX", store.get("ringX") + move[0]);
      store.set("ringY", store.get("ringY") + move[1]);
      place();
      e.preventDefault();
      return;
    }
    if (e.key === "+" || e.key === "=") { setSize(store.get("ringSize") + 2); e.preventDefault(); }
    if (e.key === "-" || e.key === "_") { setSize(store.get("ringSize") - 2); e.preventDefault(); }
  });

  // 検知を切ったら、わっかは薄い「てどうモード」表示になる
  bus.on("settings:change", ({ key }) => {
    if (key === "detect") el.classList.toggle("off", !store.get("detect"));
    if (key === "ringSize") applySize();
  });

  return {
    init() {
      applySize();
      place();
      el.classList.toggle("off", !store.get("detect"));
    },
    place,
    /** 検知側が必要とする形（画面比率）で渡す */
    geometry() {
      return {
        x: store.get("ringX"),
        y: store.get("ringY"),
        r: store.get("ringSize") / 200,
        sens: store.get("sens"),
      };
    },
    /** ひとくちのときに波紋を出す */
    pulse() {
      if (!store.get("detect")) return;
      el.classList.remove("hit");
      void el.offsetWidth;
      el.classList.add("hit");
    },
  };
}
