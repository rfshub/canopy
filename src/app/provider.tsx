/* /src/app/provider.tsx */

'use client';

import type { ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function PreferenceProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      storageKey="@rfs/theme"
      enableSystem
    >
      {children}
    </NextThemesProvider>
  );
}