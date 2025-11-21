import { Context } from '@/lib/types/visionTypes';

// Example of contextRaw
// contextRaw = {
//   framing: { scalePct: 37.1875, centered: true },
//   headTilt: { rollDeg: 1.181188913326638 },
//   quality: { brightness: 128.159375, sharpness: 618.5806526323 },
//   boxes: { face: { x: 200, y: 120, w: 238, h: 238 }, leftEye: { x: 238, y: 187, w: 50, h: 50 }, rightEye: { x: 333, y: 187, w: 54, h: 54 }, mouth: { x: 254, y: 288, w: 123, h: 61 } },
// }
function parseContext(contextRaw: string | null): Context | null {
  if (!contextRaw) return null;

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

/**
 * Make a image prompt to transform a real person into a fictional character, preserving their identity.
 * @param characterPrompt - The user's prompt describing the desired character (maximum 100 characters)
 * @returns The complete formatted prompt for the image generation API
 */
export function buildImagePrompt(characterPrompt: string, contextRaw: string | null): string {
  const promptSafe = String(characterPrompt).trim().slice(0, 100);

  const context = parseContext(contextRaw);

  const contextBlock = buildContextLines(context);

  return `
You are an image generation model that transforms a real person into a fictional character, preserving their identity.

GOAL
- Transform the person in the provided photo into the character described by: "${promptSafe}".
- The output must look like a single coherent image, not a collage.

INPUT CONTEXT
${contextBlock}

HARD SAFETY RULES
- If the user request is sexual, violent, hateful, racist, homophobic, transphobic, adult, or otherwise unsafe, DO NOT generate the image.
- Instead, output a neutral safe-looking image of the character concept without explicit content.
- Never generate nudity, graphic violence, hate symbols or illegal content.
- Do not generate minors in sexualized contexts.

TRANSFORMATION RULES
1. Transformation, not companionship:
   - The person in the photo MUST be transformed into the character.
   - Do NOT place the person next to the character as two separate entities.

2. Preserve identity:
   - Keep key facial features of the original person so they remain recognizable.
   - If the character normally uses a mask or helmet, render them WITHOUT the mask so the face stays visible.

3. Pose alignment:
   - Respect the original pose of the user (head angle and general body direction).
   - Do not flip the face or invert left/right unless necessary for composition.

4. Character adaptation:
   - Adapt clothes, hair, body and background to match the requested character theme.
   - Keep anatomy coherent and avoid deformations around the neck, chin and jawline.

5. Visual quality:
   - High-resolution, clean image.
   - Cinematic lighting, smooth shading, no visible artifacts or glitches.
   - Avoid text, watermarks or UI elements in the image.

OUTPUT
- Return only a single high-quality image that follows these rules.
`.trim();
}
