import { StaticImageData } from 'next/image';
import React, { useEffect, useState } from 'react';
import type { FC } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

import AranhaPng from '../assets/aranha.png';
import BuzzPng from '../assets/buzz.png';
import FerroPng from '../assets/ferro.png';
import MauiPng from '../assets/maui.png';
import MoanaPng from '../assets/moana.png';
import WoodyPng from '../assets/woody.png';

type AvatarProps = {
  id: number;
  src: StaticImageData;
  alt: string;
  prompt: string;
};

const images: AvatarProps[] = [
  {
    id: 1,
    src: AranhaPng,
    alt: 'Homem-Aranha',
    prompt: 'marvel spider man from the movie spiderman into the spider verse',
  },
  { id: 2, src: MoanaPng, alt: 'Moana', prompt: 'moana from the movie moana 2' },
  { id: 3, src: WoodyPng, alt: 'Woody', prompt: 'woody from the movie toy story 4' },
  { id: 4, src: BuzzPng, alt: 'Buzz Lightyear', prompt: 'buzz lightyear from the movie toy story 4' },
  { id: 5, src: MauiPng, alt: 'Maui', prompt: 'maui from the movie moana 2' },
  { id: 6, src: FerroPng, alt: 'Homem de Ferro', prompt: 'marvel iron man from the movie the avengers' },
];

type AvatarListProps = {
  onSelect: (prompt: string) => void;
};

export const AvatarList: FC<AvatarListProps> = ({ onSelect }) => {
  const [selected, setSelected] = useState<AvatarProps>();

  useEffect(() => {
    if (selected) onSelect(selected.prompt);
  }, [selected, onSelect]);

  return (
    <div className="flex w-full flex-col relative overflow-hidden">
      <p className="text-white text-3xl font-bold">Nice Picture</p>

      <p className="text-white/50 text-xs font-bold">Now, which character you want to be?</p>

      <div className="mt-6 flex gap-3 overflow-x-auto pr-4">
        {images.map((image) => (
          <Avatar
            key={image.alt}
            className={cn(
              'size-16 cursor-pointer transition-transform duration-200 hover:scale-105',
              selected?.id === image.id && 'border-4 border-white size-18',
            )}
            onClick={() => setSelected(image)}
            role="button"
            tabIndex={0}
            aria-label={`Select ${image.alt}`}>
            <AvatarImage src={image.src.src} width={140} height={140} className="object-cover" />
            <AvatarFallback className="text-sm">{image.alt.charAt(0)}</AvatarFallback>
          </Avatar>
        ))}
      </div>
    </div>
  );
};
