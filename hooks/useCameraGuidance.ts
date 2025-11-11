import { useRef, useState } from 'react';

import { FramePayload, GuidanceMsg, InitPayload } from '@/lib/workers/cameraWorker';
import type { Guidance } from '@/lib/types/visionTypes';

const createWorker = () =>
  new Worker(new URL('@/lib/workers/cameraWorker.ts', import.meta.url), {
    type: 'module',
  });

type WorkerOutMessage =
  | { type: 'ready' }
  | { type: 'guidance'; payload: GuidanceMsg }
  | { type: 'error'; message: string };

export function useVisionGuidance() {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [guidance, setGuidance] = useState<Guidance | null>(null);

  const stop = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setReady(false);
      setGuidance(null);
    }
  };

  const start = (opts: {
    source: HTMLVideoElement | HTMLCanvasElement;
    width: number;
    height: number;
    fps?: number;
    cascadesBase?: string;
    opencvBase?: string;
  }) => {
    stop();

    const w = createWorker();
    workerRef.current = w;

    let rafId: number | null = null;
    let started = false;

    const beginLoop = () => {
      if (started) return;
      started = true;

      const fps = opts.fps ?? 12;
      const interval = Math.max(1, Math.round(1000 / fps));

      const src = opts.source;
      const isVideo = typeof (src as HTMLVideoElement).videoWidth === 'number';

      let accum = 0;
      let last = performance.now();

      const canvas = new OffscreenCanvas(opts.width, opts.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      const tick = () => {
        rafId = self.requestAnimationFrame(tick);

        const now = performance.now();
        const dt = now - last;

        accum += dt;
        last = now;

        if (accum < interval) return;
        accum = 0;

        if (isVideo) {
          const v = src as HTMLVideoElement;

          if (v.videoWidth === 0 || v.videoHeight === 0) return;

          ctx.drawImage(v, 0, 0, opts.width, opts.height);
        } else {
          const c = src as HTMLCanvasElement;
          ctx.drawImage(c, 0, 0, opts.width, opts.height);
        }

        const image = ctx.getImageData(0, 0, opts.width, opts.height);
        (w as Worker).postMessage({ type: 'frame', width: opts.width, height: opts.height, image } as FramePayload, [
          image.data.buffer,
        ]);
      };

      tick();
    };

    w.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;

      if (msg.type === 'ready') {
        setReady(true);
        beginLoop();
        return;
      }

      if (msg.type === 'guidance') {
        setGuidance(msg.payload as Guidance);
        return;
      }

      if (msg.type === 'error') {
        console.error('[vision.worker]', msg.message);
      }
    };

    w.postMessage({ type: 'init', cascadesBase: opts.cascadesBase, opencvBase: opts.opencvBase } as InitPayload);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      w.terminate();
      workerRef.current = null;
      setReady(false);
      setGuidance(null);
    };
  };

  return { ready, guidance, start, stop };
}
