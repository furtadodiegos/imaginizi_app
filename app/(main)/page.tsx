'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';

import { Overlay } from '@/components/Overlay';
import { Skeleton } from '@/components/ui/skeleton';
import { useCamera } from '@/hooks/useCamera';
import { dataURLtoFile } from '@/lib/utils';

import { HeroBanner } from './components';

const CameraView = dynamic(() => import('./components/CameraView'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full animate-pulse absolute top-0" />,
});

const OVERFLOW_HIDDEN = 'overflow-hidden';

export default function Home() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [prompt /*, setPrompt */] = useState('marvel spider man from the movie spiderman into the spider verse');
  // const [prompt, setPrompt] = useState('buzz lightyear from toy story');
  const [generatedImage, setGeneratedImage] = useState('');

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

  const generateImage = async () => {
    if (!imagePreview || !prompt) {
      setError('Por favor, tire uma foto e insira um prompt.');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    const imageFile = dataURLtoFile(imagePreview, 'photo.png');

    if (!imageFile) {
      setError('Erro ao converter a imagem para arquivo.');
      setIsLoading(false);
      return;
    }

    formData.append('image', imageFile);
    formData.append('prompt', prompt);

    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.error || 'Falha ao gerar imagem.');
      }

      const data = await response.json();

      setGeneratedImage(data.image);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const onRequestCamera = useCallback(async () => {
    setGeneratedImage('');
    setError('');

    // TODO: add the login before request the camera
    requestCamera();
  }, [requestCamera]);

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
          <div className="container mx-auto px-4 text-center text-muted-foreground">
            <p>© 2025 Imaginizi. Todos os direitos reservados.</p>
          </div>
        </footer>

        <Overlay isVisible={cameraStreaming} />
      </main>
    </div>
  );
}
