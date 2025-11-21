'use client';

import dynamic from 'next/dynamic';
import { signIn, useSession } from 'next-auth/react';
import { useCallback, useEffect } from 'react';

import { useMain } from '@/app/(main)/hooks';
import { Overlay } from '@/components/Overlay';
import { Skeleton } from '@/components/ui/skeleton';
import { useCamera } from '@/hooks/useCamera';
import { SentryService } from '@/lib/services/sentry';

import { Footer, HeroBanner } from './components';

const CameraView = dynamic(() => import('./components/CameraView'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full animate-pulse absolute top-0" />,
});

export default function Home() {
  const { data: session } = useSession();

  const { error, isLoading, generatedImage, generateImage, onResetState } = useMain();

  const {
    cameraError,
    cameraPermission,
    cameraStreaming,
    requestCamera,
    takePhoto,
    retakePhoto,
    imagePreview,
    videoRef,
    photoCanvasRef,
    closeCamera,
  } = useCamera();

  const onRequestCamera = useCallback(async () => {
    try {
      if (!session) {
        await signIn('google');
        return;
      }

      onResetState();
      requestCamera();
    } catch (e) {
      SentryService.captureException(e, { params: { path: 'page', method: 'onRequestCamera' } });
    }
  }, [requestCamera, onResetState, session]);

  useEffect(() => {
    if (cameraStreaming) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [cameraStreaming]);

  return (
    <div className="relative w-full">
      <main className="flex min-h-svh flex-col bg-background text-foreground">
        <HeroBanner cameraPermission={cameraPermission} error={cameraError || error} openCamera={onRequestCamera} />

        <CameraView
          videoRef={videoRef}
          cameraStreaming={cameraStreaming}
          error={error}
          closeCamera={closeCamera}
          takePhoto={takePhoto}
          retakePhoto={retakePhoto}
          isLoading={isLoading}
          photoCanvasRef={photoCanvasRef}
          imagePreview={imagePreview}
          generatedImage={generatedImage}
          generateImage={generateImage}
        />

        {!cameraStreaming && <Footer />}

        <Overlay isVisible={cameraStreaming} />
      </main>
    </div>
  );
}
