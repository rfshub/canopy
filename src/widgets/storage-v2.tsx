/* /src/widgets/storage-v2.tsx */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { request } from '~/api/request';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Unplug, RotateCw, ArrowDownUp } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface IoStats {
  kb_per_transfer: number;
  transfers_per_second: number;
  mb_per_second: number;
}

interface PartitionInfo {
  mount_point: string;
  file_system: string;
  total_space: number;
  available_space: number;
  unit: string;
}

interface DiskInfo {
  disk_id: string;
  is_removable: boolean;
  partitions: PartitionInfo[];
  io_stats: IoStats | null;
}

interface IoHistoryPoint {
  time: number;
  speed: number;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatSpeed = (speedInMBps: number, decimals = 2) => {
  if (!speedInMBps || speedInMBps <= 0) return '0 KB/s';
  const speedInBytes = speedInMBps * 1024 * 1024;
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const i = Math.floor(Math.log(speedInBytes) / Math.log(k));
  if (i === 0) {
      return `${speedInBytes.toFixed(0)} B/s`;
  }
  return `${parseFloat((speedInBytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const UsageBar = ({ usage, height = 'h-2.5' }: { usage: number, height?: string }) => {
  const getBarColor = () => {
    if (usage >= 90) return 'var(--red-color)';
    if (usage >= 70) return 'var(--yellow-color)';
    return 'var(--green-color)';
  };

  return (
    <div className={`w-full ${height} rounded-full`} style={{ backgroundColor: 'var(--tertiary-color)' }}>
      <motion.div
        className={`${height} rounded-full`}
        style={{ backgroundColor: getBarColor() }}
        initial={{ width: 0 }}
        animate={{ width: `${usage}%` }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
    </div>
  );
};

const IoSpeedChart = ({ history, color }: { history: IoHistoryPoint[], color: string }) => (
  <div className="h-12 -mx-3.5 -mb-2 mt-2">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={history}>
        <defs>
          <linearGradient id="ioGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="speed"
          stroke={color}
          fill="url(#ioGradient)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const DetailedStorageInfo = ({ storageInfo }: { storageInfo: DiskInfo[] }) => (
  <div className="font-mono text-xs space-y-3">
    {storageInfo.map(disk => (
      <div key={disk.disk_id}>
        <div className="flex justify-between items-baseline">
          <p className="font-semibold truncate" style={{ color: 'var(--text-color)' }}>
            {disk.disk_id}
          </p>
          <p style={{ color: 'var(--subtext-color)' }}>
            {disk.io_stats ? formatSpeed(disk.io_stats.mb_per_second) : 'N/A'}
          </p>
        </div>
        <div className="mt-1 space-y-1">
          {disk.partitions.map(partition => {
            const usedSpace = partition.total_space - partition.available_space;
            const usagePercentage = partition.total_space > 0 ? (usedSpace / partition.total_space) * 100 : 0;
            return (
              <div key={partition.mount_point} className="pl-2">
                <p className="truncate" style={{ color: 'var(--text-color)' }}>
                  {partition.mount_point} [{partition.file_system}]
                </p>
                <p className="text-xs" style={{ color: 'var(--subtext-color)' }}>
                  {`> ${formatBytes(usedSpace)} / ${formatBytes(partition.total_space)} (${usagePercentage.toFixed(1)}%)`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

const StorageSkeleton = () => (
    <div className="p-3.5 rounded-md h-full flex flex-col justify-between" style={{ backgroundColor: 'var(--primary-color)' }}>
      <div>
        <div className="h-6 w-1/3 bg-[var(--tertiary-color)] rounded mb-4 animate-pulse"></div>
      </div>
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-1/4 bg-[var(--tertiary-color)] rounded mb-2"></div>
        <div className="h-3 w-full bg-[var(--tertiary-color)] rounded-full mb-2"></div>
        <div className="h-4 w-1/2 bg-[var(--tertiary-color)] rounded ml-auto"></div>
        <div className="h-12 w-full bg-[var(--tertiary-color)] rounded mt-2"></div>
      </div>
    </div>
  );

export default function StorageWidget() {
  const [storageInfo, setStorageInfo] = useState<DiskInfo[] | null>(null);
  const [ioHistory, setIoHistory] = useState<IoHistoryPoint[]>([]);
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
        const res = await request('/v1/monitor/storage', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.status === 200) {
          const storageData = await res.json();
          if (!isMounted.current) return;
          
          const sortedData = storageData.data.sort((a: DiskInfo, b: DiskInfo) => {
            const aIsMac = a.disk_id.includes('Macinto');
            const bIsMac = b.disk_id.includes('Macinto');
            if (aIsMac && !bIsMac) return -1;
            if (!aIsMac && bIsMac) return 1;
            return 0;
          });

          failureCount.current = 0;
          if (disconnectTimer.current) {
            clearTimeout(disconnectTimer.current);
            disconnectTimer.current = null;
          }
          setConnectionStatus('connected');
          setStorageInfo(sortedData);
          const currentTotalSpeed = sortedData.reduce((acc: number, disk: DiskInfo) => acc + (disk.io_stats?.mb_per_second || 0), 0);
          setIoHistory(prev => {
            const newPoint = { time: Date.now(), speed: currentTotalSpeed };
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
  }, [connectionStatus]);

  const { totalUsedSpace, totalSpace, totalUsagePercentage, totalIoSpeed } = useMemo(() => {
    if (!storageInfo) return { totalUsedSpace: 0, totalSpace: 0, totalUsagePercentage: 0, totalIoSpeed: 0 };
    const space = storageInfo.reduce((acc, disk) => {
        disk.partitions.forEach(p => {
            acc.total += p.total_space;
            acc.available += p.available_space;
        });
        return acc;
    }, { total: 0, available: 0 });

    const used = space.total - space.available;
    const usagePercent = space.total > 0 ? (used / space.total) * 100 : 0;
    const io = storageInfo.reduce((acc, disk) => acc + (disk.io_stats?.mb_per_second || 0), 0);

    return {
        totalUsedSpace: used,
        totalSpace: space.total,
        totalUsagePercentage: usagePercent,
        totalIoSpeed: io
    };
  }, [storageInfo]);

  const ioChartColor = useMemo(() => {
    const speedInGB = totalIoSpeed / 1024;
    if (speedInGB >= 2) return 'var(--red-color)';
    if (speedInGB > 1) return 'var(--yellow-color)';
    return 'var(--green-color)';
  }, [totalIoSpeed]);

  return (
    <div className="p-0.5 rounded-lg h-full" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="relative p-3.5 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
        {storageInfo ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
            <h2 className="text-lg font-semibold flex items-center" style={{ color: 'var(--text-color)' }}>
              <Database className="w-5 h-5 mr-2" />
              Storage
            </h2>
            <div className="flex-grow flex flex-col justify-center space-y-4">
              <div>
                <div className="flex justify-between items-baseline text-sm mb-1">
                  <p style={{ color: 'var(--subtext-color)' }}>Total Usage</p>
                  <span className="font-mono" style={{ color: 'var(--text-color)' }}>
                    {`${totalUsagePercentage.toFixed(1)}%`}
                  </span>
                </div>
                <UsageBar usage={totalUsagePercentage} />
                <div className="text-right mt-1">
                  <span className="font-mono text-sm" style={{ color: 'var(--text-color)' }}>
                    {formatBytes(totalUsedSpace)}
                  </span>
                  <span className="font-mono text-xs" style={{ color: 'var(--subtext-color)' }}>
                    {' / '}{formatBytes(totalSpace)}
                  </span>
                </div>
              </div>

              <Tooltip.Provider delayDuration={100}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div className="text-sm cursor-default">
                      <div className="flex items-center justify-between" style={{ color: 'var(--subtext-color)' }}>
                        <div className="flex items-center">
                          <ArrowDownUp className="w-4 h-4 mr-2" />
                          <span>I/O Speed</span>
                        </div>
                        <span className="font-mono" style={{ color: 'var(--text-color)' }}>
                          {formatSpeed(totalIoSpeed)}
                        </span>
                      </div>
                      <IoSpeedChart history={ioHistory} color={ioChartColor} />
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="top"
                      align="center"
                      sideOffset={5}
                      className="p-3 rounded-md text-xs shadow-lg z-50 w-72"
                      style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-color)', border: '1px solid var(--tertiary-color)' }}
                    >
                      <DetailedStorageInfo storageInfo={storageInfo} />
                      <Tooltip.Arrow style={{ fill: 'var(--tertiary-color)' }} />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
          </motion.div>
        ) : (
          <StorageSkeleton />
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
