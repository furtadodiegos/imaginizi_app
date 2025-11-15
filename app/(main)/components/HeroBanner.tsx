'use client';

import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import React from 'react';
import type { FC } from 'react';

import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { PermissionState } from '@/hooks/useCamera';

import AranhaPng from '../assets/aranha.png';
import BuzzPng from '../assets/buzz.png';
import FerroPng from '../assets/ferro.png';
import GuPng from '../assets/gu.png';
import LinesSvg from '../assets/lines.svg';
import MauiPng from '../assets/maui.png';
import MoanaPng from '../assets/moana.png';
import ThinkingSvg from '../assets/thinking.svg';
import WoodyPng from '../assets/woody.png';

type HeroBannerProps = {
  openCamera: () => void;
  cameraPermission?: PermissionState;
  error?: string;
};

const images = [
  { src: AranhaPng, alt: 'Homem-Aranha' },
  { src: MoanaPng, alt: 'Moana' },
  { src: WoodyPng, alt: 'Woody' },
  { src: BuzzPng, alt: 'Buzz Lightyear' },
  { src: MauiPng, alt: 'Maui' },
  { src: FerroPng, alt: 'Homem de Ferro' },
];

const svgMaskForCarousel = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg"><path d="M100 170 C 75 165, 45 145, 30 120 C 10 85, 20 45, 50 30 C 70 20, 90 25, 100 40 C 110 25, 130 20, 150 30 C 180 45, 190 85, 170 120 C 155 145, 125 165, 100 170 C 90 172, 80 175, 70 175 C 80 182, 90 185, 100 185 C 110 185, 120 182, 130 175" fill="black"/></svg>`,
)}")`;

const burstSvgMask = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="M 100,5 L 120,40 L 160,35 L 155,75 L 195,100 L 150,120 L 165,160 L 125,150 L 100,195 L 75,150 L 35,160 L 50,120 L 5,100 L 45,75 L 40,35 L 80,40 Z" fill="black"/></svg>`,
)}")`;

export const HeroBanner: FC<HeroBannerProps> = ({ openCamera, cameraPermission, error }) => {
  const permissionState = cameraPermission || 'denied';

  return (
    <section aria-labelledby="hero-section" className="relative flex flex-col h-screen w-screen">
      <div
        aria-labelledby="lines-svg"
        className="absolute top-[-20px] right-[-40px] flex items-start justify-end w-full">
        <LinesSvg />
      </div>

      <div className="absolute h-3/5 w-[700px] left-[-200px]">
        <Carousel
          plugins={[Autoplay({ delay: 2000, stopOnInteraction: true })]}
          opts={{
            align: 'start',
            loop: true,
          }}
          className="h-full w-full"
          style={{
            maskImage: svgMaskForCarousel,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: svgMaskForCarousel,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
          }}>
          <CarouselContent className="-ml-1 h-full">
            {images.map((image, index) => (
              <CarouselItem key={index} className="pl-1">
                <div className="h-full w-full">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={600}
                    height={600}
                    className="h-full w-full object-cover"
                    priority={index === 0}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <ThinkingSvg className="pointer-events-none absolute inset-0 z-10 h-full w-full animate-pulse text-white" />
      </div>

      <div
        className="absolute h-[300px] w-[300px] bottom-[220px] right-[-120px]"
        style={{
          maskImage: burstSvgMask,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskImage: burstSvgMask,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
        }}>
        <Image src={GuPng} alt="Gu" fill className="object-contain object-center" />
      </div>

      <div className="absolute flex flex-col items-center justify-center bottom-[80px]">
        <h2 className="text-4xl font-bold text-black text-center leading-tight">Imagine o seu personagem favorito</h2>

        <p className="text-base text-black text-center px-4 mt-2">
          Agora tire uma foto com a sua melhor pose e veja a magia acontecer.
        </p>

        <Button
          disabled={permissionState === 'denied'}
          onClick={openCamera}
          className="mt-4 w-2/3 text-start"
          variant="secondary">
          Tirar foto
        </Button>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </section>
  );
};
