// lib/workers/cameraWorker.ts
declare const self: DedicatedWorkerGlobalScope;
export {};

type MsgConnect = { type: "connect"; canvas?: OffscreenCanvas };
type MsgResize = { type: "resize"; width: number; height: number };
type MsgProcess = {
  type: "process";
  mode: "none" | "grayscale" | "blur" | "canny";
  bitmap?: ImageBitmap;
};
type MsgDetect = { type: "detect"; bitmap: ImageBitmap };
type Msg = MsgConnect | MsgResize | MsgProcess | MsgDetect;

let cvReady = false;
let loadOnce: Promise<void> | null = null;

// aponta para /public/libs/opencv/*
(self as any).Module = {
  wasmBinaryFile: "/libs/opencv/opencv_js.wasm",
  locateFile: (p: string) =>
    p.endsWith(".wasm") ? "/libs/opencv/opencv_js.wasm" : "/libs/opencv/" + p,
};

async function ensureOpenCV(): Promise<void> {
  if (cvReady) return;
  if (loadOnce) return loadOnce;

  loadOnce = (async () => {
    (self as any).importScripts("/libs/opencv/opencv.js");
    let cv: any = (self as any).cv;
    if (!cv) throw new Error("cv not available");

    if (typeof cv === "function") {
      // build factory: precisa wasmBinary
      const wasm = await fetch("/libs/opencv/opencv_js.wasm").then((r) =>
        r.arrayBuffer()
      );
      cv = cv({ wasmBinary: wasm });
      (self as any).cv = cv;
    } else if (cv.ready && typeof cv.ready.then === "function") {
      await cv.ready;
    } else if (typeof cv.onRuntimeInitialized === "function") {
      await new Promise<void>((res) => {
        cv.onRuntimeInitialized = () => res();
      });
    }

    cvReady = true;
    self.postMessage({ type: "cv:ready" });
  })();

  return loadOnce;
}

// util: ImageBitmap → ImageData
function bitmapToImageData(bmp: ImageBitmap): ImageData {
  const w = bmp.width,
    h = bmp.height;
  const off = new OffscreenCanvas(w, h);
  const ctx = off.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// carregar arquivos Haar para o FS virtual do OpenCV
let cascadesLoaded = false;
async function ensureCascades() {
  if (cascadesLoaded) return;
  const cv: any = (self as any).cv;

  // baixa XMLs
  const [faceBuf, eyeBuf] = await Promise.all([
    fetch("/libs/cascades/haarcascade_frontalface_default.xml").then((r) =>
      r.arrayBuffer()
    ),
    fetch("/libs/cascades/haarcascade_eye.xml").then((r) => r.arrayBuffer()),
  ]);

  // escreve no FS do OpenCV (namespace /)
  cv.FS_createDataFile(
    "/",
    "haarcascade_frontalface_default.xml",
    new Uint8Array(faceBuf),
    true,
    false
  );
  cv.FS_createDataFile(
    "/",
    "haarcascade_eye.xml",
    new Uint8Array(eyeBuf),
    true,
    false
  );

  cascadesLoaded = true;
}

// detecção de rosto/olhos
function detectFaceAndEyes(img: ImageData) {
  const cv: any = (self as any).cv;

  const src = new cv.Mat(img.height, img.width, cv.CV_8UC4);
  src.data.set(img.data);

  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.equalizeHist(gray, gray);

  const faceCascade = new cv.CascadeClassifier();
  const eyeCascade = new cv.CascadeClassifier();
  faceCascade.load("haarcascade_frontalface_default.xml");
  eyeCascade.load("haarcascade_eye.xml");

  const faces = new cv.RectVector();
  const eyes = new cv.RectVector();

  // detecta rostos
  faceCascade.detectMultiScale(gray, faces, 1.1, 4, 0, new cv.Size(60, 60));

  const result: {
    faces: Array<{ face: any; eyes?: any[] }>;
    width: number;
    height: number;
  } = {
    faces: [],
    width: img.width,
    height: img.height,
  };

  for (let i = 0; i < faces.size(); i++) {
    const face = faces.get(i);
    const roiGray = gray.roi(face);

    // detecta olhos dentro da ROI do rosto (opcional)
    eyeCascade.detectMultiScale(roiGray, eyes, 1.1, 3, 0, new cv.Size(20, 20));
    const eyesArr = [];
    for (let j = 0; j < eyes.size(); j++) {
      const e = eyes.get(j);
      eyesArr.push({
        x: e.x + face.x,
        y: e.y + face.y,
        width: e.width,
        height: e.height,
      });
    }

    result.faces.push({
      face: { x: face.x, y: face.y, width: face.width, height: face.height },
      eyes: eyesArr.length ? eyesArr : undefined,
    });

    roiGray.delete();
  }

  // cleanup
  faces.delete();
  eyes.delete();
  faceCascade.delete();
  eyeCascade.delete();
  gray.delete();
  src.delete();

  return result;
}

// ---------------- mensagens ----------------
self.onmessage = async (ev: MessageEvent<Msg>) => {
  const msg = ev.data;

  if (msg.type === "connect") {
    ensureOpenCV().catch((e) =>
      self.postMessage({ type: "cv:error", error: String(e) })
    );
    self.postMessage({ type: "ready" });
    return;
  }

  if (msg.type === "detect") {
    console.log("detect");
    try {
      await ensureOpenCV();
      await ensureCascades();

      const img = bitmapToImageData(msg.bitmap);
      msg.bitmap.close?.();
      console.log("img");
      const payload = detectFaceAndEyes(img);
      console.log("payload", payload);
      self.postMessage({ type: "detect:ok", payload });
    } catch (e: any) {
      self.postMessage({ type: "error", error: String(e?.message || e) });
    }
    return;
  }

  // (Se você já tinha modos de processamento contínuo, eles podem continuar aqui)
  if (msg.type === "resize" || msg.type === "process") {
    // ignorado neste MVP de uma página (detecção sob demanda)
  }
};
