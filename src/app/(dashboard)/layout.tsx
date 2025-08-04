/* /src/app/(dashboard)/layout.tsx */

import type { ReactNode } from 'react';
import { readFile } from 'fs/promises';
import { join } from 'path';
import Sidebar from '~/modules/sidebar';
import MobileHeader from '~/modules/mobile-header';
import Footer from '~/modules/footer';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  let version = '0.0.0';
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    version = JSON.parse(packageJsonContent).version;
  } catch (error) {
    console.error('Failed to read package.json in layout:', error);
  }

  return (
    <div
      className="flex h-dvh"
      style={{ backgroundColor: 'var(--primary-color)' }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col w-full overflow-y-auto scroll-smooth">
        <MobileHeader />
        <main className="flex-1">{children}</main>
        <Footer version={version} />
      </div>
    </div>
  );
}