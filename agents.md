# Imaginizi Agent Context

## 1. Project Objective

The primary goal of this application is to transform a user's photograph into a stylized character image using a generative AI model. The process is guided by real-time feedback on the user's camera input to ensure a high-quality photo is submitted, improving the final result.

## 2. Core Technologies

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Client-Side Computer Vision**: OpenCV.js
- **Client-Side Concurrency**: Web Workers
- **Backend AI Integration**: The project uses a Next.js API Route (`/api/image`) as a proxy to an external generative AI service (e.g., Google Gemini).

## 3. Key Architectural Patterns

- **Off-Thread Computer Vision**: All real-time image analysis (face detection, quality metrics) is performed inside a Web Worker (`lib/workers/cameraWorker.ts`). This prevents the main UI thread from freezing during heavy computation, ensuring a smooth user experience.
- **Dynamic Component Loading**: The main camera interface (`CameraView`) is loaded lazily using `next/dynamic`. This significantly reduces the initial JavaScript bundle size, as the camera and OpenCV logic are only downloaded when the user decides to start the camera.
- **API as Proxy**: The `/api/image` route acts as a Backend-for-Frontend (BFF). It receives the user's photo and prompt, then securely communicates with the external AI service. This pattern hides API keys and allows for server-side logic before calling the AI.

## 4. Main User & Data Flow

1.  **Entry Point**: The user lands on `app/(main)/page.tsx`, which renders the `HeroBanner`.
2.  **User Action**: User clicks the "Tirar Foto" button.
3.  **State Transition**: The `onRequestCamera` function is called, which in turn sets the state that makes the `CameraView` component visible.
4.  **Component Rendering**: The dynamically loaded `CameraView` mounts.
5.  **Worker Initialization**: Inside `CameraView`, the `useCameraGuidance` hook is called. It creates a new `Worker` instance from `lib/workers/cameraWorker.ts` and sends an `init` message.
6.  **Worker Logic (Initialization)**:
    - On receiving `init`, the worker loads the `OpenCV.js` library and the required Haar Cascade models for face, eye, and mouth detection.
    - Once loaded, it sends a `ready` message back to the main thread.
7.  **Worker Logic (Frame Processing)**:
    - After receiving `ready`, the `useCameraGuidance` hook begins capturing frames from the `<video>` element via an offscreen canvas.
    - Each frame is sent to the worker with a `frame` message.
    - The worker converts the frame to grayscale and uses `faceCascade.detectMultiScale` to find a face. It also detects eyes and mouth.
    - It calculates quality metrics: face size (`scalePct`), position (`centerDelta`), head tilt (`rollDeg`), image sharpness, and brightness.
    - It sends a `guidance` message back to the main thread containing these metrics and a qualitative `level` ('GOOD', 'OK', 'BAD').
8.  **UI Feedback**: The `CameraView` component receives the `guidance` object and uses a `<canvas>` overlay to draw colored boxes around the detected face, providing real-time visual feedback to the user.
9.  **User Action**: When the guidance is 'GOOD', the user can press the shutter button, calling `takePhoto`. This draws the current video frame onto a canvas and stores it as a base64 `imagePreview`.
10. **User Action**: The user clicks "Usar Foto", which calls `generateImage`.
11. **API Call**: A `POST` request is made to `/api/image` with the `imagePreview` and a text `prompt`.
12. **Backend Logic**: The `app/api/image/route.ts` handler receives the request, calls the external AI service, and forwards the generated image back to the client.
13. **Final UI**: The returned AI-generated image is displayed in a full-screen overlay.

## 5. Critical Files for Analysis

- **`app/(main)/page.tsx`**: The main application component that orchestrates state between the UI and the custom hooks.
- **`app/(main)/components/CameraView.tsx`**: The complete UI for the camera, guidance overlay, and image generation flow. It is the primary consumer of the `useCamera` and `useCameraGuidance` hooks.
- **`hooks/useCamera.ts`**: Manages camera permissions, the media stream, and the logic for taking and retaking photos.
- **`hooks/useCameraGuidance.ts`**: The bridge between the React application and the Web Worker. It manages the worker's lifecycle and the flow of frames and guidance messages.
- **`lib/workers/cameraWorker.ts`**: The core of the real-time analysis. Contains all OpenCV.js logic for face detection and quality assessment. It runs in a separate thread.
- **`app/api/image/route.ts`**: The server-side proxy for the AI image generation service.
