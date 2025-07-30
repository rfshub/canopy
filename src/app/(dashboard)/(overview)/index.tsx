/* /src/app/(dashboard)/(overview)/index.tsx */

'use client';

import { useState, useEffect } from 'react';
import { request } from '~/api/request';
import { useApp } from '~/app/provider';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Terminal, Cpu, Clock, Info, LaptopMinimal, Network } from 'lucide-react';

// --- Type Definitions for API data ---
interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  arch: string;
  ip: {
    ipv4: string[];
    ipv6: string[];
  };
  uptime: {
    duration: string;
  };
}

// --- Helper Component for Information Rows ---
const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center" style={{ color: 'var(--subtext-color)' }}>
      <Icon className="w-4 h-4 mr-2" />
      <span>{label}</span>
    </div>
    <span className="font-mono" style={{ color: 'var(--text-color)' }}>{value}</span>
  </div>
);

// --- Skeleton Loader Component ---
const InfoSkeleton = () => (
  <div className="p-0.5 rounded-lg h-full" style={{ backgroundColor: 'var(--secondary-color)' }}>
    <div className="p-3.5 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
      <div className="h-6 w-1/3 bg-[var(--tertiary-color)] rounded mb-4 animate-pulse"></div>
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-4 w-1/4 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
            <div className="h-4 w-1/2 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// --- System Information Widget ---
const SystemInfoWidget = ({ nodeName }: { nodeName: string }) => {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await request('/v1/system/information');
        if (!res.ok) {
          throw new Error('Failed to fetch system information.');
        }
        const data = await res.json();
        setInfo(data.data);
        setError(null);
      } catch (err) {
        setError('Could not connect to the node.');
        console.error(err);
      }
    };

    fetchInfo();
    const intervalId = setInterval(fetchInfo, 1000); // Refresh every 1 second

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  return (
    <div className="p-0.5 rounded-lg h-full" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="p-3.5 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center h-full flex flex-col justify-center items-center"
              style={{ color: 'var(--error-color)' }}
            >
              <Info className="w-8 h-8 mx-auto mb-2" />
              <p>{error}</p>
            </motion.div>
          ) : info ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-lg font-semibold flex items-center mb-3" style={{ color: 'var(--text-color)' }}>
                <Server className="w-5 h-5 mr-2" />
                {nodeName}
              </h2>
              <div className="space-y-2">
                <InfoRow icon={Network} label="Hostname" value={info.hostname} />
                <InfoRow icon={LaptopMinimal} label="Operating System" value={info.os} />
                <InfoRow icon={Terminal} label="Kernel" value={info.kernel} />
                <InfoRow icon={Cpu} label="Architecture" value={info.arch} />
                <InfoRow icon={Clock} label="Uptime" value={info.uptime.duration} />
                <Tooltip.Provider delayDuration={100}>
                  <Tooltip.Root open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
                    <Tooltip.Trigger asChild>
                      <div className="cursor-pointer">
                        <InfoRow
                          icon={Info}
                          label="IP Addresses"
                          value={`${info.ip.ipv4[0] || info.ip.ipv6[0] || 'N/A'}`} 
                        />
                      </div>
                    </Tooltip.Trigger>
                    <AnimatePresence>
                      {isTooltipOpen && (
                        <Tooltip.Portal forceMount>
                          <Tooltip.Content
                            sideOffset={5}
                            className="p-2 rounded-md text-xs shadow-lg z-50"
                            style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-color)', border: '1px solid var(--tertiary-color)' }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <div className="font-semibold">IPv4:</div>
                              {info.ip.ipv4.length > 0 ? info.ip.ipv4.map(ip => <div key={ip} className="font-mono">{ip}</div>) : 'None'}
                              <div className="font-semibold mt-1">IPv6:</div>
                              {info.ip.ipv6.length > 0 ? info.ip.ipv6.map(ip => <div key={ip} className="font-mono truncate max-w-xs">{ip}</div>) : 'None'}
                              <Tooltip.Arrow style={{ fill: 'var(--tertiary-color)' }} />
                            </motion.div>
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      )}
                    </AnimatePresence>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </div>
            </motion.div>
          ) : (
            <InfoSkeleton />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};


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
