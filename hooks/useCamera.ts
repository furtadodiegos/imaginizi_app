import { dataURLtoFile } from "@/lib/utils";
import { useRef } from "react";
import { useState, useEffect, useCallback } from "react";

// 'user' to frontal, 'environment' to rear
type FacingMode = "user" | "environment";
type PermissionState = "prompt" | "granted" | "denied";

export function useCamera() {
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");
  const [cameraPermission, setCameraPermission] = useState<PermissionState>();
  const [prompt, setPrompt] = useState("buzz lightyear from toy story");
  const [generatedImage, setGeneratedImage] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);

  const generateImage = async () => {
    if (!imagePreview || !prompt) {
      setError("Por favor, tire uma foto e insira um prompt.");
      return;
    }

    setIsLoading(true);
    setError("");

    const formData = new FormData();
    const imageFile = dataURLtoFile(imagePreview, "photo.png");

    if (!imageFile) {
      setError("Erro ao converter a imagem para arquivo.");
      setIsLoading(false);
      return;
    }

    formData.append("image", imageFile);
    formData.append("prompt", prompt);

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao gerar imagem.");
      }

      const data = await response.json();

      setGeneratedImage(data.image);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) {
      setError("The Permissions API is not supported in this browser.");

      setCameraPermission("prompt");
      return;
    }

    try {
      const result = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });

      setCameraPermission(result.state);
    } catch (e) {
      setError("Camera permission is required to use this application.");

      setCameraPermission("prompt");
    }
  }, []);

  const requestCamera = useCallback(
    async (facingMode: FacingMode = "environment") => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("The MediaDevices API is not supported in this browser.");
        return;
      }

      console.log(">>>", "requestCamera");

      const constraints = { video: { facingMode }, audio: false };

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        const video = videoRef.current!;
        video.srcObject = mediaStream;
      } catch (err) {
        console.error("Error accessing the camera:", err);

        if (err instanceof DOMException) {
          if (
            err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError"
          ) {
            setError("Permission to access the camera was denied.");
            setCameraPermission("denied");
          } else {
            setError(`Error accessing the camera: ${err.message}`);
          }
        }
      }
    },
    []
  );

  const takePhoto = useCallback(async () => {
    const video = videoRef.current!;

    // Cria um canvas em memória com as dimensões do vídeo
    const canvas = photoCanvasRef.current!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photo = canvas.toDataURL();
    setImagePreview(photo);
  }, []);

  const retakePhoto = useCallback(() => {
    setImagePreview("");

    requestCamera();
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    if (cameraPermission === "granted") requestCamera();
  }, [cameraPermission, requestCamera]);

  // Cleanup to stop the camera when the component is unmounted
  useEffect(() => {
    return () => {
      console.log("Cleaning up camera stream");
      const stream = videoRef.current?.srcObject as MediaStream;

      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    error,
    cameraPermission,
    requestCamera,
    takePhoto,
    retakePhoto,
    imagePreview,
    videoRef,
    photoCanvasRef,
    isLoading,
    generateImage,
    generatedImage,
  };
}
