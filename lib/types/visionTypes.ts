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

export type Context = {
  framing: {
    scalePct: number | undefined;
    centered: boolean | undefined;
  };
  headTilt: {
    rollDeg: number | undefined;
  };
  quality: {
    brightness: number | undefined;
    sharpness: number | undefined;
  };
  boxes: {
    face: OverlayBox | undefined;
    leftEye: OverlayBox | undefined;
    rightEye: OverlayBox | undefined;
    mouth: OverlayBox | undefined;
  };
};
