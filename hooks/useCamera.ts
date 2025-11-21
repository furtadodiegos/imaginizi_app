import { useRef } from 'react';
import { useCallback, useEffect, useState } from 'react';

type FacingMode = 'user' | 'environment';
export type PermissionState = 'prompt' | 'granted' | 'denied';

export function useCamera() {
  const [imagePreview, setImagePreview] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraPermission, setCameraPermission] = useState<PermissionState>();

  const [cameraStreaming, setCameraStreaming] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);

  const checkPermission = useCallback(async () => {
    try {
      if (!navigator.permissions) throw new Error('The Permissions API is not supported in this browser.');

      const result = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      });

      setCameraPermission(result.state);
    } catch (e) {
      setCameraError(`Camera permission is required to use this application. ${e}`);

      setCameraPermission('prompt');
    }
  }, []);

  const requestCamera = useCallback(async (facingMode: FacingMode = 'environment') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('The MediaDevices API is not supported in this browser.');
      return;
    }

    const constraints = { video: { facingMode }, audio: false };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      const video = videoRef.current!;
      video.srcObject = mediaStream;

      setCameraStreaming(true);
    } catch (err) {
      console.error('Error accessing the camera:', err);

      setCameraStreaming(false);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('Permission to access the camera was denied.');

          setCameraPermission('denied');
        } else {
          setCameraError(`Error accessing the camera: ${err.message}`);
        }
      }
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const video = videoRef.current!;
    const canvas = photoCanvasRef.current!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photo = canvas.toDataURL();

    setImagePreview(photo);
  }, []);

  const retakePhoto = useCallback(() => {
    setImagePreview('');

    requestCamera();
  }, [requestCamera]);

  const closeCamera = useCallback(() => {
    const videoElement = videoRef.current;

    if (videoElement?.srcObject) {
      const stream = videoElement.srcObject as MediaStream;

      stream.getTracks().forEach((track) => track.stop());

      videoElement.srcObject = null;

      setCameraStreaming(false);
      setImagePreview('');
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    const videoElement = videoRef.current;

    return () => {
      if (videoElement?.srcObject) {
        const stream = videoElement.srcObject as MediaStream;

        stream.getTracks().forEach((track) => track.stop());

        setCameraStreaming(false);
      }
    };
  }, []);

  return {
    cameraError,
    cameraPermission,
    requestCamera,
    takePhoto,
    retakePhoto,
    imagePreview,
    videoRef,
    photoCanvasRef,
    cameraStreaming,
    closeCamera,
  };
}
