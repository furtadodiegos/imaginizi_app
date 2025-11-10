import React from 'react';
import type { FC, PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

type OverlayProps = {
  isVisible?: boolean;
  className?: string;
};

export const Overlay: FC<PropsWithChildren<OverlayProps>> = ({ children, isVisible = false, className }) => {
  return (
    <div
      className={cn(
        'absolute inset-0 z-10 h-full w-screen bg-black/50 transition-opacity duration-300 ease-in-out',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className,
      )}>
      {children}
    </div>
  );
};
