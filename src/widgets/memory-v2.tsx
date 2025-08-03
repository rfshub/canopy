/* /src/widgets/memory-v2.tsx */

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { request } from '~/api/request';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { MemoryStick, HardDrive, RotateCw, Unplug, Microchip } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import * as Tooltip from '@radix-ui/react-tooltip';

interface MemoryInfo {
  total: number;
  used: number;
  total_swap: number;
  used_swap: number;
  unit: 'bytes';
}

interface RamSpec {
  capacity: string;
  ram_type: string;
  manufacturer: string;
}

interface HistoryPoint {
  time: number;
  ram: number;
  swap: number;
}

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => formatBytes(current, 2));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
};

const MetricDisplay = ({
  icon: Icon,
  label,
  color,
  currentValue,
  totalValue,
  historyData,
  spec,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  currentValue: number;
  totalValue: number;
  historyData: { time: number; value: number }[];
  spec?: RamSpec | null;
}) => {
  const gradientId = `metric-gradient-${label}`;
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center text-sm" style={{ color: 'var(--subtext-color)' }}>
        <Icon className="w-4 h-4 mr-1.5" />
        <span>{label}</span>
      </div>
      <p className="font-semibold text-2xl mt-1" style={{ color: 'var(--text-color)' }}>
        <AnimatedNumber value={currentValue} />
      </p>
      <Tooltip.Provider delayDuration={100}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className="flex-1 -mx-2 -mb-2 mt-1 cursor-default">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    fill={`url(#${gradientId})`}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
              {spec && (
                <>
                  <div className="font-mono mt-1">
                    <span style={{ color: 'var(--subtext-color)' }}>Type: </span>
                    <span style={{ color: 'var(--text-color)' }}>{spec.ram_type}</span>
                  </div>
                  <div className="font-mono mt-1">
                    <span style={{ color: 'var(--subtext-color)' }}>Vendor: </span>
                    <span style={{ color: 'var(--text-color)' }}>{spec.manufacturer}</span>
                  </div>
                </>
              )}
              <Tooltip.Arrow style={{ fill: 'var(--tertiary-color)' }} />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );
};

const MemorySkeleton = () => (
  <div className="p-3.5 rounded-md h-full flex flex-col" style={{ backgroundColor: 'var(--primary-color)' }}>
    <div className="h-6 w-1/3 bg-[var(--tertiary-color)] rounded mb-4 animate-pulse"></div>
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex-1 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
      <div className="flex-1 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
    </div>
  </div>
);

export default function MemoryWidget() {
  const [info, setInfo] = useState<MemoryInfo | null>(null);
  const [ramSpec, setRamSpec] = useState<RamSpec | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'retrying' | 'disconnected'>('loading');

  const failureCount = useRef(0);
  const disconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const isFetching = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    const fetchRamSpec = async () => {
      try {
        const res = await request('/v1/spec/ram');
        if (res.ok && isMounted.current) {
          const data = await res.json();
          setRamSpec(data.data as RamSpec);
        }
      } catch (error) {
        // Silently fail is acceptable for non-critical info
        console.error('Failed to fetch RAM spec:', error);
      }
    };

    const fetchWithLogic = async () => {
      if (isFetching.current || !isMounted.current) return;

      isFetching.current = true;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await request('/v1/monitor/memory', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const newInfo = data.data as MemoryInfo;
          if (!isMounted.current) return;

          failureCount.current = 0;
          if (disconnectTimer.current) {
            clearTimeout(disconnectTimer.current);
            disconnectTimer.current = null;
          }
          setConnectionStatus('connected');
          setInfo(newInfo);
          setHistory(prev => {
            const newPoint = { time: Date.now(), ram: newInfo.used, swap: newInfo.used_swap };
            const newHistory = [...prev, newPoint];
            return newHistory.length > 30 ? newHistory.slice(1) : newHistory;
          });
        } else {
          throw new Error('Non-200 response');
        }
      } catch {
        if (!isMounted.current) return;
        clearTimeout(timeoutId);

        failureCount.current++;

        setConnectionStatus(prev => {
          if (failureCount.current >= 3 && prev !== 'retrying' && prev !== 'disconnected') {
            disconnectTimer.current = setTimeout(() => {
              if (isMounted.current) {
                setConnectionStatus('disconnected');
              }
            }, 3000);
            return 'retrying';
          }
          return prev;
        });
      } finally {
        isFetching.current = false;
        if (isMounted.current) {
          setTimeout(fetchWithLogic, 1000);
        }
      }
    };

    fetchRamSpec();
    fetchWithLogic();

    return () => {
      isMounted.current = false;
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
      }
    };
  }, []);

  const ramHistory = useMemo(() => history.map(h => ({ time: h.time, value: h.ram })), [history]);
  const swapHistory = useMemo(() => history.map(h => ({ time: h.time, value: h.swap })), [history]);

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
                color="var(--green-color)"
                currentValue={info.used}
                totalValue={info.total}
                historyData={ramHistory}
                spec={ramSpec}
              />
              <MetricDisplay
                icon={HardDrive}
                label="Swap"
                color="var(--yellow-color)"
                currentValue={info.used_swap}
                totalValue={info.total_swap}
                historyData={swapHistory}
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
