# Imaginizi Agent Context

## 1. Project Objective

The primary goal of this application is to transform a user's photograph into a stylized character image using generative AI (Google Gemini). The process is guided by real-time feedback on the user's camera input to ensure a high-quality photo is submitted, improving the final result. The application includes authentication, quota management, and intelligent prompt building using captured photo context.

## 2. Core Technologies

### Frontend

- **Framework**: Next.js 16.0.1 (App Router)
- **Language**: TypeScript 5+
- **Runtime**: React 19.2.0
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI)
- **Client-Side Computer Vision**: OpenCV.js
- **Client-Side Concurrency**: Web Workers

### Backend & AI

- **AI Service**: Google Gemini (gemini-2.5-flash-image)
- **Database**: PostgreSQL + Prisma 6.19.0
- **Authentication**: NextAuth.js 4.24.13 (Google OAuth Provider)

### Observability

- **Error Tracking**: Sentry for Next.js

## 3. Key Architectural Patterns

- **Off-Thread Computer Vision**: All real-time image analysis (face detection, quality metrics) is performed inside a Web Worker (`lib/workers/cameraWorker.ts`). This prevents the main UI thread from freezing during heavy computation, ensuring a smooth user experience.

- **Dynamic Component Loading**: The main camera interface (`CameraView`) is loaded lazily using `next/dynamic`. This significantly reduces the initial JavaScript bundle size, as the camera and OpenCV logic are only downloaded when the user decides to start the camera.

- **API as Proxy (BFF Pattern)**: The `/api/image` route acts as a Backend-for-Frontend (BFF). It receives the user's photo and prompt, then securely communicates with Google Gemini. This pattern hides API keys and allows for server-side validation, authentication, quota checking, and prompt building before calling the AI.

- **Authentication & Authorization**: NextAuth.js handles Google OAuth authentication. The API route uses `requireAuth` middleware to ensure only authenticated users can generate images.

- **Quota System**: Users have a quota limit (default: 2 generations) stored in PostgreSQL. The API checks and decrements quota on each generation.

- **Smart Prompt Building**: The system captures structured context from the photo (framing, head tilt, quality metrics, detection boxes) and includes it in the prompt sent to Gemini using `buildImagePrompt`. This improves generation accuracy and consistency.

- **Request Validation Middleware**: `withValidatedImageRequest` validates all incoming requests (file type, size, prompt presence) before processing.

## 4. Main User & Data Flow

1.  **Entry Point**: The user lands on `app/(main)/page.tsx`, which renders the `HeroBanner`.

2.  **User Action & Authentication**: User clicks "Take photo" button. The `onRequestCamera` function checks if the user is authenticated via `useSession` (NextAuth.js). If not authenticated, redirects to Google OAuth login.

3.  **State Transition**: After authentication, `onRequestCamera` resets state and calls `requestCamera` from `useCamera` hook. This sets `cameraStreaming` to `true`, making the `CameraView` component visible.

4.  **Component Rendering**: The dynamically loaded `CameraView` mounts. It receives props from the main page including video refs, camera state, and callback functions.

5.  **Camera & Worker Initialization**:
    - `useCamera` hook requests camera permission and sets up the media stream on the video element.
    - Inside `CameraView`, the `useCameraView` hook is called, which internally uses `useVisionGuidance` (formerly `useCameraGuidance`).
    - `useVisionGuidance` creates a new `Worker` instance from `lib/workers/cameraWorker.ts` and sends an `init` message.

6.  **Worker Logic (Initialization)**:
    - On receiving `init`, the worker loads the `OpenCV.js` library and the required Haar Cascade models for face, eye, and mouth detection.
    - Once loaded, it sends a `ready` message back to the main thread.

7.  **Worker Logic (Frame Processing)**:
    - After receiving `ready`, `useVisionGuidance` begins capturing frames from the `<video>` element via `OffscreenCanvas` and `requestAnimationFrame` at 12 FPS.
    - Each frame is sent to the worker with a `frame` message (ImageData is transferred via transferable objects).
    - The worker converts the frame to grayscale and uses `faceCascade.detectMultiScale` to find a face. It also detects eyes (in upper ROI) and mouth (in lower ROI).
    - It calculates quality metrics:
      - **Framing**: Face percentage (`scalePct`), center position (`centerDelta`)
      - **Tilt**: Head rotation angle (`rollDeg`) calculated between eyes
      - **Quality**: Sharpness (Variance of Laplacian), brightness (mean pixel value)
      - **Stability**: Movement tracking between consecutive frames
    - It sends a `guidance` message back containing these metrics, a qualitative `level` ('GOOD', 'OK', 'BAD'), and a `canCapture` flag (true after 15 consecutive GOOD frames).

8.  **UI Feedback**: The `useCameraView` hook receives the `guidance` object and uses a `<canvas>` overlay to draw colored boxes around the detected face, eyes, and mouth. It also draws a line between the eyes to show head tilt. Colors: green (GOOD), yellow (OK), red (BAD).

9.  **Photo Capture**: When `canCapture` is `true`, the user can press the shutter button, calling `takePhoto` from `useCamera`. This draws the current video frame onto a canvas and stores it as a base64 `imagePreview`.

10. **Context Capture**: When `imagePreview` is set, `useCameraView` captures the current guidance context (framing, head tilt, quality, boxes) into `contextRef.current` and stops the worker.

11. **Prompt Form**: After capturing the photo, the `CameraForm` component appears where the user enters a text prompt describing the desired character (e.g., "Buzz Lightyear from Toy Story 4").

12. **Image Generation Request**:
    - User submits the form, calling `generateImage` from `useMain` hook.
    - `useMain` converts the base64 `imagePreview` to a File using `dataURLtoFile`.
    - Creates FormData with: `image` (File), `prompt` (string), and `context` (JSON stringified Context object).
    - Makes a `POST` request to `/api/image` with credentials.

13. **API Route Processing** (`app/api/image/route.ts`):
    - **Validation**: `withValidatedImageRequest` middleware validates:
      - File type (PNG/JPEG/WEBP only)
      - File size (max 8MB)
      - Prompt presence (non-empty string)
      - Converts file to base64 inline data format
    - **Authentication**: `requireAuth` middleware verifies user session via NextAuth.js.
    - **User & Quota Check**: Fetches user from database. In production, blocks if `quota <= 0`.
    - **Prompt Building**: `buildImagePrompt` creates an intelligent prompt including:
      - Character transformation instructions
      - Safety rules (filters inappropriate content)
      - Structured context from photo (framing, head tilt, quality, detection boxes)
    - **AI Generation**: Calls Google Gemini (`gemini-2.5-flash-image` model) with photo + smart prompt.
    - **Quota Update**: Decrements `quota` and increments `used` in the database.
    - **Response**: Returns generated image as base64 data URL.

14. **Final UI**: The `useMain` hook receives the generated image and updates state. `CameraView` displays the image in a full-screen overlay with option to close and start over.

## 5. Critical Files for Analysis

### Main Application

- **`app/(main)/page.tsx`**: The main page component that orchestrates state between the UI and custom hooks. Manages authentication check, coordinates `useCamera` and `useMain` hooks, and handles camera request flow.

- **`app/(main)/components/CameraView.tsx`**: The complete UI for the camera, guidance overlay, and image generation flow. Uses `useCameraView` hook internally to coordinate vision guidance and visual feedback.

- **`app/(main)/components/CameraForm.tsx`**: Form component for entering the character transformation prompt. Submits to parent's `generateImage` callback.

- **`app/(main)/components/HeroBanner.tsx`**: Initial landing page component with character carousel. Contains the "Take photo" button that triggers camera flow.

### Camera & Vision Hooks

- **`hooks/useCamera.ts`**: Manages camera permissions, media stream, photo capture (takePhoto/retakePhoto), and related states (cameraStreaming, imagePreview, cameraError).

- **`hooks/useCameraGuidance.ts`** (exported as `useVisionGuidance`): The bridge between the React application and the Web Worker. Manages the worker's lifecycle, creates worker instance, handles frame capture via OffscreenCanvas, and manages the flow of frames and guidance messages.

- **`app/(main)/hooks/useCameraView.ts`**: Hook that coordinates `useVisionGuidance`, renders visual overlay on canvas (draws detection boxes), and captures photo context when image is taken. Returns `guidance`, `overlayRef`, and `contextRef`.

### Main State & API

- **`app/(main)/hooks/useMain.ts`**: Manages image generation state (isLoading, generatedImage, error). Handles API call to `/api/image`, converts base64 to File, creates FormData, and manages error states.

### Worker

- **`lib/workers/cameraWorker.ts`**: The core of the real-time analysis. Contains all OpenCV.js logic for face detection and quality assessment. Runs in a separate thread:
  - Loads OpenCV.js and Haar Cascade models on init
  - Processes frames at 12 FPS
  - Detects face, eyes, and mouth using `detectMultiScale`
  - Calculates quality metrics (framing, tilt, sharpness, brightness, stability)
  - Returns `guidance` messages with level (GOOD/OK/BAD) and `canCapture` flag

### API & Backend

- **`app/api/image/route.ts`**: The server-side API endpoint for image generation. Handles request validation, authentication, quota checking, prompt building, Gemini API call, and quota update.

- **`lib/api/withValidatedImageRequest.ts`**: Middleware that validates incoming FormData requests (file type, size, prompt). Converts File to base64 inline data format for Gemini.

- **`lib/utils/imagePrompt.ts`**: Builds intelligent prompts for Gemini including:
  - Character transformation instructions
  - Safety rules (content filtering)
  - Structured context parsing and formatting (framing, head tilt, quality, boxes)

### Authentication & Database

- **`lib/auth.ts`**: NextAuth.js configuration with Google Provider. Handles OAuth callback and syncs user data with Prisma on sign-in. Exports `requireAuth` middleware.

- **`lib/db.ts`**: Prisma Client singleton instance with query logging in development.

- **`prisma/schema.prisma`**: Database schema with `User` model (id, email, name, image, quota, used, timestamps).

### Types

- **`lib/types/visionTypes.ts`**: TypeScript types for:
  - `Guidance`: Messages from worker (level, text, canCapture, face/eyes/mouth boxes, metrics)
  - `Context`: Captured photo context (framing, headTilt, quality, boxes)
  - `GuidelineLevel`: Quality levels (BAD, OK, GOOD)

### Observability

- **`lib/services/sentry.ts`**: Sentry integration service for exception and message capture. Exports `withSentryUser` wrapper for API routes.
