'use client';

import { SoundSettingsProvider } from '@/lib/context/soundSettings';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SoundSettingsProvider>{children}</SoundSettingsProvider>
    </SessionProvider>
  );
}
