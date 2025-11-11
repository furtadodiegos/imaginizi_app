export type GuidelineLevel = 'BAD' | 'OK' | 'GOOD';
export type OverlayBox = { x: number; y: number; w: number; h: number };

export type Guidance = {
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
