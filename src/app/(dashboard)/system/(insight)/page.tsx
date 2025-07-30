/* /src/app/(dashboard)/system/(insight)/page.tsx */

import type { Metadata } from 'next';
import InsightIndex from '~/app/(dashboard)/system/(insight)/index';

export const metadata: Metadata = {
  title: 'System',
};

export default function InsightPage() {
  return <InsightIndex />;
}
