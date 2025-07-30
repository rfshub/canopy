/* /src/app/(dashboard)/container/page.tsx */

import type { Metadata } from 'next';
import ContainerIndex from './index';

export const metadata: Metadata = {
  title: 'Container',
};

export default function ContainerPage() {
  return <ContainerIndex />;
}
