'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useCallback, useEffect } from 'react';

import { useMain } from '@/app/(main)/hooks';
import { Overlay } from '@/components/Overlay';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useCamera } from '@/hooks/useCamera';

import { HeroBanner } from './components';

const CameraView = dynamic(() => import('./components/CameraView'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full animate-pulse absolute top-0" />,
});

const OVERFLOW_HIDDEN = 'overflow-hidden';

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
      console.error('Error requesting camera:', e);
    }
  }, [requestCamera, onResetState, session]);

  useEffect(() => {
    if (cameraStreaming) {
      document.body.classList.add(OVERFLOW_HIDDEN);
    } else {
      document.body.classList.remove(OVERFLOW_HIDDEN);
    }

    return () => {
      document.body.classList.remove(OVERFLOW_HIDDEN);
    };
  }, [cameraStreaming]);

  return (
    <div className="relative">
      <main className="flex min-h-screen flex-col bg-background text-foreground">
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

        <footer className="bg-muted py-6">
          <div className="container mx-auto px-4 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <div className="container flex items-center justify-center gap-2">
              <Link
                href="https://www.linkedin.com/in/furtadodiegos/"
                target="_blank"
                className="flex flex-col items-center justify-center gap-2">
                <Avatar>
                  <AvatarImage src="https://media.licdn.com/dms/image/v2/C4E03AQEuaG3cJdPXPQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1587041120549?e=1764201600&v=beta&t=x3St0LJ6B8yyDn6cYiLegBOdpZGU-zuQBQ_f6feWeBI" />
                  <AvatarFallback>DF</AvatarFallback>
                </Avatar>

                <p className="text-sm font-medium text-muted-foreground">© 2025 Imaginizi</p>
              </Link>
            </div>

            <div className="container flex flex-col items-center justify-center">
              <p className="text-xs text-muted-foreground text-center px-4">
                Projeto experimental sem fins comerciais.
              </p>

              <p className="text-xs text-muted-foreground text-center px-4">
                Personagens pertencem a seus respectivos detentores de direitos.
              </p>
            </div>
          </div>
        </footer>

        <Overlay isVisible={cameraStreaming} />
      </main>
    </div>
  );
}
