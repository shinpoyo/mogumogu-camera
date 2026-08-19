/**
 * 設定パネル。項目の一覧（SETTINGS）から DOM を組み立てる。
 *
 * 設定を増やすときは core/store.js に既定値と検証を足し、
 * ここの SETTINGS に1行足すだけでよい。個別の配線は書かない。
 *
 *   type: "select" | "range" | "toggle"
 *   live: range で true なら動かすたび反映。false なら指を離したときだけ
 */
export const SETTINGS = [
  { key: "theme", type: "select", label: "えんしゅつ" },
  { key: "goal", type: "range", label: "なんくちで かんせい", min: 2, max: 12, step: 1, live: false },
  { key: "detect", type: "toggle", label: "うごきを みる" },
  { key: "sens", type: "range", label: "はんのう しやすさ", min: 1, max: 10, step: 1, live: true },
  { key: "ringSize", type: "range", label: "わっかの おおきさ", min: 14, max: 60, step: 1, live: true },
  { key: "sound", type: "toggle", label: "おと" },
  { key: "voice", type: "toggle", label: "ほめる こえ" },
];

const HINT = `かってに はんのうしすぎる ときは「うごきを みる」を オフにして、
みぎしたの「たべた！」を おうちのひとが タップしてください。
オンのままなら「はんのう しやすさ」を さげるか、わっかを ちいさくすると おちつきます。
わっかは ドラッグで いどう、2ほんゆび（パソコンは ホイール）で おおきさが かわります。`;

export function createPanel(bus, el, store, { themeOptions, onBite, onReset }) {
  const rows = new Map();

  function row(label, forId) {
    const div = document.createElement("div");
    div.className = "row";
    const l = document.createElement("label");
    l.textContent = label;
    l.htmlFor = forId;
    div.appendChild(l);
    return div;
  }

  for (const spec of SETTINGS) {
    const id = "set-" + spec.key;
    const div = row(spec.label, id);

    if (spec.type === "select") {
      const sel = document.createElement("select");
      sel.id = id;
      for (const opt of themeOptions) {
        const o = document.createElement("option");
        o.value = opt.id;
        o.textContent = opt.label;
        sel.appendChild(o);
      }
      sel.value = store.get(spec.key);
      sel.addEventListener("change", () => store.set(spec.key, sel.value));
      div.appendChild(sel);
      rows.set(spec.key, { input: sel });

    } else if (spec.type === "range") {
      const input = document.createElement("input");
      input.type = "range";
      input.id = id;
      input.min = spec.min;
      input.max = spec.max;
      input.step = spec.step || 1;
      input.value = store.get(spec.key);
      const val = document.createElement("span");
      val.className = "val";
      val.textContent = Math.round(store.get(spec.key));
      // 動かしている間は数字だけ、確定は live の指定にしたがう
      input.addEventListener("input", () => {
        val.textContent = input.value;
        if (spec.live) store.set(spec.key, input.value);
      });
      input.addEventListener("change", () => store.set(spec.key, input.value));
      div.appendChild(input);
      div.appendChild(val);
      rows.set(spec.key, { input, val });

    } else {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.checked = !!store.get(spec.key);
      input.addEventListener("change", () => store.set(spec.key, input.checked));
      div.appendChild(input);
      rows.set(spec.key, { input });
    }
    el.appendChild(div);
  }

  // 手動操作
  const actions = document.createElement("div");
  actions.className = "row";
  const bite = document.createElement("button");
  bite.className = "primary";
  bite.textContent = "いま たべた！";
  bite.addEventListener("click", onBite);
  const reset = document.createElement("button");
  reset.className = "ghost";
  reset.textContent = "さいしょから";
  reset.addEventListener("click", onReset);
  actions.appendChild(bite);
  actions.appendChild(reset);
  el.appendChild(actions);

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = HINT;
  el.appendChild(hint);

  // 外から値が変わったときも表示を合わせる（テーマ側やキーボード操作など）
  bus.on("settings:change", ({ key, value }) => {
    const r = rows.get(key);
    if (!r) return;
    if (r.input.type === "checkbox") r.input.checked = !!value;
    else r.input.value = value;
    if (r.val) r.val.textContent = Math.round(value);
  });

  return {
    toggle() { el.classList.toggle("open"); },
    close() { el.classList.remove("open"); },
    get isOpen() { return el.classList.contains("open"); },
  };
}
