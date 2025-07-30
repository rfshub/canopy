/* /src/app/setup/layout.tsx */

import type { ReactNode } from 'react';

export default function SetupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-dvh" style={{ backgroundColor: 'var(--primary-color)' }}>
      {children}
    </div>
  );
}
