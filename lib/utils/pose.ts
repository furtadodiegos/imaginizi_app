// lib/pose.ts
export type Character = {
  id: string;
  name: string;
  image: string;
  faceBox?: { cx: number; cy: number; w: number; h: number };
  leftEye: { x: number; y: number }; // normalizado (0..1 na imagem do personagem)
  rightEye: { x: number; y: number };
  mouth?: { x: number; y: number };
  pose?: { interocular: number; tiltDeg: number; eyeMouthRatio: number };
};

export type FaceRect = { x: number; y: number; width: number; height: number };
export type EyeRect = { x: number; y: number; width: number; height: number };
export type DetectResult = {
  faces: Array<{ face: FaceRect; eyes?: EyeRect[] }>;
  width: number;
  height: number;
};

export type Pose = {
  interocular: number;
  tiltDeg: number;
  eyeMouthRatio: number;
};

// ---- carregar catálogo (do public/data/characters.json) ----
export async function loadCharacters(): Promise<Character[]> {
  const res = await fetch("/data/characters.json");
  if (!res.ok) throw new Error("failed to load characters.json");
  const data = (await res.json()) as Character[];
  return data;
}

// ---- extrair pose do usuário a partir do resultado Haar (1 rosto) ----
export function poseFromDetection(det: DetectResult): Pose | null {
  if (!det.faces?.length) return null;
  const f = det.faces[0]; // maior já seria ideal; aqui pegamos o 1º
  const { x, y, width: w, height: h } = f.face;

  // precisa de olhos; se não tiver, caímos numa heurística simples
  let left: { x: number; y: number } | null = null;
  let right: { x: number; y: number } | null = null;

  if (f.eyes && f.eyes.length >= 2) {
    // ordenar olhos por x
    const eyes = [...f.eyes].sort((a, b) => a.x - b.x);
    const eL = eyes[0];
    const eR = eyes[1];
    left = { x: eL.x + eL.width / 2, y: eL.y + eL.height / 2 };
    right = { x: eR.x + eR.width / 2, y: eR.y + eR.height / 2 };
  } else {
    // heurística: assume olhos a ~40% e 60% da largura e ~38% da altura do rosto
    left = { x: x + 0.38 * w, y: y + 0.38 * h };
    right = { x: x + 0.62 * w, y: y + 0.38 * h };
  }

  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const interocular = Math.hypot(dx, dy) / w; // normalizado pela largura do rosto
  const tiltDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  // estimativa de boca: se não detectamos, usa ~63% da altura do rosto
  const eyeCenterY = (left.y + right.y) / 2;
  const mouthY = y + 0.63 * h;
  const eyeMouthRatio = (mouthY - eyeCenterY) / h;

  return { interocular, tiltDeg, eyeMouthRatio };
}

// ---- extrair pose "normalizada" de um personagem do catálogo ----
export function poseFromCharacter(c: Character): Pose | null {
  if (!c.leftEye || !c.rightEye) return null;

  const L = c.leftEye,
    R = c.rightEye;
  const dx = R.x - L.x,
    dy = R.y - L.y;
  const interocular = Math.hypot(dx, dy); // já normalizado (coords 0..1)
  const tiltDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  // boca: se houver, usa; senão estima como 0.63 da altura
  const eyeCenterY = (L.y + R.y) / 2;
  const mouthY = c.mouth?.y ?? 0.63;
  const eyeMouthRatio = mouthY - eyeCenterY; // altura já em 0..1

  return { interocular, tiltDeg, eyeMouthRatio };
}

// ---- distância entre poses (MSE simples, com peso em tilt) ----
export function poseDistance(a: Pose, b: Pose): number {
  // ajuste de escala dos termos para ficarem mais comparáveis
  const d1 = a.interocular - b.interocular; // ~0..0.5
  const d2 = (a.tiltDeg - b.tiltDeg) / 30; // normaliza tilt (±30º típico)
  const d3 = a.eyeMouthRatio - b.eyeMouthRatio; // ~0..0.5

  return d1 * d1 + d2 * d2 + d3 * d3;
}

// ---- top-K matching ----
export function topKMatches(user: Pose, chars: Character[], k = 3) {
  const scored = chars
    .map((c) => {
      const cp = c.pose ?? poseFromCharacter(c);
      if (!cp) return null;
      return { character: c, pose: cp, distance: poseDistance(user, cp) };
    })
    .filter(Boolean) as Array<{
    character: Character;
    pose: Pose;
    distance: number;
  }>;

  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, k);
}

export function bestMatch(
  user: Pose,
  chars: Character[],
  opts?: { threshold?: number; marginRatio?: number }
) {
  const threshold = opts?.threshold ?? 0.03; // corte máximo de distância (menor=mais exigente)
  const margin = opts?.marginRatio ?? 1.25; // "confiança": best << second

  const scored = chars
    .map((c) => {
      const cp = c.pose ?? poseFromCharacter(c);
      if (!cp) return null;
      return { character: c, pose: cp, distance: poseDistance(user, cp) };
    })
    .filter(Boolean) as Array<{
    character: Character;
    pose: Pose;
    distance: number;
  }>;

  if (scored.length === 0) return null;

  scored.sort((a, b) => a.distance - b.distance);
  const best = scored[0];
  const second = scored[1];

  // aplica limiar de qualidade
  // if (best.distance > threshold) return null;

  // confiança opcional: best bem melhor que o segundo
  const confident = !second || best.distance * margin < second.distance;

  return { best: best.character, distance: best.distance, confident };
}
