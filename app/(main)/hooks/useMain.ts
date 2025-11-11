import { useState } from 'react';

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

  return { error, isLoading, generatedImage, generateImage, onResetState };
};
