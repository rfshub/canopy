/* /src/widgets/memory.tsx */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { request } from '~/api/request';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { MemoryStick, HardDrive, RotateCw, Unplug, Microchip } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

// --- Type Definitions for API data ---
interface MemoryInfo {
  total: number;
  used: number;
  total_swap: number;
  used_swap: number;
  unit: 'bytes';
}

interface HistoryPoint {
  time: number;
  ram: number;
  swap: number;
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

// --- Metric Display Component (for RAM or Swap) ---
const MetricDisplay = ({
  icon: Icon,
  label,
  color,
  currentValue,
  historyData,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  currentValue: number;
  historyData: { time: number; value: number }[];
}) => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center text-sm" style={{ color: 'var(--subtext-color)' }}>
        <Icon className="w-4 h-4 mr-1.5" />
        <span>{label}</span>
      </div>
      <p className="font-semibold text-2xl mt-1" style={{ color: 'var(--text-color)' }}>
        <AnimatedNumber value={currentValue} />
      </p>
      <div className="flex-1 -mx-2 -mb-2 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historyData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
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
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'retrying' | 'disconnected'>('loading');

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await request('/v1/monitor/memory');
        if (!res.ok) throw new Error('Server responded with an error');
        const data = await res.json();
        const newInfo = data.data as MemoryInfo;

        // Clear timeout only on successful fetch
        if (initialLoadTimeout) clearTimeout(initialLoadTimeout);
        setInfo(newInfo);
        setHistory(prev => {
            const newPoint = { time: Date.now(), ram: newInfo.used, swap: newInfo.used_swap };
            const newHistory = [...prev, newPoint];
            return newHistory.length > 30 ? newHistory.slice(1) : newHistory;
        });
        setConnectionStatus('connected');
      } catch {
        setConnectionStatus(prev => (prev === 'connected' || prev === 'loading' ? 'retrying' : prev));
      }
    };

    const initialLoadTimeout = setTimeout(() => {
      setConnectionStatus(prev => (prev === 'loading' ? 'disconnected' : prev));
    }, 3000);

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
        setConnectionStatus(prev => (prev === 'retrying' ? 'disconnected' : prev));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);

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
                historyData={ramHistory}
              />
              <MetricDisplay
                icon={HardDrive}
                label="Swap"
                color="var(--yellow-color)"
                currentValue={info.used_swap}
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
