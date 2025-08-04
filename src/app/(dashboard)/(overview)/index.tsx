/* /src/app/(dashboard)/(overview)/index.tsx */

'use client';

import { useApp } from '~/app/provider';
import SystemInfoWidget from '~/widgets/sysinfo';
import MemoryWidget from '~/widgets/memory-v2';
import CpuWidget from '~/widgets/cpu-v2';
import NetworkWidget from '~/widgets/network-v2';
import StorageWidget from '~/widgets/storage-v2';
import IpConfigWidget from '~/widgets/ipconfig';
import IpInfoWidget from '~/widgets/ipinfo';
import PowerWidget from '~/widgets/power';

// --- Main Page Component ---
export default function OverviewIndex() {
  const { nodes, currentNodeId } = useApp();
  const currentNode = currentNodeId ? nodes[currentNodeId] : null;

  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-8 gap-6">
        {/* CPU Widget */}
        <div className="sm:col-span-1 md:col-span-1 lg:col-span-1 2xl:col-span-2 order-1 sm:order-1 md:order-1 2xl:order-1">
          <CpuWidget />
        </div>
        {/* Memory Widget */}
        <div className="sm:col-span-1 md:col-span-1 lg:col-span-1 2xl:col-span-2 order-2 sm:order-2 md:order-2 2xl:order-2">
          <MemoryWidget />
        </div>
        {/* System Information Widget */}
        <div className="sm:col-span-1 md:col-span-1 lg:col-span-1 2xl:col-span-2 order-3 sm:order-5 md:order-3 2xl:order-4">
          <SystemInfoWidget nodeName={currentNode?.name || 'Loading...'} />
        </div>
        {/* Network Widget */}
        <div className="sm:col-span-2 md:col-span-2 lg:col-span-2 2xl:col-span-3 order-4 sm:order-3 md:order-4 2xl:order-5">
          <NetworkWidget />
        </div>
        {/* Storage Widget */}
        <div className="sm:hidden md:block md:col-span-1 lg:col-span-1 2xl:col-span-2 order-5 md:order-5 2xl:order-3">
          <StorageWidget />
        </div>
        {/* IP Config Widget */}
        <div className="sm:col-span-1 md:col-span-1 lg:col-span-1 2xl:col-span-2 order-6 sm:order-4 md:order-6 2xl:order-6">
          <IpConfigWidget />
        </div>
        {/* IP Info Widget */}
        <div className="sm:hidden md:block md:col-span-1 lg:col-span-1 2xl:col-span-2 order-7 md:order-7 2xl:order-7">
          <IpInfoWidget />
        </div>
        {/* Power Widget */}
        <div className="col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-1 2xl:col-span-1 order-6 sm:order-6 md:order-6 lg:order-8 2xl:order-8">
          <PowerWidget />
        </div>
      </div>
    </div>
  );
}