import { useState } from 'react';

import { SentryService } from '@/lib/services/sentry';
import { dataURLtoFile } from '@/lib/utils';

export const useMain = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState('');

  const onResetState = () => {
    setError('');
    setIsLoading(false);
    setGeneratedImage('');
  };

  const generateImage = async (imagePreview: string, prompt: string) => {
    setIsLoading(true);
    setError('');

    const formData = new FormData();
    const imageFile = dataURLtoFile(imagePreview, 'photo.png');

    if (!imageFile) {
      setError('Error converting image to file.');
      setIsLoading(false);
      return;
    }

    formData.append('image', imageFile);
    formData.append('prompt', prompt);

    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.error || 'Error generating image.');
      }

      const data = await response.json();

      setGeneratedImage(data.image);
    } catch (e) {
      setError((e as Error).message);
      SentryService.captureException(e, { params: { path: 'useMain', method: 'generateImage' } });
    } finally {
      setIsLoading(false);
    }
  };

  return { error, isLoading, generatedImage, generateImage, onResetState };
};
