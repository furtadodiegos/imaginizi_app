/* eslint-disable @typescript-eslint/no-explicit-any */
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
  cascadesBase?: string;
  opencvBase?: string;
};

export type FramePayload = {
  type: 'frame';
  width: number;
  height: number;
  image: ImageData;
};

let cv: any;

let cvReady = false;
let loadOnce: Promise<void> | null = null;
let faceCascade: any, eyeCascade: any, mouthCascade: any;
let lastFaceCenter: { x: number; y: number } | null = null;
let consecutiveGood = 0;

const TH = {
  minSharpness: 100,
  minBrightness: 90,
  maxBrightness: 180,
  maxRollDeg: 10,
  minScalePct: 35,
  maxScalePct: 55,
  centerTolerancePct: 12,
  motionPxPerFrame: 8,
  goodFramesRequired: 15,
};

const WASM_BINARY_FILE = '/libs/opencv/opencv_js.wasm';

(self as any).Module = {
  wasmBinaryFile: WASM_BINARY_FILE,
  locateFile: (p: string) => (p.endsWith('.wasm') ? WASM_BINARY_FILE : '/libs/opencv/' + p),
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

  return m[0];
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

function handleReasons(
  scale: number,
  centered: boolean,
  dx: number,
  dy: number,
  rollDeg: number,
  sharpness: number,
  brightness: number,
) {
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

  return reasons;
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

  const scale = pct(face.w, W);

  const { dx, dy } = centerDelta(face, W, H);
  const dxPct = pct(Math.abs(dx), W);
  const dyPct = pct(Math.abs(dy), H);
  const centered = dxPct <= TH.centerTolerancePct && dyPct <= TH.centerTolerancePct;

  let rollDeg = 0;
  if (leftEye && rightEye) {
    const cl = { x: leftEye.x + leftEye.w / 2, y: leftEye.y + leftEye.h / 2 };
    const cr = { x: rightEye.x + rightEye.w / 2, y: rightEye.y + rightEye.h / 2 };
    rollDeg = angleDeg(cl, cr);
  }

  let stable = true;
  const curCenter = { x: face.x + face.w / 2, y: face.y + face.h / 2 };
  if (lastFaceCenter) {
    const dxm = Math.abs(curCenter.x - lastFaceCenter.x);
    const dym = Math.abs(curCenter.y - lastFaceCenter.y);
    if (dxm > TH.motionPxPerFrame || dym > TH.motionPxPerFrame) stable = false;
  }
  lastFaceCenter = curCenter;

  const reasons = handleReasons(scale, centered, dx, dy, rollDeg, sharpness, brightness);

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
      const wasm = await fetch(WASM_BINARY_FILE).then((r) => r.arrayBuffer());

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

function handleFaceDetection(props: any) {
  props.faces = new cv.RectVector();
  const minSize = new cv.Size(Math.round(props.width * 0.15), Math.round(props.height * 0.15));
  faceCascade.detectMultiScale(props.gray, props.faces, 1.1, 3, 0, minSize);

  let faceBox: OverlayBox | undefined;
  let leftEyeBox: OverlayBox | undefined;
  let rightEyeBox: OverlayBox | undefined;
  let mouthBox: OverlayBox | undefined;

  if (props.faces.size() === 1) {
    const f = props.faces.get(0);
    faceBox = { x: f.x, y: f.y, w: f.width, h: f.height };

    props.roi = props.gray.roi(new cv.Rect(f.x, f.y, f.width, f.height));

    props.eyes = new cv.RectVector();
    props.roiEyes = props.roi.roi(new cv.Rect(0, 0, props.roi.cols, Math.max(1, Math.round(props.roi.rows * 0.55))));
    eyeCascade.detectMultiScale(props.roiEyes, props.eyes, 1.15, 3);

    const eyeRects: OverlayBox[] = [];
    for (let i = 0; i < props.eyes.size(); i++) {
      const e = props.eyes.get(i);
      eyeRects.push({ x: f.x + e.x, y: f.y + e.y, w: e.width, h: e.height });
    }

    if (eyeRects.length >= 2) {
      eyeRects.sort((a, b) => a.x - b.x);
      leftEyeBox = eyeRects[0];
      rightEyeBox = eyeRects[eyeRects.length - 1];
    }

    props.mouths = new cv.RectVector();
    props.roiMouth = props.roi.roi(
      new cv.Rect(0, Math.round(props.roi.rows * 0.45), props.roi.cols, Math.round(props.roi.rows * 0.55)),
    );
    mouthCascade.detectMultiScale(props.roiMouth, props.mouths, 1.2, 5);
    if (props.mouths.size() >= 1) {
      const m = props.mouths.get(0);
      mouthBox = { x: f.x + m.x, y: f.y + Math.round(props.roi.rows * 0.45) + m.y, w: m.width, h: m.height };
    }
  }

  return { faceBox, leftEyeBox, rightEyeBox, mouthBox };
}

async function detectFrame(payload: FramePayload): Promise<GuidanceMsg> {
  const { image, width, height } = payload;

  if (!validImageData(image, width, height)) {
    return { level: 'BAD', text: 'Aproxime-se e centralize o rosto', canCapture: false };
  }

  let src: any | undefined;
  let gray: any | undefined;
  let faces: any | undefined;
  let roi: any | undefined;
  let roiEyes: any | undefined;
  let roiMouth: any | undefined;
  let eyes: any | undefined;
  let mouths: any | undefined;

  try {
    src = cv.matFromImageData(image);
    gray = asGray(src);

    const { faceBox, leftEyeBox, rightEyeBox, mouthBox } = handleFaceDetection({
      faces,
      gray,
      width,
      height,
      roi,
      eyes,
      roiEyes,
      mouths,
      roiMouth,
    });

    const sharp = varianceOfLaplacian(gray);
    const bright = meanBrightness(gray);

    return assess(faceBox, leftEyeBox, rightEyeBox, mouthBox, width, height, sharp, bright);
  } finally {
    try {
      if (mouths) mouths.delete();
      if (eyes) eyes.delete();
      if (roiEyes) roiEyes.delete();
      if (roiMouth) roiMouth.delete();
      if (roi) roi.delete();
      if (faces) faces.delete();
      if (gray) gray.delete();
      if (src) src.delete();
    } catch (e) {
      console.error('Error deleting cv objects:', e);
    }
  }
}

let initIsComplete = false;

const ERROR_THROTTLE_MS = 2000;
let lastErrorAt = 0;

self.onmessage = async (e: MessageEvent<InitPayload | FramePayload>) => {
  const msg = e.data;

  try {
    if (msg.type === 'init') {
      await ensureCV();

      await loadCascades(msg.cascadesBase ?? '/libs/cascades');

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
      (self as any).postMessage({
        type: 'guidance',
        payload: { level: 'BAD', text: 'Processando…', canCapture: false },
      });
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
