import { useEffect, useRef } from 'react';

import { useVisionGuidance } from '@/hooks/useCameraGuidance';
import { Context } from '@/lib/types/visionTypes';
import { getOverlayColor } from '@/lib/utils';

const CENTER_TOLERANCE_PX = 12;

type UseCameraViewProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraStreaming: boolean;
  imagePreview: string;
};

export const useCameraView = ({ videoRef, cameraStreaming, imagePreview }: UseCameraViewProps) => {
  const { guidance, start, stop } = useVisionGuidance();

  const overlayRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<Context | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const startNow = () => {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      video.width = width;
      video.height = height;

      start({
        source: video,
        width,
        height,
        fps: 12,
        cascadesBase: '/libs/cascades',
        opencvBase: '/libs/opencv',
      });
    };

    const onLoadedMeta = () => {
      video
        .play()
        .then(() => {
          if (video.videoWidth > 0 && video.videoHeight > 0) startNow();
        })
        .catch(console.warn);
    };

    const onPlaying = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) startNow();
    };

    video.addEventListener('loadedmetadata', onLoadedMeta);
    video.addEventListener('playing', onPlaying);

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      startNow();
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMeta);

      video.removeEventListener('playing', onPlaying);

      stop();
    };
  }, [start, stop, videoRef, cameraStreaming]);

  useEffect(() => {
    const canvas = overlayRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const width = (canvas.width = video.width);
    const height = (canvas.height = video.height);

    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, width, height);

    if (!guidance) return;

    const color = getOverlayColor(guidance.level);

    const drawBox = (b?: { x: number; y: number; w: number; h: number }) => {
      if (!b) return;

      ctx.strokeStyle = color;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    };

    drawBox(guidance.face);
    drawBox(guidance.leftEye);
    drawBox(guidance.rightEye);
    drawBox(guidance.mouth);

    if (guidance.leftEye && guidance.rightEye) {
      const { leftEye: le, rightEye: re } = guidance;

      const lcx = le.x + le.w / 2;
      const lcy = le.y + le.h / 2;

      const rcx = re.x + re.w / 2;
      const rcy = re.y + re.h / 2;

      ctx.beginPath();
      ctx.moveTo(lcx, lcy);
      ctx.lineTo(rcx, rcy);
      ctx.stroke();
    }
  }, [guidance, videoRef]);

  useEffect(() => {
    if (imagePreview) {
      if (!contextRef.current) {
        const dx = guidance?.centerDelta?.dx;
        const dy = guidance?.centerDelta?.dy;
        const centered =
          dx !== undefined && dy !== undefined
            ? Math.abs(dx) <= CENTER_TOLERANCE_PX && Math.abs(dy) <= CENTER_TOLERANCE_PX
            : undefined;

        const context = {
          framing: {
            scalePct: guidance?.scalePct,
            centered,
          },
          headTilt: {
            rollDeg: guidance?.rollDeg,
          },
          quality: {
            brightness: guidance?.brightness,
            sharpness: guidance?.sharpness,
          },
          boxes: {
            face: guidance?.face,
            leftEye: guidance?.leftEye,
            rightEye: guidance?.rightEye,
            mouth: guidance?.mouth,
          },
        };

        contextRef.current = context;
      }

      stop();
    } else {
      contextRef.current = null;
    }
  }, [imagePreview, stop, guidance]);

  return { guidance, overlayRef, contextRef };
};
