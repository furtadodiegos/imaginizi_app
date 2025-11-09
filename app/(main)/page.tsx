"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { useRef } from "react";
import { useEffect } from "react";

export default function Home() {
  const {
    error,
    cameraPermission,
    requestCamera,
    takePhoto,
    retakePhoto,
    imagePreview,
    videoRef,
    photoCanvasRef,
    generateImage,
    isLoading,
    generatedImage,
  } = useCamera();
  console.log("🚀 ~ Home ~ cameraPermission:");

  return (
    <div className="min-h-screen from-background to-muted flex flex-col items-center justify-center p-4">
      <h1>Imaginizi</h1>

      {cameraPermission !== "granted" && (
        <div className="flex gap-2 w-full max-w-md">
          <Button
            className="w-full"
            variant="default"
            disabled={cameraPermission === "denied"}
            onClick={() => requestCamera()}
          >
            Open Camera
          </Button>

          {cameraPermission === "denied" && (
            <p className="text-sm text-muted-foreground">
              You blocked the camera access. Please enable it in your browser
              settings.
            </p>
          )}
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div>
        {!imagePreview && (
          <div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                maxWidth: "500px",
              }}
            />
            <Button onClick={takePhoto}>Take Photo</Button>
          </div>
        )}

        <canvas
          ref={photoCanvasRef}
          style={{ width: "100%", display: imagePreview ? "block" : "none" }}
        />

        {!!imagePreview && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={retakePhoto}>Retake Photo</Button>

              <Button onClick={generateImage}>Generate Image</Button>
            </div>

            {isLoading && <Loader2 className="animate-spin" />}
          </div>
        )}

        {generatedImage && (
          <img
            src={generatedImage}
            alt="Generated"
            width={500}
            height={500}
            className="object-cover"
          />
        )}
      </div>
    </div>
  );
}
