/* /src/app/(dashboard)/container/index.tsx */

'use client';

import DockerVersionWidget from '~/docker/versions';
import DockerProcessWidget from '~/docker/process';

export default function ContainerIndex() {
  return (
    <div className="p-4 md:p-6">
      <div className="space-y-6">
        <DockerVersionWidget />
        <DockerProcessWidget />
      </div>
    </div>
  );
}