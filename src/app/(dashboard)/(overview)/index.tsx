/* /src/app/(dashboard)/(overview)/index.tsx */

'use client';

import { useApp } from '~/app/provider';
import SystemInfoWidget from '~/widgets/sysinfo';

// --- Main Page Component ---
export default function OverviewIndex() {
  const { nodes, currentNodeId } = useApp();
  const currentNode = currentNodeId ? nodes[currentNodeId] : null;

  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Information Widget */}
        <div className="lg:col-span-1">
          <SystemInfoWidget nodeName={currentNode?.name || 'Loading...'} />
        </div>
      </div>
    </div>
  );
}
