declare const self: DedicatedWorkerGlobalScope;
export {};

export type GuidelineLevel = 'BAD' | 'OK' | 'GOOD';

export type OverlayBox = { x: number; y: number; w: number; h: number };

export type GuidanceMsg = {
  level: GuidelineLevel;
  text: string;
  canCapture: boolean;
  face?: OverlayBox;
  leftEye?: OverlayBox;
  rightEye?: OverlayBox;
  mouth?: OverlayBox;
  rollDeg?: number;
  brightness?: number;
  sharpness?: number;
  centerDelta?: { dx: number; dy: number };
  scalePct?: number;
};

export type InitPayload = {
  type: 'init';
  cascadesBase?: string; // default: /libs/cascades
  opencvBase?: string; // default: /libs/opencv
};

export type FramePayload = {
  type: 'frame';
  width: number;
  height: number;
  // ImageData transferred from OffscreenCanvas or main thread
  image: ImageData;
};

let cv: any;

let cvReady = false;
let loadOnce: Promise<void> | null = null;
let faceCascade: any, eyeCascade: any, mouthCascade: any;
let lastFaceCenter: { x: number; y: number } | null = null;
let consecutiveGood = 0;

// thresholds iniciais (ajuste fino depois)
const TH = {
  minSharpness: 100, // variância do Laplaciano
  minBrightness: 90, // média luminância
  maxBrightness: 180,
  maxRollDeg: 10,
  minScalePct: 35, // face ocupa % da largura do frame
  maxScalePct: 55,
  centerTolerancePct: 12, // tolerância do centro (em % do frame)
  motionPxPerFrame: 8,
  goodFramesRequired: 15,
};

// aponta para /public/libs/opencv/*
(self as any).Module = {
  wasmBinaryFile: '/libs/opencv/opencv_js.wasm',
  locateFile: (p: string) => (p.endsWith('.wasm') ? '/libs/opencv/opencv_js.wasm' : '/libs/opencv/' + p),
};

function asGray(matRGBA: any) {
  const gray = new cv.Mat();
  cv.cvtColor(matRGBA, gray, cv.COLOR_RGBA2GRAY);
  cv.equalizeHist(gray, gray);
  return gray;
}

async function loadFileToFS(url: string, fsPath: string) {
  const res = await fetch(url);
  const data = new Uint8Array(await res.arrayBuffer());
  cv.FS_createDataFile('/', fsPath, data, true, false, false);
}

function varianceOfLaplacian(gray: any) {
  const lap = new cv.Mat();
  cv.Laplacian(gray, lap, cv.CV_64F);
  const mean = new cv.Mat();
  const std = new cv.Mat();
  cv.meanStdDev(lap, mean, std);
  const v = Math.pow(std.doubleAt(0, 0), 2);
  lap.delete();
  mean.delete();
  std.delete();
  return v;
}

function meanBrightness(gray: any) {
  const m = cv.mean(gray);
  return m[0]; // 0..255
}

function centerDelta(face: OverlayBox, W: number, H: number) {
  const cx = face.x + face.w / 2;
  const cy = face.y + face.h / 2;
  return { dx: cx - W / 2, dy: cy - H / 2 };
}

function pct(n: number, total: number) {
  return (n / total) * 100;
}

function angleDeg(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  return (ang * 180) / Math.PI;
}

function assess(
  face: OverlayBox | undefined,
  leftEye: OverlayBox | undefined,
  rightEye: OverlayBox | undefined,
  mouth: OverlayBox | undefined,
  W: number,
  H: number,
  sharpness: number,
  brightness: number,
): GuidanceMsg {
  if (!face) return { level: 'BAD', text: 'Aproxime-se e centralize o rosto', canCapture: false };

  // escala
  const scale = pct(face.w, W);

  // centralização
  const { dx, dy } = centerDelta(face, W, H);
  const dxPct = pct(Math.abs(dx), W);
  const dyPct = pct(Math.abs(dy), H);
  const centered = dxPct <= TH.centerTolerancePct && dyPct <= TH.centerTolerancePct;

  // roll (se tiver olhos)
  let rollDeg = 0;
  if (leftEye && rightEye) {
    const cl = { x: leftEye.x + leftEye.w / 2, y: leftEye.y + leftEye.h / 2 };
    const cr = { x: rightEye.x + rightEye.w / 2, y: rightEye.y + rightEye.h / 2 };
    rollDeg = angleDeg(cl, cr);
  }

  // movimento (face center delta entre frames)
  let stable = true;
  const curCenter = { x: face.x + face.w / 2, y: face.y + face.h / 2 };
  if (lastFaceCenter) {
    const dxm = Math.abs(curCenter.x - lastFaceCenter.x);
    const dym = Math.abs(curCenter.y - lastFaceCenter.y);
    if (dxm > TH.motionPxPerFrame || dym > TH.motionPxPerFrame) stable = false;
  }
  lastFaceCenter = curCenter;

  const reasons: string[] = [];

  if (scale < TH.minScalePct) reasons.push('aproxime-se');
  if (scale > TH.maxScalePct) reasons.push('afaste-se');
  if (!centered) {
    if (dx > 0) reasons.push('mova um pouco para a esquerda');
    else if (dx < 0) reasons.push('mova um pouco para a direita');
    if (dy > 0) reasons.push('mova um pouco para cima');
    else if (dy < 0) reasons.push('mova um pouco para baixo');
  }
  if (Math.abs(rollDeg) > TH.maxRollDeg) reasons.push('nívele a cabeça');
  if (sharpness < TH.minSharpness) reasons.push('melhorar nitidez (fique parado / foco)');
  if (brightness < TH.minBrightness) reasons.push('mais luz frontal');
  if (brightness > TH.maxBrightness) reasons.push('muita luz (estouro)');

  const allOk = reasons.length === 0 && stable;

  if (allOk) consecutiveGood++;
  else consecutiveGood = 0;

  const canCapture = consecutiveGood >= TH.goodFramesRequired;

  const level: GuidelineLevel = allOk ? 'GOOD' : reasons.length <= 2 ? 'OK' : 'BAD';

  const text = allOk ? 'Perfeito! Mantenha por um instante…' : reasons.join(' · ');

  return {
    level,
    text,
    canCapture,
    face,
    leftEye,
    rightEye,
    mouth,
    rollDeg,
    brightness,
    sharpness,
    centerDelta: { dx, dy },
    scalePct: scale,
  };
}

async function ensureCV() {
  if (cvReady) return;

  loadOnce = (async () => {
    (self as any).importScripts('/libs/opencv/opencv.js');

    cv = (self as any).cv as any;

    if (!cv) throw new Error('cv not available');

    if (typeof cv === 'function') {
      const wasm = await fetch('/libs/opencv/opencv_js.wasm').then((r) => r.arrayBuffer());

      cv = cv({ wasmBinary: wasm });

      (self as any).cv = cv;
    } else if (cv.ready && typeof cv.ready.then === 'function') {
      await cv.ready;
    } else if (typeof cv.onRuntimeInitialized === 'function') {
      await new Promise<void>((res) => {
        cv.onRuntimeInitialized = () => res();
      });
    }

    cvReady = true;
    self.postMessage({ type: 'cv:ready' });
  })();

  return loadOnce;
}

async function loadCascades(base = '/libs/cascades') {
  await loadFileToFS(`${base}/haarcascade_frontalface_default.xml`, 'haarcascade_frontalface_default.xml');
  await loadFileToFS(`${base}/haarcascade_eye.xml`, 'haarcascade_eye.xml');
  await loadFileToFS(`${base}/haarcascade_smile.xml`, 'haarcascade_smile.xml'); // ok usar smile para boca

  faceCascade = new cv.CascadeClassifier();
  eyeCascade = new cv.CascadeClassifier();
  mouthCascade = new cv.CascadeClassifier();

  if (!faceCascade.load('haarcascade_frontalface_default.xml')) throw new Error('face cascade load fail');
  if (!eyeCascade.load('haarcascade_eye.xml')) throw new Error('eye cascade load fail');
  if (!mouthCascade.load('haarcascade_smile.xml')) throw new Error('mouth cascade load fail');
}

function validImageData(img: ImageData, W: number, H: number) {
  return img && W > 0 && H > 0 && img.data && img.data.byteLength === W * H * 4;
}

function clampRect(x: number, y: number, w: number, h: number, W: number, H: number) {
  const fx = Math.max(0, Math.min(x, W - 1));
  const fy = Math.max(0, Math.min(y, H - 1));
  const fw = Math.max(0, Math.min(w, W - fx));
  const fh = Math.max(0, Math.min(h, H - fy));
  return { x: fx, y: fy, w: fw, h: fh };
}

async function detectFrame(payload: FramePayload): Promise<GuidanceMsg> {
  const { image, width, height } = payload;

  // TODO
  if (!validImageData(image, width, height)) {
    return { level: 'BAD', text: 'Aproxime-se e centralize o rosto', canCapture: false };
  }

  const src = cv.matFromImageData(image); // RGBA
  const gray = asGray(src);

  // detecta face
  const faces = new cv.RectVector();
  const minSize = new cv.Size(Math.round(width * 0.15), Math.round(height * 0.15));
  faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, minSize);

  let faceBox: OverlayBox | undefined;
  let leftEyeBox: OverlayBox | undefined;
  let rightEyeBox: OverlayBox | undefined;
  let mouthBox: OverlayBox | undefined;

  if (faces.size() === 1) {
    const f = faces.get(0);
    faceBox = { x: f.x, y: f.y, w: f.width, h: f.height };

    // ROI do rosto
    const roi = gray.roi(new cv.Rect(f.x, f.y, f.width, f.height));

    // olhos: procurar na metade superior
    const eyes = new cv.RectVector();
    const roiEyes = roi.roi(new cv.Rect(0, 0, roi.cols, Math.max(1, Math.round(roi.rows * 0.55))));
    eyeCascade.detectMultiScale(roiEyes, eyes, 1.15, 3);

    const eyeRects: OverlayBox[] = [];
    for (let i = 0; i < eyes.size(); i++) {
      const e = eyes.get(i);
      eyeRects.push({ x: f.x + e.x, y: f.y + e.y, w: e.width, h: e.height });
    }
    // escolha heurística: dois olhos mais afastados no eixo X
    if (eyeRects.length >= 2) {
      eyeRects.sort((a, b) => a.x - b.x);
      leftEyeBox = eyeRects[0];
      rightEyeBox = eyeRects[eyeRects.length - 1];
    }

    // boca: procurar na metade inferior
    const mouths = new cv.RectVector();
    const roiMouth = roi.roi(new cv.Rect(0, Math.round(roi.rows * 0.45), roi.cols, Math.round(roi.rows * 0.55)));
    mouthCascade.detectMultiScale(roiMouth, mouths, 1.2, 5);
    if (mouths.size() >= 1) {
      const m = mouths.get(0);
      mouthBox = { x: f.x + m.x, y: f.y + Math.round(roi.rows * 0.45) + m.y, w: m.width, h: m.height };
    }

    roiEyes.delete();
    roiMouth.delete();
    eyes.delete();
    mouths.delete();
    roi.delete();
  }

  // métricas
  const sharp = varianceOfLaplacian(gray);
  const bright = meanBrightness(gray);

  const msg = assess(faceBox, leftEyeBox, rightEyeBox, mouthBox, width, height, sharp, bright);

  // cleanup
  faces.delete();
  gray.delete();
  src.delete();

  return msg;
}

let initIsComplete = false;

const ERROR_THROTTLE_MS = 2000;
let lastErrorAt = 0;

self.onmessage = async (e: MessageEvent<InitPayload | FramePayload>) => {
  const msg = e.data;

  try {
    if (msg.type === 'init') {
      console.log('init');

      await ensureCV();
      console.log('>>> CV ready');

      await loadCascades(msg.cascadesBase ?? '/libs/cascades');

      console.log('>>> Cascades loaded');

      (self as any).postMessage({ type: 'ready' });

      initIsComplete = true;
      return;
    }

    if (msg.type === 'frame') {
      if (!initIsComplete) return;

      const result = await detectFrame(msg);

      (self as any).postMessage({ type: 'guidance', payload: result });
      return;
    }
  } catch (err: any) {
    if ((msg as any)?.type === 'frame') {
      // Erros esporádicos por frame (abort numérico do OpenCV) não devem poluir o console
      console.debug('frame-error', err);
      return;
    }

    const now = Date.now();
    const message = err?.message ?? String(err);
    if (now - lastErrorAt > ERROR_THROTTLE_MS) {
      console.error('onmessage-error:', err);
      (self as any).postMessage({ type: 'error', message });
      lastErrorAt = now;
    }
  }
};
