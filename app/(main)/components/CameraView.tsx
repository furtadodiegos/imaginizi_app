'use client';

import { Loader2, RefreshCcw, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { AvatarList } from '@/app/(main)/components/AvatarList';
import { Overlay } from '@/components/Overlay';
import { Button } from '@/components/ui/button';
import { useVisionGuidance } from '@/hooks/useCameraGuidance';
import { cn } from '@/lib/utils';

type CameraViewProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  photoCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraStreaming: boolean;
  imagePreview: string;
  generatedImage: string;
  error: string;
  isLoading: boolean;
  closeCamera: () => void;
  takePhoto: () => Promise<void>;
  retakePhoto: () => void;
  generateImage: (imagePreview: string, prompt: string) => Promise<void>;
};

export default function CameraView({
  videoRef,
  photoCanvasRef,
  cameraStreaming,
  imagePreview,
  generatedImage,
  error,
  isLoading,
  closeCamera,
  takePhoto,
  retakePhoto,
  generateImage,
}: CameraViewProps) {
  const [prompt, setPrompt] = useState('');

  const { guidance, start, stop } = useVisionGuidance();

  const overlayRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const startNow = () => {
      const W = v.videoWidth || 640;
      const H = v.videoHeight || 480;

      v.width = W;
      v.height = H;

      start({
        source: v,
        width: W,
        height: H,
        fps: 12,
        cascadesBase: '/libs/cascades',
        opencvBase: '/libs/opencv',
      });
    };

    const onLoadedMeta = () => {
      v.play()
        .then(() => {
          if (v.videoWidth > 0 && v.videoHeight > 0) startNow();
        })
        .catch(console.warn);
    };

    const onPlaying = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) startNow();
    };

    v.addEventListener('loadedmetadata', onLoadedMeta);
    v.addEventListener('playing', onPlaying);

    if (v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
      startNow();
    }

    return () => {
      v.removeEventListener('loadedmetadata', onLoadedMeta);

      v.removeEventListener('playing', onPlaying);

      stop();
    };
  }, [start, stop, videoRef, cameraStreaming]);

  useEffect(() => {
    const c = overlayRef.current;
    const v = videoRef.current;

    if (!c || !v) return;

    const W = (c.width = v.width);
    const H = (c.height = v.height);

    const ctx = c.getContext('2d')!;

    ctx.clearRect(0, 0, W, H);

    if (!guidance) return;

    const color = guidance.level === 'GOOD' ? '#22c55e' : guidance.level === 'OK' ? '#eab308' : '#ef4444';

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
      const le = guidance.leftEye;
      const re = guidance.rightEye;

      const lcx = le.x + le.w / 2,
        lcy = le.y + le.h / 2;

      const rcx = re.x + re.w / 2,
        rcy = re.y + re.h / 2;

      ctx.beginPath();
      ctx.moveTo(lcx, lcy);
      ctx.lineTo(rcx, rcy);
      ctx.stroke();
    }

    // Guidance text
    // ctx.fillStyle = color;
    // ctx.font = '16px system-ui, -apple-system, sans-serif';
    // ctx.fillText(guidance.text ?? '', 12, H - 16);
  }, [guidance, videoRef]);

  useEffect(() => {
    if (imagePreview) stop();
  }, [imagePreview, stop]);

  return (
    <div
      className={cn(
        'absolute inset-0 z-11 h-screen w-screen transition-opacity duration-500 ease-in-out',
        cameraStreaming ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}>
      <Button className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full p-2" onClick={closeCamera}>
        <X className="h-6 w-6" />
      </Button>

      {imagePreview && (
        <Button className="absolute top-16 right-4 z-20 h-10 w-10 rounded-full p-2" onClick={retakePhoto}>
          <RefreshCcw className="h-6 w-6" />
        </Button>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: imagePreview ? 'none' : 'block',
        }}
      />

      <canvas
        ref={overlayRef}
        className={cn('absolute z-12 inset-0 w-full h-full object-cover top-0 left-0 pointer-events-none')}
      />

      <canvas
        ref={photoCanvasRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: imagePreview ? 'block' : 'none' }}
      />

      <div
        className={cn(
          'absolute bottom-8 left-0 right-0 z-11 flex items-center justify-center gap-x-8',
          imagePreview ? 'bottom-0 bg-black/90 backdrop-blur-sm' : 'bottom-8',
        )}>
        {imagePreview ? (
          <div className="w-full max-w-md mx-4 p-2 pb-8 pl-12">
            <AvatarList onSelect={(p) => setPrompt(p)} />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {prompt && (
              <div className="flex items-center justify-end">
                <Button
                  onClick={() => generateImage(imagePreview, prompt)}
                  variant="link"
                  className="text-white text-lg underline font-bold">{`Let's Imaginzi -->`}</Button>
              </div>
            )}
          </div>
        ) : (
          <Button
            onClick={takePhoto}
            className="h-16 w-16 rounded-full border-4 border-white bg-white/30 backdrop-blur-sm"
            aria-label="Take Photo"
          />
        )}
      </div>

      <Overlay isVisible={isLoading || !!generatedImage} className="z-12 flex flex-col items-center justify-center">
        {generatedImage ? (
          <Image
            src={generatedImage}
            alt="Image Generated"
            width={500}
            height={500}
            className="object-cover h-screen w-screen"
          />
        ) : (
          <>
            <Loader2 className="animate-spin text-white size-10" />

            <p className="text-white text-sm">Gerando imagem...</p>
          </>
        )}
      </Overlay>
    </div>
  );
}

// Ideas
// {/* <form className="w-full max-w-md mx-4 p-2 pb-8">
//   <FieldGroup>
//     <FieldSet>
//       <FieldLegend className="text-start text-lg font-bold text-white">Nice Picture</FieldLegend>
//       <FieldDescription className="text-start text-sm font-bold text-white/50">
//         Now, which character you want to be?
//       </FieldDescription>

//       <FieldGroup>
//         <Field>
//           <Input id="prompt" placeholder="Buzz Lightyear from Toy Story 4" required />
//         </Field>

//         <Button
//           className="rounded-full absolute right-6 bottom-[33px] bg-transparent"
//           onClick={() => generateImage(imagePreview)}>
//           <CameraIcon className="size-6" />
//         </Button>
//       </FieldGroup>
//     </FieldSet>
//   </FieldGroup>
// </form>;
// {
//   /* <Button onClick={retakePhoto} variant="outline" className="rounded-full px-6 py-2 text-lg">
//               Tirar Novamente
//             </Button>

//             <Button className="rounded-full px-6 py-2 text-lg" onClick={() => generateImage(imagePreview)}>
//               Usar Foto
//             </Button> */
// // } */}
