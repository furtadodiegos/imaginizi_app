# Imaginizi

Imaginizi is a web application that transforms your photos into stunning character images using generative AI. Just strike a pose, and our real-time camera guidance will help you capture the perfect shot. Then, with a simple text prompt, watch as AI reimagines your picture in the style of your favorite character.

## ✨ Features

- **Real-Time Camera Guidance**: Uses OpenCV.js in a Web Worker to analyze the camera feed detecting face position, lighting, and sharpness, providing real-time visual feedback to ensure high-quality photos.
- **AI-Powered Image Generation**: Integrates with Google Gemini to transform user photos based on text prompts.
- **Smart Prompt System**: Uses captured photo context (framing, head tilt, quality) to improve generation accuracy.
- **Authentication**: Google OAuth authentication system via NextAuth.js.
- **Quota System**: Per-user usage control with generation limit (default: 2 per user).
- **Optimized Performance**: The camera component is dynamically loaded to reduce initial bundle size, and heavy computer vision tasks are executed in a separate thread.

## 🚀 Tech Stack

### Core

- **Framework**: [Next.js](https://nextjs.org/) 16.0.1 (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5+
- **Runtime**: React 19.2.0

### Frontend

- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Carousel**: [Embla Carousel](https://www.embla-carousel.com/)

### Backend & AI

- **AI Service**: [Google Gemini](https://ai.google.dev/) (gemini-2.5-flash-image)
- **Database**: [PostgreSQL](https://www.postgresql.org/) + [Prisma](https://www.prisma.io/) 6.19.0
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) 4.24.13 (Google Provider)

### Computer Vision

- **Client-Side Vision**: [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- **Concurrency**: [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- **Haar Cascades**: Face, eyes, and mouth detection

### Observability

- **Error Tracking**: [Sentry](https://sentry.io/) for Next.js

### DevOps

- **Git Hooks**: Husky + lint-staged
- **Linting**: ESLint + Prettier

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (database)
- Google Cloud Platform account (for OAuth and Gemini API)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/imaginizi.git
    cd imaginizi
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env.local` file in the project root with the following variables:

    ```env
    # Database
    DATABASE_URL="postgresql://user:password@localhost:5432/imaginizi?schema=public"

    # NextAuth
    NEXTAUTH_SECRET="your_secret_key_here"
    NEXTAUTH_URL="http://localhost:3000"

    # Google OAuth
    GOOGLE_CLIENT_ID="your_google_client_id"
    GOOGLE_CLIENT_SECRET="your_google_client_secret"

    # Google Gemini API
    GEMINI_API_KEY="your_gemini_api_key"

    # Sentry (optional, for production)
    SENTRY_DSN="your_sentry_dsn"
    SENTRY_AUTH_TOKEN="your_sentry_auth_token"
    ```

    **Note**: To obtain Google OAuth credentials, you need to:
    - Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
    - Enable the Google+ API
    - Create OAuth 2.0 credentials
    - Add `http://localhost:3000/api/auth/callback/google` as redirect URI

    To obtain the Gemini API key:
    - In the same Google Cloud project, enable the Gemini API
    - Create an API key in the console

4.  **Set up the database:**

    ```bash
    # Run Prisma migrations
    npm run prisma:migrate

    # (Optional) Open Prisma Studio to view data
    npx prisma studio
    ```

5.  **Run the development server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🛠️ How It Works

### Complete Flow

1.  **Authentication**: When the user clicks "Take photo", it checks if they are authenticated via NextAuth.js. If not, redirects to login with Google OAuth.

2.  **Camera Initialization**: After authentication, the `CameraView` component is dynamically loaded (code splitting), and the `useCamera` hook requests permission to access the device's camera.

3.  **Guidance Worker**: The `useCameraView` hook calls `useVisionGuidance` which creates a Web Worker to process video in real-time. This prevents blocking the main UI thread.

4.  **Real-Time Analysis**:
    - The Web Worker (`cameraWorker.ts`) loads OpenCV.js and Haar Cascade models (face, eyes, mouth)
    - Receives video frames via `OffscreenCanvas` and `requestAnimationFrame`
    - Detects face, eyes, and mouth using `detectMultiScale`
    - Calculates quality metrics:
      - **Framing**: Face percentage on screen, centered position
      - **Tilt**: Head rotation angle (roll) calculated between eyes
      - **Quality**: Sharpness (Variance of Laplacian) and brightness (pixel average)
      - **Stability**: Checks movement between frames

5.  **Visual Feedback**: The worker sends `guidance` messages back to the main thread. The `CameraView` component renders colored boxes over the video feed on a `<canvas>` overlay:
    - 🟢 **Green**: GOOD - ideal conditions
    - 🟡 **Yellow**: OK - acceptable conditions
    - 🔴 **Red**: BAD - needs adjustment

6.  **Photo Capture**: When guidance indicates `canCapture: true` (after 15 consecutive "GOOD" frames), the user can take the photo. The current frame is captured on a canvas and converted to base64.

7.  **Prompt Form**: After capturing the photo, the `CameraForm` appears where the user describes the desired character (e.g., "Buzz Lightyear from Toy Story 4").

8.  **Image Generation**:
    - The `useMain` hook sends the photo and prompt to `/api/image` via FormData
    - The API route validates the request with `withValidatedImageRequest`:
      - Checks file type (PNG/JPEG/WEBP)
      - Limits size (max 8MB)
      - Validates prompt presence
    - The captured context (framing, tilt, quality, detection boxes) is serialized and sent along
    - Verifies authentication with `requireAuth`
    - Checks user quota in the database (production: blocks if quota <= 0)
    - Builds the smart prompt with `buildImagePrompt` which includes:
      - Character transformation instructions
      - Safety rules
      - Structured photo context (framing, head tilt, quality, boxes)
    - Calls Google Gemini (`gemini-2.5-flash-image`) with photo + prompt
    - Updates user quota in the database (decrements quota, increments used)
    - Returns the generated image in base64

9.  **Result Display**: The generated image is displayed in a full-screen overlay with option to close and start over.

### Security Architecture

- **Request Validation**: `withValidatedImageRequest` middleware validates all input data
- **Required Authentication**: All generation routes require authentication via `requireAuth`
- **Quota System**: Limits per-user usage (default: 1)
- **Prompt Safety Rules**: Filters inappropriate content in instructions for the AI model
- **Monitoring**: Sentry integration for error tracking in production

## 📂 Project Structure

### App Router (Next.js)

- **`app/(main)/page.tsx`**: Main page that orchestrates application state, manages authentication, and coordinates components.
- **`app/(main)/components/`**:
  - **`CameraView.tsx`**: Complete camera interface, guidance overlay, and results.
  - **`CameraForm.tsx`**: Form for entering transformation prompt.
  - **`HeroBanner.tsx`**: Initial landing page component with character carousel.
  - **`Footer.tsx`**: Application footer.
  - **`AvatarList.tsx`**: List of avatars/characters.
- **`app/api/image/route.ts`**: API endpoint that processes image generation (validation, authentication, Gemini call).
- **`app/api/auth/[...nextauth]/route.ts`**: NextAuth.js configuration for OAuth authentication.

### Custom Hooks

- **`hooks/useCamera.ts`**: Manages camera permissions, media stream, photo capture, and related states.
- **`hooks/useCameraGuidance.ts`**: Manages the computer vision Web Worker lifecycle. Creates the worker, starts/stops frame processing.
- **`app/(main)/hooks/useCameraView.ts`**: Hook that coordinates `useVisionGuidance`, renders visual overlay on canvas, and captures photo context.
- **`app/(main)/hooks/useMain.ts`**: Manages image generation state, API calls, and error handling.

### Workers

- **`lib/workers/cameraWorker.ts`**: Core computer vision logic using OpenCV.js. Runs in separate thread:
  - Loads OpenCV.js and Haar Cascade models
  - Processes frames in real-time (12 FPS)
  - Detects face, eyes, and mouth
  - Calculates quality metrics and guidance
  - Returns `guidance` messages to main thread

### API & Backend

- **`lib/api/withValidatedImageRequest.ts`**: Request validation middleware (file type, size, prompt).
- **`lib/auth.ts`**: NextAuth.js configuration with Google Provider and Prisma sync callbacks.
- **`lib/db.ts`**: Prisma Client instance with singleton pattern for reuse.

### Utilities

- **`lib/utils/imagePrompt.ts`**: Builds smart prompts for Gemini including structured photo context:
  - Context parsing (framing, tilt, quality, boxes)
  - Structured description generation
  - Transformation instructions and safety rules
- **`lib/utils/index.ts`**: Various utilities (cn, dataURLtoFile, getOverlayColor).

### Types

- **`lib/types/visionTypes.ts`**: TypeScript types for:
  - `Guidance`: Guidance messages from worker
  - `Context`: Captured photo context for API submission
  - `GuidelineLevel`: Quality levels (BAD, OK, GOOD)

### Database

- **`prisma/schema.prisma`**: Prisma schema with `User` model:
  - Fields: id, email, name, image
  - Quota system: `quota` (default: 2), `used` (usage counter)
  - Timestamps: createdAt, updatedAt

### Observability

- **`lib/services/sentry.ts`**: Sentry integration service for exception and message capture.
- **`sentry.server.config.ts`**: Sentry configuration for server.
- **`sentry.edge.config.ts`**: Sentry configuration for edge runtime.
- **`instrumentation.ts`**: Sentry instrumentation.

### Static Assets

- **`public/libs/opencv/`**: OpenCV.js library compiled for WebAssembly.
- **`public/libs/cascades/`**: Haar Cascade model XML files (face, eyes, smile).
- **`app/(main)/assets/`**: Character images and SVGs used in the UI.

## 📋 Next Steps & Future Improvements

### 🎯 Short-Term Improvements

1. **Dynamic Quota System**: Implement quota recharge or payment system
2. **Generation History**: Allow users to view and download previous images
3. **Example Gallery**: Add gallery of successful transformations
4. **Enhanced Visual Feedback**: Improve guidance messages with animations and more specific suggestions
5. **Image Compression**: Optimize image size before sending to API

### 🚀 Medium-Term Improvements

#### 🔹 A) TensorFlow.js / MediaPipe Integration

Currently, the system already sends structured context (framing, tilt, quality, boxes). With **TensorFlow.js** or **MediaPipe**, we can extract even more information:

- **Yaw and Pitch**: Horizontal and vertical head rotation (in addition to detected roll)
- **Facial Landmarks**: 468 reference points for detailed analysis
- **Facial Expression**: Emotion and expression detection
- **Facial Proportions**: Precise measurements of distances and angles

**Benefits:**

- More accurate pose preservation
- Better character alignment with original photo
- Facial expression maintenance

#### 🔹 B) Enhanced Identity Preservation

With landmark detection, we can generate structured descriptions:

- **Face shape** (oval, round, square, heart)
- **Nose/mouth size and proportion**
- **Distance between eyes**
- **Eyebrow shape** (arched, straight, thick)
- **Hair style** (length, texture, volume)

**Example structured prompt:**

```text
"Preserve user's facial proportions: wide-set eyes, short chin, rounded jawline, thick eyebrows."
```

This significantly reduces identity errors, keeping the person recognizable in the final result.

#### 🔹 C) Face → Character Alignment

With location information and masks:

- **Facial segmentation mask** (via MediaPipe Selfie Segmentation)
- **Bounding box with adjusted margins**
- **Head proportions relative to body**
- **Anchor point** for character alignment

Allows the model to better understand where the face is and how to integrate it into the character style, maintaining correct position and proportions.

#### 🔹 D) Style Consistency

With structured conditioning:

- **Masks applied via OpenCV** (edge refinement)
- **Detected lighting angles**
- **Background histogram**
- **Lighting metrics** (color temperature, contrast)

Makes the AI's work more deterministic and predictable, resulting in more consistent and higher quality images.

### 🔬 Technical Improvements

1. **Model Caching**: Implement caching for Haar Cascade models and OpenCV.js
2. **Worker Optimization**: Improve worker performance with pooling techniques
3. **Retry Logic**: Implement automatic retry for Gemini API failures
4. **Rate Limiting**: Add rate limiting in backend to prevent abuse
5. **Analytics**: Implement analytics to understand usage patterns

### 🎨 UX Improvements

1. **Interactive Tutorial**: Initial guide for new users
2. **Real-Time Preview**: Preview transformation before confirming
3. **Multiple Variations**: Generate multiple variations of the same photo
4. **Side-by-Side Comparison**: Compare original vs. transformed
5. **Social Sharing**: Allow direct sharing on social networks

**Note**: In production, users with `quota <= 0` cannot generate new images until quota is renewed.

## 🔒 Security

### Request Validation

All requests to `/api/image` go through validation:

- **File type**: Only PNG, JPEG, and WEBP are accepted
- **Maximum size**: 8MB per file
- **Required prompt**: Must contain non-empty text
- **Authentication**: User must be authenticated via NextAuth

### Prompt Safety Rules

The system includes safety rules in the prompt sent to Gemini:

- Blocks sexual, violent, racist, homophobic, or inappropriate content
- Filters adult or illegal content
- Protection for minors

If the user's prompt is inappropriate, the model is instructed to generate a safe and neutral image of the character concept.

## 🐛 Troubleshooting

### Camera permission error

- Check if the browser has permission to access the camera
- Try restarting the browser
- Check browser privacy settings

### Database connection error

- Check if PostgreSQL is running
- Confirm that `DATABASE_URL` is correct in `.env.local`
- Run `npx prisma migrate deploy` to apply migrations

### Google authentication error

- Check if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Confirm that the redirect URI is configured in Google Cloud Console
- Check if `NEXTAUTH_SECRET` is defined

### Image generation error

- Check if `GEMINI_API_KEY` is correct and valid
- Confirm that the Gemini API is enabled in Google Cloud Console
- Check Sentry logs for more details (production)

## 📝 License

This project is private and proprietary.
