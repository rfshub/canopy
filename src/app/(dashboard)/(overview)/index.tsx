/* /src/app/(dashboard)/(overview)/index.tsx */

'use client';

import { useApp } from '~/app/provider';
import SystemInfoWidget from '~/widgets/sysinfo';
import MemoryWidget from '~/widgets/memory';
import CpuWidget from '~/widgets/cpu';
import NetworkWidget from '~/widgets/network';
import StorageWidget from '~/widgets/storage';

// --- Main Page Component ---
export default function OverviewIndex() {
  const { nodes, currentNodeId } = useApp();
  const currentNode = currentNodeId ? nodes[currentNodeId] : null;

  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CPU Widget */}
        <div className="lg:col-span-1">
          <CpuWidget />
        </div>
        {/* Memory Widget */}
        <div className="lg:col-span-1">
          <MemoryWidget />
        </div>
        {/* System Information Widget */}
        <div className="lg:col-span-1">
          <SystemInfoWidget nodeName={currentNode?.name || 'Loading...'} />
        </div>
        {/* Network Widget */}
        <div className="lg:col-span-2">
          <NetworkWidget />
        </div>
        {/* Storage Widget */}
        <div className="lg:col-span-1">
          <StorageWidget />
        </div>
      </div>
    </div>
  );
}
