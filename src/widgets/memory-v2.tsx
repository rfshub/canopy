/* /src/widgets/memory.tsx */

'use client';

import { useState, useEffect, useRef } from 'react';
import { request } from '~/api/request';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { MemoryStick, HardDrive, RotateCw, Unplug, Microchip } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

// --- Type Definitions for API data ---
interface MemoryInfo {
  total: number;
  used: number;
  total_swap: number;
  used_swap: number;
  unit: 'bytes';
}

// --- Helper function to format bytes ---
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// --- Animated Number Component ---
const AnimatedNumber = ({ value }: { value: number }) => {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => formatBytes(current, 2));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
};

// --- Usage Bar Component ---
const UsageBar = ({ usage }: { usage: number }) => {
  const getBarColor = () => {
    if (usage >= 90) return 'var(--red-color)';
    if (usage >= 70) return 'var(--yellow-color)';
    return 'var(--green-color)';
  };

  return (
    <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--tertiary-color)' }}>
      <motion.div
        className="h-2 rounded-full"
        style={{ backgroundColor: getBarColor() }}
        initial={{ width: '0%' }}
        animate={{ width: `${usage}%` }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
    </div>
  );
};


// --- Metric Display Component (for RAM or Swap) ---
const MetricDisplay = ({
  icon: Icon,
  label,
  currentValue,
  totalValue,
}: {
  icon: React.ElementType;
  label: string;
  currentValue: number;
  totalValue: number;
}) => {
  const percentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;

  return (
    <Tooltip.Provider delayDuration={100}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className="flex-1 flex flex-col justify-center cursor-default">
            <div className="flex items-center text-sm" style={{ color: 'var(--subtext-color)' }}>
              <Icon className="w-4 h-4 mr-1.5" />
              <span>{label}</span>
            </div>
            <div className="flex items-end justify-between mt-1">
              <p className="font-semibold text-2xl" style={{ color: 'var(--text-color)' }}>
                <AnimatedNumber value={currentValue} />
              </p>
              <span className="font-mono text-sm pb-0.5" style={{ color: 'var(--subtext-color)' }}>
                {percentage.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2">
              <UsageBar usage={percentage} />
            </div>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            sideOffset={5}
            className="p-2 rounded-md text-xs shadow-lg z-50"
            style={{ backgroundColor: 'var(--primary-color)', border: '1px solid var(--tertiary-color)' }}
          >
            <div className="font-mono">
              <span style={{ color: 'var(--subtext-color)' }}>Total: </span>
              <span style={{ color: 'var(--text-color)' }}>{formatBytes(totalValue)}</span>
            </div>
            <Tooltip.Arrow style={{ fill: 'var(--tertiary-color)' }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

// --- Skeleton Loader Component ---
const MemorySkeleton = () => (
  <div className="p-3.5 rounded-md h-full flex flex-col" style={{ backgroundColor: 'var(--primary-color)' }}>
    <div className="h-6 w-1/3 bg-[var(--tertiary-color)] rounded mb-4 animate-pulse"></div>
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex-1 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
      <div className="flex-1 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
    </div>
  </div>
);

// --- Memory Widget Component ---
export default function MemoryWidget() {
  const [info, setInfo] = useState<MemoryInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'retrying' | 'disconnected'>('loading');

  const failureCount = useRef(0);
  const disconnectTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    let nextFetchTimer: NodeJS.Timeout;

    const fetchWithLogic = async () => {
      if (!isMounted) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await request('/v1/monitor/memory', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Server responded with an error');

        const data = await res.json();
        const newInfo = data.data as MemoryInfo;

        if (!isMounted) return;

        failureCount.current = 0;
        if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
        setConnectionStatus('connected');
        setInfo(newInfo);

        nextFetchTimer = setTimeout(fetchWithLogic, 1000);
      } catch {
        if (!isMounted) return;
        clearTimeout(timeoutId);

        failureCount.current++;
        if (failureCount.current >= 3) {
          if (connectionStatus !== 'retrying' && connectionStatus !== 'disconnected') {
            setConnectionStatus('retrying');
            disconnectTimer.current = setTimeout(() => {
              if (isMounted) {
                setConnectionStatus(prevStatus =>
                  prevStatus === 'retrying' ? 'disconnected' : prevStatus
                );
              }
            }, 3000);
          }
        }
        nextFetchTimer = setTimeout(fetchWithLogic, 1000);
      }
    };

    fetchWithLogic();

    return () => {
      isMounted = false;
      clearTimeout(nextFetchTimer);
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-0.5 rounded-lg h-full" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="relative p-3.5 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
        {info ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
            <h2 className="text-lg font-semibold flex items-center mb-2" style={{ color: 'var(--text-color)' }}>
              <MemoryStick className="w-5 h-5 mr-2" />
              Memory
            </h2>
            <div className="flex-1 flex flex-col space-y-4">
              <MetricDisplay
                icon={Microchip}
                label="RAM"
                currentValue={info.used}
                totalValue={info.total}
              />
              <MetricDisplay
                icon={HardDrive}
                label="Swap"
                currentValue={info.used_swap}
                totalValue={info.total_swap}
              />
            </div>
          </motion.div>
        ) : (
          <MemorySkeleton />
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
}