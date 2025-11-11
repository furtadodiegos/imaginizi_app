# Imaginizi

Imaginizi is a web application that transforms your photos into stunning character images using generative AI. Just strike a pose, and our real-time camera guidance will help you capture the perfect shot. Then, with a simple text prompt, watch as AI reimagines your picture in the style of your favorite character.

## ✨ Features

- **Real-Time Camera Guidance**: Uses OpenCV.js in a Web Worker to analyze the camera feed for face position, lighting, and sharpness, providing live feedback to ensure high-quality photos.
- **AI-Powered Image Generation**: Integrates with a generative AI model (via a Next.js API route) to transform user photos based on text prompts.
- **Dynamic and Responsive UI**: Built with Next.js, React, and Tailwind CSS for a seamless experience on any device.
- **Performance Optimized**: The camera component is loaded dynamically to reduce initial load times, and heavy computer vision tasks are offloaded from the main UI thread.

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Client-Side Computer Vision**: [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- **Concurrency**: [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

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

3.  **Set up Environment Variables:**
    This project requires a backend capable of generating images from a photo and a prompt. The API route at `/api/image` is set up to connect to such a service (e.g., Google Gemini, Stable Diffusion). You will need to configure the necessary API keys.

    Create a `.env.local` file in the root of the project:
    ```
    GENERATIVE_AI_API_KEY="your_api_key_here"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🛠️ How It Works

1.  **Camera Initialization**: When the user clicks "Tirar Foto", the `CameraView` component is dynamically loaded, and the `useCamera` hook requests permission to access the device's camera.
2.  **Guidance Worker**: The `useCameraGuidance` hook spawns a Web Worker to handle all real-time video processing. This prevents the main UI thread from becoming blocked.
3.  **Real-Time Analysis**: The Web Worker (`cameraWorker.ts`) loads OpenCV.js and Haar Cascade models. It receives video frames, detects the user's face, and analyzes metrics like position, size, brightness, and sharpness.
4.  **UI Feedback**: The worker sends `guidance` messages back to the main thread. The `CameraView` component then renders colored boxes over the video feed on a `<canvas>` element, guiding the user to the optimal position.
5.  **Photo Capture**: Once the guidance indicates a good shot (`level: 'GOOD'`), the user can take a photo. The current frame is captured on a canvas and converted to a base64 string.
6.  **AI Generation**: The captured photo and a text prompt are sent to the Next.js API route (`/api/image`). This route acts as a proxy, securely forwarding the request with an API key to the external generative AI service.
7.  **Display Result**: The newly generated image is returned to the client and displayed in a full-screen overlay.

## 📂 Project Structure

- `app/(main)/page.tsx`: The main page component that orchestrates the application state.
- `app/(main)/components/CameraView.tsx`: The UI for the camera, guidance overlay, and results.
- `app/(main)/components/HeroBanner.tsx`: The initial landing page component.
- `hooks/useCamera.ts`: Manages camera permissions and media stream state.
- `hooks/useCameraGuidance.ts`: Manages the lifecycle of the computer vision Web Worker.
- `lib/workers/cameraWorker.ts`: The core computer vision logic using OpenCV.js. Runs in a separate thread.
- `app/api/image/route.ts`: The server-side API endpoint that communicates with the generative AI model.
- `public/libs/`: Contains the static OpenCV.js library and Haar Cascade XML files.
