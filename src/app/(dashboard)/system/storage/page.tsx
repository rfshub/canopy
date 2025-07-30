/* /src/app/(dashboard)/system/storage/page.tsx */

import type { Metadata } from 'next';
import StorageIndex from '~/app/(dashboard)/system/storage/index';

export const metadata: Metadata = {
  title: 'Storage',
};

export default function StoragePage() {
  return <StorageIndex />;
}
