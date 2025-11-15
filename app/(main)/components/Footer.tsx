'use client';

import Link from 'next/link';
import type { FC } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const Footer: FC = () => {
  return (
    <footer className="bg-muted py-6">
      <div className="container mx-auto px-4 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
        <div className="container flex items-center justify-center gap-2">
          <Link
            href="https://www.linkedin.com/in/furtadodiegos/"
            target="_blank"
            className="flex flex-col items-center justify-center gap-2">
            <Avatar>
              <AvatarImage src="https://media.licdn.com/dms/image/v2/C4E03AQEuaG3cJdPXPQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1587041120549?e=1764201600&v=beta&t=x3St0LJ6B8yyDn6cYiLegBOdpZGU-zuQBQ_f6feWeBI" />
              <AvatarFallback>DF</AvatarFallback>
            </Avatar>

            <p className="text-sm font-medium text-muted-foreground">© 2025 Imaginizi</p>
          </Link>
        </div>

        <div className="container flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground text-center px-4">Projeto experimental sem fins comerciais.</p>

          <p className="text-xs text-muted-foreground text-center px-4">
            Personagens pertencem a seus respectivos detentores de direitos.
          </p>
        </div>
      </div>
    </footer>
  );
};
