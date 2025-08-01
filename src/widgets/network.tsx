/* /src/widgets/network.tsx */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { request } from '~/api/request';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUp, RotateCw, Unplug, ChevronsLeftRightEllipsis } from 'lucide-react';
import { AreaChart, Area, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface NetworkInfo {
  total_received: number;
  total_transmitted: number;
  current_received: number;
  current_transmitted: number;
  unit: 'bytes';
}

interface HistoryPoint {
  time: number;
  download: number;
  upload: number;
}

const formatBytes = (bytes: number, decimals = 2, perSecond = false): string => {
  if (bytes < 0) bytes = 0;
  if (bytes === 0) return `0 Bytes${perSecond ? '/s' : ''}`;
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  return perSecond ? formattedSize + '/s' : formattedSize;
};

const AnimatedNumber = ({ value, formatter }: { value: number; formatter: (val: number) => string }) => {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => formatter(current));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
};

const NetworkSkeleton = () => (
  <div className="p-3.5 rounded-md h-full flex flex-col" style={{ backgroundColor: 'var(--primary-color)' }}>
    <div className="h-6 w-1/3 bg-[var(--tertiary-color)] rounded mb-3 animate-pulse"></div>
    <div className="flex-1 bg-[var(--tertiary-color)] rounded animate-pulse mb-3"></div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="h-4 w-1/2 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
        <div className="h-5 w-3/4 mt-1 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
        <div className="h-3 w-2/3 mt-1 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
      </div>
      <div>
        <div className="h-4 w-1/2 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
        <div className="h-5 w-3/4 mt-1 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
        <div className="h-3 w-2/3 mt-1 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
      </div>
    </div>
  </div>
);

export default function NetworkWidget() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
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
        const res = await request('/v1/monitor/network', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.status === 200) {
          const data = await res.json();
          const newInfo = data.data as NetworkInfo;
          if (!isMounted.current) return;

          failureCount.current = 0;
          if (disconnectTimer.current) {
            clearTimeout(disconnectTimer.current);
            disconnectTimer.current = null;
          }
          setConnectionStatus('connected');
          setNetworkInfo(newInfo);
          setHistory(prev => {
            const newPoint = {
              time: Date.now(),
              download: newInfo.current_received,
              upload: newInfo.current_transmitted,
            };
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
  }, [connectionStatus]);

  const chartDomain = useMemo((): [number, number | 'auto'] => {
    if (history.length < 2) return [0, 'auto'];
    const allValues = history.flatMap(h => [h.download, h.upload]);
    const max = Math.max(...allValues);
    return [0, max > 1024 ? max * 1.2 : 1024];
  }, [history]);

  return (
    <div className="p-0.5 rounded-lg h-full" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="relative p-3.5 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
        {networkInfo ? (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full"
          >
            <h2 className="text-lg font-semibold flex items-center mb-3" style={{ color: 'var(--text-color)' }}>
              <ChevronsLeftRightEllipsis className="w-5 h-5 mr-2" />
              Network
            </h2>
            <div className="flex-1 -mx-2 mb-3" style={{ minHeight: '80px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(var(--primary-color-rgb), 0.8)',
                      borderColor: 'var(--tertiary-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                    }}
                    formatter={(value: number, name: string) => [formatBytes(value, 2, true), name.charAt(0).toUpperCase() + name.slice(1)]}
                    labelFormatter={() => ''}
                    cursor={{ stroke: 'var(--tertiary-color)', strokeDasharray: '3 3' }}
                  />
                  <YAxis domain={chartDomain} hide />
                  <Area type="monotone" dataKey="download" stroke="var(--green-color)" fill="var(--green-color)" fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} dot={false} />
                  <Area type="monotone" dataKey="upload" stroke="var(--yellow-color)" fill="var(--yellow-color)" fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center text-sm" style={{ color: 'var(--subtext-color)' }}>
                  <ArrowDown className="w-4 h-4 mr-1.5" style={{ color: 'var(--green-color)' }} />
                  <span>Download</span>
                </div>
                <p className="font-semibold text-lg" style={{ color: 'var(--text-color)' }}>
                  <AnimatedNumber value={networkInfo.current_received} formatter={(val) => formatBytes(val, 2, true)} />
                </p>
                <p className="text-xs font-mono" style={{ color: 'var(--subtext-color)' }}>
                  Total: {formatBytes(networkInfo.total_received)}
                </p>
              </div>
              <div>
                <div className="flex items-center text-sm" style={{ color: 'var(--subtext-color)' }}>
                  <ArrowUp className="w-4 h-4 mr-1.5" style={{ color: 'var(--yellow-color)' }} />
                  <span>Upload</span>
                </div>
                <p className="font-semibold text-lg" style={{ color: 'var(--text-color)' }}>
                  <AnimatedNumber value={networkInfo.current_transmitted} formatter={(val) => formatBytes(val, 2, true)} />
                </p>
                <p className="text-xs font-mono" style={{ color: 'var(--subtext-color)' }}>
                  Total: {formatBytes(networkInfo.total_transmitted)}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <NetworkSkeleton />
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
