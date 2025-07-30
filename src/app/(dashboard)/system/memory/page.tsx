/* /src/app/(dashboard)/system/memory/page.tsx */

import type { Metadata } from 'next';
import MemoryIndex from './index';

export const metadata: Metadata = {
  title: 'Memory',
};

export default function MemoryPage() {
  return <MemoryIndex />;
}
