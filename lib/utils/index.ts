import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { GuidelineLevel } from '@/lib/types/visionTypes';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const waitFor = (el: HTMLVideoElement, ev: string) =>
  new Promise<void>((resolve) => el.addEventListener(ev, () => resolve(), { once: true }));

export function dataURLtoFile(dataurl: string, filename: string): File | null {
  const arr = dataurl.split(',');

  if (arr.length < 2) {
    return null;
  }

  const mimeMatch = arr[0].match(/:(.*?);/);

  if (!mimeMatch || mimeMatch.length < 2) {
    return null;
  }

  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

export function getOverlayColor(level?: GuidelineLevel) {
  if (level === 'GOOD') return '#22c55e';
  if (level === 'OK') return '#eab308';

  return '#ef4444';
}
