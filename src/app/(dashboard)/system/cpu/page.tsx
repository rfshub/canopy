/* /src/app/(dashboard)/system/cpu/page.tsx */

import type { Metadata } from 'next';
import CpuIndex from './index';

export const metadata: Metadata = {
  title: 'CPU',
};

export default function CpuPage() {
  return <CpuIndex />;
}
