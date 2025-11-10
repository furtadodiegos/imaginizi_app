'use client';

import { Loader2, X } from 'lucide-react';
import Image from 'next/image';

import { Overlay } from '@/components/Overlay';
import { Button } from '@/components/ui/button';
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
  generateImage: () => Promise<void>;
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
  return (
    <div
      className={cn(
        'absolute inset-0 z-11 h-screen w-screen transition-opacity duration-500 ease-in-out',
        cameraStreaming ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}>
      <Button className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full p-2" onClick={closeCamera}>
        <X className="h-6 w-6" />
      </Button>

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
        ref={photoCanvasRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: imagePreview ? 'block' : 'none' }}
      />

      <div className="absolute bottom-8 left-0 right-0 z-11 flex items-center justify-center gap-x-8">
        {imagePreview ? (
          <>
            <Button onClick={retakePhoto} variant="outline" className="rounded-full px-6 py-2 text-lg">
              Tirar Novamente
            </Button>

            <Button className="rounded-full px-6 py-2 text-lg" onClick={generateImage}>
              Usar Foto
            </Button>

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </>
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
