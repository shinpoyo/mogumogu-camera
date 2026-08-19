/**
 * カメラの出し入れだけを担当する。映像を見て判断するのは motion.js。
 *
 * 流すイベント
 *   camera:start {facing}
 *   camera:error {message}
 */
export function createCamera(bus, video) {
  let stream = null;
  let facing = "user";

  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      bus.emit("camera:error", {
        message: "このブラウザは カメラに対応していません。Safari または Chrome の最新版でひらいてください。",
      });
      return false;
    }
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      video.srcObject = stream;
      video.classList.toggle("mirror", facing === "user");
      await video.play();
      bus.emit("camera:start", { facing });
      return true;
    } catch (e) {
      const name = (e && e.name) || "不明";
      bus.emit("camera:error", {
        message: name === "NotAllowedError"
          ? "カメラの きょかが 必要です。ブラウザの設定でカメラを「許可」にしてから もういちど おためしください。"
          : `カメラを ひらけませんでした（${name}）。ほかのアプリがカメラを使っていないか ご確認ください。`,
      });
      return false;
    }
  }

  return {
    start,
    flip() {
      facing = facing === "user" ? "environment" : "user";
      return start();
    },
    stop() {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
    },
    get facing() { return facing; },
  };
}
