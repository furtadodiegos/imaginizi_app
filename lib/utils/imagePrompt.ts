import { GenerateContentConfig, HarmBlockThreshold, HarmCategory } from '@google/genai';

import { Context } from '@/lib/types/visionTypes';

const SYSTEM_INSTRUCTION = `
You are an image generation model that transforms a real person into a fictional character while preserving identity.
---
HARD CONSTRAINTS
- Transform the person into the character (no collage, no second subject).
- Preserve recognizable facial identity; avoid masks/helmets hiding the face.
- Respect original pose and left/right orientation unless composition requires.
- High quality: clean, cinematic lighting, no artifacts, no text/watermarks/UI.
---
NEGATIVE PROMPTS (avoid)
- split-face, double subject, text, watermark, collage, glitch, deformed neck/chin/jaw, extra limbs/fingers.
`.trim();

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

const systemInstruction = {
  role: 'system' as const,
  parts: [{ text: SYSTEM_INSTRUCTION }],
};

export const imageGenerationConfig: GenerateContentConfig = {
  topP: 0.9,
  topK: 40,
  imageConfig: { aspectRatio: '9:16' },
  systemInstruction,
  safetySettings,
} as const;

// Example of contextRaw
// contextRaw = {
//   framing: { scalePct: 37.1875, centered: true },
//   headTilt: { rollDeg: 1.181188913326638 },
//   quality: { brightness: 128.159375, sharpness: 618.5806526323 },
//   boxes: { face: { x: 200, y: 120, w: 238, h: 238 }, leftEye: { x: 238, y: 187, w: 50, h: 50 }, rightEye: { x: 333, y: 187, w: 54, h: 54 }, mouth: { x: 254, y: 288, w: 123, h: 61 } },
// }
function parseContext(contextRaw: string): Context | null {
  try {
    return JSON.parse(contextRaw) as Context;
  } catch {
    return null;
  }
}

function buildFramingLine(framing: Context['framing']): string | null {
  if (!framing) return null;

  const { scalePct = 0, centered = false } = framing;
  return `Camera framing: face occupies ~${Math.round(scalePct)}% of width and is ${centered ? 'centered' : 'off-center'}.`;
}

function buildHeadTiltLine(headTilt: Context['headTilt']): string | null {
  if (!headTilt) return null;

  const { rollDeg = 0 } = headTilt;
  return `Head tilt (roll): ${Math.round(rollDeg)} degrees.`;
}

function buildQualityLine(quality: Context['quality']): string | null {
  if (!quality) return null;

  const { brightness = 0, sharpness = 0 } = quality;
  return `Capture quality: brightness=${Math.round(brightness)}, sharpness=${Math.round(sharpness)}.`;
}

function buildBoxesLines(boxes: Context['boxes']): string[] {
  if (!boxes) return [];

  const lines: string[] = [];
  const { face, leftEye, rightEye, mouth } = boxes;

  if (face) {
    lines.push(`Face located at: x=${face.x}, y=${face.y}, width=${face.w}, height=${face.h}`);
  }
  if (leftEye) {
    lines.push(`Left eye: ${leftEye.x}, ${leftEye.y}, ${leftEye.w}, ${leftEye.h}.`);
  }
  if (rightEye) {
    lines.push(`Right eye: ${rightEye.x}, ${rightEye.y}, ${rightEye.w}, ${rightEye.h}.`);
  }
  if (mouth) {
    lines.push(`Mouth: ${mouth.x}, ${mouth.y}, ${mouth.w}, ${mouth.h}.`);
  }

  return lines;
}

function buildContextLines(context: Context | null): string {
  if (!context) return 'No extra structured metadata was provided for this image.\n';

  const lines: string[] = [];

  const framingLine = buildFramingLine(context.framing);
  if (framingLine) lines.push(framingLine);

  const headTiltLine = buildHeadTiltLine(context.headTilt);
  if (headTiltLine) lines.push(headTiltLine);

  const qualityLine = buildQualityLine(context.quality);
  if (qualityLine) lines.push(qualityLine);

  const boxesLines = buildBoxesLines(context.boxes);
  lines.push(...boxesLines);

  return lines.length > 0 ? lines.join('\n') : 'No extra structured metadata was provided for this image.\n';
}

export function generateContextBlock(contextRaw: string | null): string {
  const context = parseContext(contextRaw || '');

  return buildContextLines(context);
}
