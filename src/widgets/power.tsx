/* /src/widgets/power.tsx */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { request } from '~/api/request';
import { motion, AnimatePresence } from 'framer-motion';
import { Cable, Unplug, RotateCw, Info } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface PowerInfo {
  cpu_power: number;
  source: string | null;
  unit: string;
}

interface PowerHistoryPoint {
  time: number;
  power: number;
}

const PowerHistoryChart = ({ history, color }: { history: PowerHistoryPoint[], color: string }) => (
  <div className="h-20 -mx-3.5 -mb-3.5 mt-auto">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={history}>
        <defs>
          <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="power"
          stroke={color}
          fill="url(#powerGradient)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const PowerSkeleton = () => (
    <div className="p-3.5 rounded-md h-full flex flex-col" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="h-6 w-1/3 bg-[var(--tertiary-color)] rounded mb-2 animate-pulse"></div>
        <div className="flex-grow flex flex-col items-center justify-center">
            <div className="h-10 w-1/2 bg-[var(--tertiary-color)] rounded mb-2 animate-pulse"></div>
            <div className="h-4 w-1/4 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
        </div>
        <div className="h-20 w-full bg-[var(--tertiary-color)] rounded animate-pulse mt-auto"></div>
    </div>
);

export default function PowerWidget() {
  const [powerInfo, setPowerInfo] = useState<PowerInfo | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true); // 2. 新增状态判断是否支持
  const [history, setHistory] = useState<PowerHistoryPoint[]>([]);
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
        const res = await request('/v1/monitor/cpu/power', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.status === 200) {
          const powerData = await res.json();
          if (!isMounted.current) return;

          if (powerData.status === 'Success' && powerData.data) {
            failureCount.current = 0;
            if (disconnectTimer.current) {
              clearTimeout(disconnectTimer.current);
              disconnectTimer.current = null;
            }
            setConnectionStatus('connected');
            setPowerInfo(powerData.data);
            if (powerData.data.cpu_power <= 0) {
              setIsSupported(false);
            } else {
              setIsSupported(true);
              setHistory(prev => {
                const newPoint = { time: Date.now(), power: powerData.data.cpu_power };
                const newHistory = [...prev, newPoint];
                return newHistory.length > 40 ? newHistory.slice(1) : newHistory;
              });
            }
          } else {
            throw new Error(powerData.message || 'API returned an error');
          }
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
              if (isMounted.current) setConnectionStatus('disconnected');
            }, 3000);
            return 'retrying';
          }
          return prev;
        });
      } finally {
        isFetching.current = false;
        if (isMounted.current) {
          setTimeout(fetchWithLogic, 2000);
        }
      }
    };
    fetchWithLogic();
    return () => {
      isMounted.current = false;
      isFetching.current = false;
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
    };
  }, []);

  const chartColor = useMemo(() => {
    if (!powerInfo || !isSupported) return 'var(--subtext-color)';
    const power = powerInfo.cpu_power;
    if (power > 40) return 'var(--red-color)';
    if (power > 15) return 'var(--yellow-color)';
    return 'var(--green-color)';
  }, [powerInfo, isSupported]);

  return (
    <div className="p-0.5 rounded-lg h-full" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="relative p-3.5 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
        {powerInfo ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
            <Tooltip.Provider delayDuration={100}>
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold flex items-center" style={{ color: 'var(--text-color)' }}>
                        <Cable className="w-5 h-5 mr-2" /> {/* 4. 使用 Cable 图标 */}
                        Power
                    </h2>
                    {isSupported && powerInfo.source && (
                      <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                              <Info className="w-4 h-4 cursor-pointer" style={{ color: 'var(--subtext-color)' }} />
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                          <Tooltip.Content
                              sideOffset={5}
                              className="p-1.5 rounded-md text-xs shadow-lg z-50"
                              style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-color)', border: '1px solid var(--tertiary-color)' }}
                          >
                              Source: {powerInfo.source}
                              <Tooltip.Arrow style={{ fill: 'var(--tertiary-color)' }} />
                          </Tooltip.Content>
                          </Tooltip.Portal>
                      </Tooltip.Root>
                    )}
                </div>
            </Tooltip.Provider>
            {isSupported ? (
              <>
                <div className="flex-grow flex flex-col items-center justify-center my-4">
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <span className="text-5xl font-light" style={{ color: 'var(--text-color)' }}>
                            {powerInfo.cpu_power.toFixed(1)}
                        </span>
                    </motion.div>
                    <span className="text-lg font-medium" style={{ color: 'var(--subtext-color)' }}>
                        {powerInfo.unit}
                    </span>
                </div>
                <PowerHistoryChart history={history} color={chartColor} />
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center my-4 px-2">
                <p className="text-base font-medium" style={{ color: 'var(--text-color)' }}>
                  Who cares about power on a server anyway?
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--subtext-color)' }}>
                  (Unsupported Hardware or VM)
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <PowerSkeleton />
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
