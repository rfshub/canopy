/* /src/widgets/sysinfo.tsx */

'use client';

import { useState, useEffect } from 'react';
import { request } from '~/api/request';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Terminal, Cpu, Clock, LaptopMinimal, Network, Unplug, RotateCw, ChevronsLeftRightEllipsis } from 'lucide-react';

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
    since: string;
  };
}

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center" style={{ color: 'var(--subtext-color)' }}>
      <Icon className="w-4 h-4 mr-2" />
      <span>{label}</span>
    </div>
    <span className="font-mono" style={{ color: 'var(--text-color)' }}>{value}</span>
  </div>
);

const InfoSkeleton = () => (
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
);

export default function SystemInfoWidget({ nodeName }: { nodeName: string }) {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'retrying' | 'disconnected'>('loading');
  const [isIpTooltipOpen, setIsIpTooltipOpen] = useState(false);
  const [isUptimeTooltipOpen, setIsUptimeTooltipOpen] = useState(false);

  useEffect(() => {
    const initialLoadTimeout = setTimeout(() => {
      setConnectionStatus(prev => prev === 'loading' ? 'disconnected' : prev);
    }, 3000);

    const fetchInfo = async () => {
      try {
        const res = await request('/v1/system/information');
        if (!res.ok) throw new Error('Server responded with an error');
        const data = await res.json();
        clearTimeout(initialLoadTimeout);
        setInfo(data.data);
        setConnectionStatus('connected');
      } catch {
        setConnectionStatus(prevStatus =>
          prevStatus === 'connected' || prevStatus === 'loading' ? 'retrying' : prevStatus
        );
      }
    };

    fetchInfo();
    const intervalId = setInterval(fetchInfo, 1000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(initialLoadTimeout);
    };
  }, []);

  useEffect(() => {
    if (connectionStatus === 'retrying') {
      const timer = setTimeout(() => {
        setConnectionStatus(prevStatus => prevStatus === 'retrying' ? 'disconnected' : prevStatus);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);

  return (
    <div className="p-0.5 rounded-lg h-full" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="relative p-3.5 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
        {info ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h2 className="text-lg font-semibold flex items-center mb-3" style={{ color: 'var(--text-color)' }}>
              <Server className="w-5 h-5 mr-2" />
              {nodeName}
            </h2>
            <div className="space-y-2">
              <InfoRow icon={Network} label="Hostname" value={info.hostname} />
              <InfoRow icon={LaptopMinimal} label="Operating System" value={info.os} />
              <InfoRow icon={Terminal} label="Kernel" value={info.kernel} />
              <InfoRow icon={Cpu} label="Architecture" value={info.arch} />
              <Tooltip.Provider delayDuration={100}>
                <Tooltip.Root open={isUptimeTooltipOpen} onOpenChange={setIsUptimeTooltipOpen}>
                  <Tooltip.Trigger asChild>
                    <div className="cursor-pointer">
                      <InfoRow icon={Clock} label="Uptime" value={info.uptime.duration} />
                    </div>
                  </Tooltip.Trigger>
                  <AnimatePresence>
                    {isUptimeTooltipOpen && (
                      <Tooltip.Portal forceMount>
                        <Tooltip.Content
                          sideOffset={5}
                          className="p-2 rounded-md text-xs shadow-lg z-50"
                          style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-color)', border: '1px solid var(--tertiary-color)' }}
                        >
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <span className="font-semibold">Since: </span>
                            <span className="font-mono">{new Date(info.uptime.since).toLocaleString()}</span>
                            <Tooltip.Arrow style={{ fill: 'var(--tertiary-color)' }} />
                          </motion.div>
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    )}
                  </AnimatePresence>
                </Tooltip.Root>
              </Tooltip.Provider>
              <Tooltip.Provider delayDuration={100}>
                <Tooltip.Root open={isIpTooltipOpen} onOpenChange={setIsIpTooltipOpen}>
                  <Tooltip.Trigger asChild>
                    <div className="cursor-pointer">
                      <InfoRow
                        icon={ChevronsLeftRightEllipsis}
                        label="IP Addresses"
                        value={`${info.ip.ipv4[0] || info.ip.ipv6[0] || 'N/A'}`}
                      />
                    </div>
                  </Tooltip.Trigger>
                  <AnimatePresence>
                    {isIpTooltipOpen && (
                      <Tooltip.Portal forceMount>
                        <Tooltip.Content
                          sideOffset={5}
                          className="p-2 rounded-md text-xs shadow-lg z-50"
                          style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-color)', border: '1px solid var(--tertiary-color)' }}
                        >
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
        <AnimatePresence>
          {connectionStatus !== 'connected' && (
            <motion.div
              key="disconnected-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0.5 flex items-center justify-center rounded-md bg-[rgba(var(--primary-color-rgb),0.5)] backdrop-blur-[5px]"
            >
              {connectionStatus === 'retrying' && <RotateCw className="w-8 h-8 animate-spin" style={{ color: 'var(--subtext-color)' }} />}
              {connectionStatus === 'disconnected' && <Unplug className="w-8 h-8" style={{ color: 'var(--subtext-color)' }} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
