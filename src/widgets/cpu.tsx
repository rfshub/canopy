/* /src/widgets/cpu.tsx */

'use client';

import { useState, useEffect, useRef } from 'react';
import { request } from '~/api/request';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, RotateCw, Unplug } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

// --- Type Definitions for API data ---
interface CoreUsage {
  core: string;
  usage: number;
}

interface FreqInfo {
  max_frequency_ghz: number;
  current_frequency_ghz: number;
}

interface CpuInfo {
  cpu: string;
  cores: number;
  global_usage: number;
  per_core: CoreUsage[];
  frequency: FreqInfo;
}

interface ChartHistoryPoint {
  time: number;
  [coreKey: string]: number; // e.g., '0': 60.5, '1': 45.2
}

// --- Helper Component for Global Usage Bar ---
const UsageBar = ({ label, usage }: { label: string; usage: number }) => {
  const getBarColor = () => {
    if (usage >= 90) return 'var(--red-color)';
    if (usage >= 70) return 'var(--yellow-color)';
    return 'var(--green-color)';
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <div className="flex items-center" style={{ color: 'var(--subtext-color)' }}>
          <span>{label}</span>
        </div>
        <span className="font-mono text-xs" style={{ color: 'var(--text-color)' }}>
          {usage.toFixed(2)}%
        </span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--tertiary-color)' }}>
        <motion.div
          className="h-2 rounded-full"
          style={{ backgroundColor: getBarColor() }}
          initial={{ width: 0 }}
          animate={{ width: `${usage}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
};

// --- Different Layouts for Core Usage ---

// Chart for 1-4 Cores
const CoreUsageChart = ({ cores, history }: { cores: CoreUsage[], history: ChartHistoryPoint[] }) => {
  const coreColors = ['var(--green-color)', 'var(--yellow-color)', 'var(--red-color)', 'var(--theme-color)'];
  return (
    <div className="h-full -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <YAxis domain={[0, 100]} hide />
          {cores.map((core, index) => (
            <Line
              key={core.core}
              type="monotone"
              dataKey={core.core}
              stroke={coreColors[index % coreColors.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Grid for 5+ Cores
const CoreUsageGrid = ({ cores }: { cores: CoreUsage[] }) => {
  const getCoreColor = (usage: number) => {
    if (usage >= 90) return 'var(--red-color)';
    if (usage >= 70) return 'var(--yellow-color)';
    if (usage > 2) return 'var(--green-color)';
    return 'var(--tertiary-color)';
  };

  return (
    <Tooltip.Provider delayDuration={100}>
      <div className="flex flex-wrap gap-1">
        {cores.map(core => (
          <Tooltip.Root key={core.core}>
            <Tooltip.Trigger asChild>
              <div
                className="h-4 w-4 rounded-sm transition-colors duration-300"
                style={{ backgroundColor: getCoreColor(core.usage) }}
              />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={5}
                className="p-1.5 rounded-md text-xs shadow-lg z-50"
                style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-color)', border: '1px solid var(--tertiary-color)' }}
              >
                Core {core.core}: {core.usage.toFixed(2)}%
                <Tooltip.Arrow style={{ fill: 'var(--tertiary-color)' }} />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        ))}
      </div>
    </Tooltip.Provider>
  );
};

// --- Skeleton Loader Component ---
const CpuSkeleton = () => (
  <div className="p-3.5 rounded-md h-full flex flex-col" style={{ backgroundColor: 'var(--primary-color)' }}>
    {/* Header Skeleton */}
    <div className="h-6 w-1/3 bg-[var(--tertiary-color)] rounded mb-1 animate-pulse"></div>
    <div className="h-4 w-1/2 bg-[var(--tertiary-color)] rounded mb-3 animate-pulse"></div>
    {/* Global Usage Skeleton */}
    <div className="h-4 w-1/4 bg-[var(--tertiary-color)] rounded animate-pulse mb-1"></div>
    <div className="h-2 w-full bg-[var(--tertiary-color)] rounded-full animate-pulse"></div>
    {/* Frequency Skeleton (optional, matches height) */}
    <div className="h-[20px] mt-3"></div>
    {/* Core Usage Skeleton */}
    <div className="mt-3 flex-1 flex flex-col">
      <div className="h-4 w-1/3 bg-[var(--tertiary-color)] rounded animate-pulse mb-2"></div>
      <div className="flex-1 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
    </div>
  </div>
);

// --- CPU Widget Component ---
export default function CpuWidget() {
  const [cpuInfo, setCpuInfo] = useState<CpuInfo | null>(null);
  const [history, setHistory] = useState<ChartHistoryPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'retrying' | 'disconnected'>('loading');

  const failureCount = useRef(0);
  const disconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const isFetching = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    const fetchWithLogic = async () => {
      if (isFetching.current || !isMounted.current) return;

      isFetching.current = true;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      try {
        const res = await request('/v1/monitor/cpu', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.status === 200) {
          const cpuData = await res.json();
          if (!isMounted.current) return;

          // Success logic
          failureCount.current = 0;
          if (disconnectTimer.current) {
            clearTimeout(disconnectTimer.current);
            disconnectTimer.current = null;
          }
          setConnectionStatus('connected');
          setCpuInfo(cpuData.data);
          setHistory(prev => {
            const newPoint: ChartHistoryPoint = { time: Date.now() };
            cpuData.data.per_core.forEach((core: CoreUsage) => {
              newPoint[core.core] = core.usage;
            });
            const newHistory = [...prev, newPoint];
            return newHistory.length > 30 ? newHistory.slice(1) : newHistory;
          });
        } else {
          throw new Error('Non-200 response');
        }
      } catch (error) {
        if (!isMounted.current) return;
        clearTimeout(timeoutId);

        // Failure logic
        failureCount.current++;

        if (failureCount.current >= 3 && connectionStatus !== 'retrying' && connectionStatus !== 'disconnected') {
          setConnectionStatus('retrying');

          disconnectTimer.current = setTimeout(() => {
            if (isMounted.current) {
              setConnectionStatus('disconnected');
            }
          }, 3000);
        }
      } finally {
        isFetching.current = false;
        if (isMounted.current) {
          setTimeout(fetchWithLogic, 1000);
        }
      }
    };

    fetchWithLogic();

    return () => {
      isMounted.current = false;
      isFetching.current = false;
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
      }
    };
  }, []);

  return (
    <div className="p-0.5 rounded-lg h-full" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="relative p-3.5 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
        {cpuInfo ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
            <div>
              <h2 className="text-lg font-semibold flex items-center mb-1" style={{ color: 'var(--text-color)' }}>
                <Cpu className="w-5 h-5 mr-2" />
                CPU
              </h2>
              <p className="text-xs truncate mb-3" style={{ color: 'var(--subtext-color)' }}>{cpuInfo.cpu}</p>
              <UsageBar label="Global Usage" usage={cpuInfo.global_usage} />
              {cpuInfo.frequency.current_frequency_ghz !== -1 && (
                <div className="flex items-baseline justify-between mt-3 text-sm">
                  <div className="flex items-center" style={{ color: 'var(--subtext-color)' }}>
                    <Zap className="w-4 h-4 mr-2" />
                    <span>Frequency</span>
                  </div>
                  <span className="font-mono" style={{ color: 'var(--text-color)' }}>
                    {`${cpuInfo.frequency.current_frequency_ghz.toFixed(2)} / ${cpuInfo.frequency.max_frequency_ghz.toFixed(2)} GHz`}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 flex-1 flex flex-col">
              <p className="text-sm mb-2" style={{ color: 'var(--subtext-color)' }}>Core Usage</p>
              <div className="flex-1">
                {cpuInfo.cores < 5 ? (
                  <CoreUsageChart cores={cpuInfo.per_core} history={history} />
                ) : (
                  <CoreUsageGrid cores={cpuInfo.per_core} />
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <CpuSkeleton />
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
