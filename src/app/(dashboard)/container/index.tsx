/* /src/app/(dashboard)/container/index.tsx */

'use client';

import DockerVersionWidget from '~/docker/versions';

export default function ContainerIndex() {
  return (
    <div className="p-4 md:p-6">
      <DockerVersionWidget />
    </div>
  );
}