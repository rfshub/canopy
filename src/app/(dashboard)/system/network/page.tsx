/* /src/app/(dashboard)/system/network/page.tsx */

import type { Metadata } from 'next';
import NetworkIndex from '~/app/(dashboard)/system/network/index';

export const metadata: Metadata = {
  title: 'Network',
};

export default function NetworkPage() {
  return <NetworkIndex />;
}
