/* components/DockerProcessWidget.tsx */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { request } from '~/api/request';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, Unplug, Play, Square, Pause, RotateCcw, Power, Trash2 } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// --- INTERFACES FOR CONTAINER AND STATS ---

interface Port {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type: 'tcp' | 'udp' | 'sctp';
}

interface DockerNetwork {
  IPAddress: string;
  [key: string]: unknown;
}

interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  Ports: Port[] | null;
  Labels: Record<string, string>;
  State: string;
  Status: string;
  HostConfig: {
    NetworkMode: string;
  };
  NetworkSettings: {
    Networks: Record<string, DockerNetwork>;
  };
  Mounts: Array<{
    Type: string;
    Name?: string;
    Source: string;
    Destination: string;
    Driver: string;
    Mode: string;
    RW: boolean;
    Propagation: string;
  }>;
}

interface DockerProcessInfo {
  is_installed: boolean;
  is_running: boolean;
  containers: DockerContainer[];
}

// Interfaces for the detailed stats from /v1/containers/info/{id}
interface CPUStats {
  cpu_usage: { total_usage: number };
  system_cpu_usage: number;
  online_cpus: number;
}

interface MemoryStats {
  usage: number;
  limit: number;
  stats: Record<string, number>;
}

interface NetworkInfo {
  rx_bytes: number;
  tx_bytes: number;
}

interface ContainerStatsData {
  cpu_stats: CPUStats;
  precpu_stats: CPUStats;
  memory_stats: MemoryStats;
  networks: Record<string, NetworkInfo>;
  pids_stats?: { current: number; limit: number };
}

interface ProcessedStats {
  cpuPercent: number;
  memUsage: number;
  memLimit: number;
  memPercent: number;
  netRx: number;
  netTx: number;
  pids: number;
  pidsLimit: number;
}

// --- HELPER FUNCTIONS ---

function formatBytes(bytes: number, decimals = 2, short = false) {
  if (!+bytes) return short ? '0 B' : '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = short ? ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] : ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function processStats(data: ContainerStatsData): ProcessedStats {
  // CPU Calculation
  const cpuDelta = data.cpu_stats.cpu_usage.total_usage - data.precpu_stats.cpu_usage.total_usage;
  const systemCpuDelta = data.cpu_stats.system_cpu_usage - data.precpu_stats.system_cpu_usage;
  const numberCpus = data.cpu_stats.online_cpus;
  let cpuPercent = 0.0;
  if (systemCpuDelta > 0.0 && cpuDelta > 0.0) {
    cpuPercent = (cpuDelta / systemCpuDelta) * numberCpus * 100.0;
  }

  // Memory Calculation
  const memUsage = data.memory_stats.usage;
  const memLimit = data.memory_stats.limit;
  const memPercent = (memUsage / memLimit) * 100.0;

  // Network Calculation
  const networks = Object.values(data.networks || {});
  const netRx = networks.reduce((acc, net) => acc + net.rx_bytes, 0);
  const netTx = networks.reduce((acc, net) => acc + net.tx_bytes, 0);

  // PIDs Calculation
  const pids = data.pids_stats?.current || 0;
  const pidsLimit = data.pids_stats?.limit || 0;

  return { cpuPercent, memUsage, memLimit, memPercent, netRx, netTx, pids, pidsLimit };
}

function parseTimeAgo(statusString: string): number {
  const match = statusString.match(/(\d+)\s(second|minute|hour|day|week|month|year)s?\sago/);
  if (!match) return -Infinity;

  const value = parseInt(match[1], 10);
  const unit = match[2];
  let multiplier = 0;

  switch (unit) {
    case 'second': multiplier = 1000; break;
    case 'minute': multiplier = 1000 * 60; break;
    case 'hour': multiplier = 1000 * 60 * 60; break;
    case 'day': multiplier = 1000 * 60 * 60 * 24; break;
    case 'week': multiplier = 1000 * 60 * 60 * 24 * 7; break;
    case 'month': multiplier = 1000 * 60 * 60 * 24 * 30; break;
    case 'year': multiplier = 1000 * 60 * 60 * 24 * 365; break;
  }
  return Date.now() - (value * multiplier);
}

function sortContainers(containers: DockerContainer[]): DockerContainer[] {
  if (containers.length <= 1) {
    return containers;
  }
  const containersCopy = [...containers];

  const getStatePriority = (state: string): number => {
    const lowerCaseState = state.toLowerCase();
    if (lowerCaseState === 'running') return 0;
    if (lowerCaseState === 'paused') return 1;
    return 2; // For 'exited', 'stopped', etc.
  };

  containersCopy.sort((a, b) => {
    const priorityA = getStatePriority(a.State);
    const priorityB = getStatePriority(b.State);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    switch (priorityA) {
      case 0: // Both are 'running'
      case 1: // Both are 'paused'
        return a.Created - b.Created;
      case 2: // Both are 'stopped' or 'exited'
        const aExitedTime = parseTimeAgo(a.Status);
        const bExitedTime = parseTimeAgo(b.Status);
        return bExitedTime - aExitedTime;
      default:
        return 0;
    }
  });
  return containersCopy;
}

// --- UI COMPONENTS ---

const ContainerActionMenu = ({ container, isDockerOffline, onActionSuccess }: {
  container: DockerContainer;
  isDockerOffline: boolean;
  onActionSuccess?: () => void;
}) => {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);

  const executeAction = async (action: string, endpoint: string) => {
    if (isExecuting || isDockerOffline) return;
    setIsExecuting(action);
    try {
      const response = await request(endpoint, { method: 'POST' });
      if (response.ok) {
        console.log(`${action} executed successfully`);
        onActionSuccess?.();
      } else {
        console.error(`Failed to ${action} container:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
    } finally {
      setIsExecuting(null);
    }
  };

  const executeDelete = async () => {
    if (isExecuting || isDockerOffline) return;
    setIsExecuting('delete');
    try {
      const response = await request(`/v1/containers/${container.Id}`, { method: 'DELETE' });
      if (response.ok) {
        console.log('Container deleted successfully');
        onActionSuccess?.();
      } else {
        console.error('Failed to delete container:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting container:', error);
    } finally {
      setIsExecuting(null);
    }
  };

  const getMenuItems = () => {
    const state = container.State.toLowerCase();
    const items = [];

    if (state === 'running') {
      items.push({
        label: 'Stop',
        icon: Square,
        action: () => executeAction('stop', `/v1/containers/${container.Id}/stop`),
        disabled: false
      });
      items.push({
        label: 'Pause',
        icon: Pause,
        action: () => executeAction('pause', `/v1/containers/${container.Id}/pause`),
        disabled: false
      });
      items.push({
        label: 'Kill',
        icon: Power,
        action: () => executeAction('kill', `/v1/containers/${container.Id}/kill`),
        disabled: false
      });
      items.push({
        label: 'Restart',
        icon: RotateCcw,
        action: () => executeAction('restart', `/v1/containers/${container.Id}/restart`),
        disabled: false
      });
    } else if (state === 'paused') {
      items.push({
        label: 'Start',
        icon: Play,
        action: () => {},
        disabled: true
      });
      items.push({
        label: 'Resume',
        icon: Play,
        action: () => executeAction('resume', `/v1/containers/${container.Id}/resume`),
        disabled: false
      });
      items.push({
        label: 'Kill',
        icon: Power,
        action: () => {},
        disabled: true
      });
      items.push({
        label: 'Restart',
        icon: RotateCcw,
        action: () => {},
        disabled: true
      });
    } else { // stopped, exited
      items.push({
        label: 'Start',
        icon: Play,
        action: () => executeAction('start', `/v1/containers/${container.Id}/start`),
        disabled: false
      });
      items.push({
        label: 'Pause',
        icon: Pause,
        action: () => {},
        disabled: true
      });
      items.push({
        label: 'Delete',
        icon: Trash2,
        action: executeDelete,
        disabled: false
      });
      items.push({
        label: 'Restart',
        icon: RotateCcw,
        action: () => {},
        disabled: true
      });
    }

    return items;
  };

  const menuItems = getMenuItems();

  let statusText: string;
  let statusStyle: React.CSSProperties;

  if (isDockerOffline) {
    statusText = 'Offline';
    statusStyle = {
      backgroundColor: 'rgba(156, 163, 175, 0.1)',
      color: 'var(--subtext-color)',
    };
  } else {
    const normalizedState = container.State.toLowerCase();
    switch (normalizedState) {
      case 'running':
        statusText = 'Running';
        statusStyle = {
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          color: 'var(--green-color)',
        };
        break;
      case 'exited':
      case 'stopped':
        statusText = 'Stopped';
        statusStyle = {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--red-color)',
        };
        break;
      case 'paused':
        statusText = 'Paused';
        statusStyle = {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: 'var(--yellow-color)',
        };
        break;
      default:
        statusText = container.State;
        statusStyle = {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: 'var(--yellow-color)',
        };
        break;
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
          style={statusStyle}
          disabled={isDockerOffline}
        >
          {statusText}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          side="bottom"
          sideOffset={4}
          className="min-w-[100px] p-1 rounded-md shadow-lg z-50"
          style={{
            backgroundColor: 'var(--primary-color)',
            border: '1px solid var(--tertiary-color)'
          }}
        >
          {menuItems.map((item, index) => (
            <DropdownMenu.Item
              key={index}
              className={`flex items-center px-2 py-1.5 text-xs rounded cursor-pointer focus:outline-none ${
                item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--tertiary-color)]'
              }`}
              style={{ color: item.disabled ? 'var(--subtext-color)' : 'var(--text-color)' }}
              onSelect={item.disabled ? undefined : item.action}
              disabled={item.disabled}
            >
              <item.icon className="w-3 h-3 mr-2" />
              {isExecuting === item.label.toLowerCase() ? (
                <div className="flex items-center">
                  <RotateCw className="w-3 h-3 animate-spin mr-1" />
                  {item.label}...
                </div>
              ) : (
                item.label
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

const ContainerTooltipContent = ({ container }: { container: DockerContainer }) => (
  <div className="font-mono text-xs space-y-3">
    <div>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-color)' }}>
        Container Details
      </p>
      <div className="space-y-1" style={{ color: 'var(--subtext-color)' }}>
        <p>ID: {container.Id}</p>
        <p>Image: {container.Image}</p>
        <p>Created: {new Date(container.Created * 1000).toLocaleString()}</p>
        <p>Status: {container.Status}</p>
      </div>
    </div>

    <div>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-color)' }}>
        Command
      </p>
      <p className="break-all" style={{ color: 'var(--subtext-color)' }}>
        {container.Command}
      </p>
    </div>

    {container.Mounts.length > 0 && (
      <div>
        <p className="font-semibold mb-1" style={{ color: 'var(--text-color)' }}>
          Mounts
        </p>
        <div className="space-y-1">
          {container.Mounts.slice(0, 3).map((mount, index) => (
            <div key={index} style={{ color: 'var(--subtext-color)' }}>
              <span className="font-medium">{mount.Type}</span>: {mount.Destination}
            </div>
          ))}
          {container.Mounts.length > 3 && (
            <p style={{ color: 'var(--subtext-color)' }}>
              ... and {container.Mounts.length - 3} more
            </p>
          )}
        </div>
      </div>
    )}

    {Object.keys(container.NetworkSettings.Networks).length > 0 && (
      <div>
        <p className="font-semibold mb-1" style={{ color: 'var(--text-color)' }}>
          Network
        </p>
        <div className="space-y-1">
          {Object.entries(container.NetworkSettings.Networks).slice(0, 2).map(([name, network]: [string, DockerNetwork]) => (
            <div key={name} style={{ color: 'var(--subtext-color)' }}>
              <span className="font-medium">{name}</span>: {network.IPAddress || 'N/A'}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const StatDisplay = ({ label, value, tooltipContent }: {
  label: string,
  value: string,
  tooltipContent: React.ReactNode
}) => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <div className="text-right cursor-pointer flex-shrink-0" style={{ minWidth: 'max-content' }}>
        <p className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--subtext-color)' }}>{label}</p>
        <p className="text-xs whitespace-nowrap" style={{ color: 'var(--text-color)' }}>{value}</p>
      </div>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        side="top"
        align="center"
        sideOffset={8}
        className="p-2 rounded-md text-xs shadow-lg z-50 max-w-xs"
        style={{
          backgroundColor: 'var(--primary-color)',
          color: 'var(--text-color)',
          border: '1px solid var(--tertiary-color)'
        }}
      >
        <div className="font-mono">{tooltipContent}</div>
        <Tooltip.Arrow style={{ fill: 'var(--primary-color)', stroke: 'var(--tertiary-color)', strokeWidth: 1 }} />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
);

const StatSkeleton = ({ label }: { label: string }) => (
  <div className="text-right flex-shrink-0" style={{ minWidth: 'max-content' }}>
    <p className="text-xs font-medium mb-1 whitespace-nowrap" style={{ color: 'var(--subtext-color)' }}>{label}</p>
    <div className="h-3 bg-[var(--tertiary-color)] rounded" style={{ width: '60px' }}></div>
  </div>
);

const ContainerRow = ({ container, isDockerOffline, onActionSuccess }: {
  container: DockerContainer;
  isDockerOffline: boolean;
  onActionSuccess?: () => void;
}) => {
  const containerName = container.Names[0]?.replace('/', '') || 'Unknown';
  const [rawStats, setRawStats] = useState<ContainerStatsData | null>(null);
  const [processedStats, setProcessedStats] = useState<ProcessedStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isPortrait, setIsPortrait] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    setStatsLoading(true);

    if (container.State !== 'running' || isDockerOffline) {
      setRawStats(null);
      setProcessedStats(null);
      setStatsLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchStats = async () => {
      try {
        const res = await request(`/v1/containers/info/${container.Id}`, { signal: controller.signal });
        if (res.status === 200) {
          const data = await res.json();
          if (isMounted.current) {
            const statsData = data.data;
            setRawStats(statsData);
            setProcessedStats(processStats(statsData));
            setStatsLoading(false);
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          // console.error("Failed to fetch container stats:", error);
          if (isMounted.current) {
            setStatsLoading(false);
          }
        }
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 2000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
      controller.abort();
    };
  }, [container.Id, container.State, isDockerOffline]);

  const isRunning = container.State === 'running' && !isDockerOffline;
  const dynamicStats = isRunning && processedStats && rawStats && !statsLoading ? (
    <>
      <StatDisplay
        label="CPU"
        value={`${processedStats.cpuPercent.toFixed(1)}%`}
        tooltipContent={
          <div>
            <p>CPU Usage: {processedStats.cpuPercent.toFixed(2)}%</p>
            <p>Online CPUs: {rawStats.cpu_stats.online_cpus}</p>
          </div>
        }
      />
      <StatDisplay
        label="Memory"
        value={`${processedStats.memPercent.toFixed(1)}%`}
        tooltipContent={
          <div>
            <p>Total Usage: {formatBytes(rawStats.memory_stats.usage)}</p>
            <p>RSS: {rawStats.memory_stats.stats?.anon ? formatBytes(rawStats.memory_stats.stats.anon) : 'N/A'}</p>
            <p>Cache: {rawStats.memory_stats.stats?.file ? formatBytes(rawStats.memory_stats.stats.file) : 'N/A'}</p>
            <p>Limit: {formatBytes(rawStats.memory_stats.limit)}</p>
          </div>
        }
      />
      <StatDisplay
        label="Network I/O"
        value={`${formatBytes(processedStats.netRx, 1, true)} / ${formatBytes(processedStats.netTx, 1, true)}`}
        tooltipContent={
          <div>
            {rawStats.networks && Object.entries(rawStats.networks).map(([iface, net]) => (
              <div key={iface}>
                <p>{iface}:</p>
                <p>RX: {formatBytes(net.rx_bytes)}</p>
                <p>TX: {formatBytes(net.tx_bytes)}</p>
              </div>
            ))}
          </div>
        }
      />
      <StatDisplay
        label="PIDs"
        value={processedStats.pids.toString()}
        tooltipContent={
          <div>
            <p>Current: {processedStats.pids}</p>
            <p>Limit: {processedStats.pidsLimit > 1e18 ? 'Unlimited' : processedStats.pidsLimit}</p>
          </div>
        }
      />
    </>
  ) : isRunning && statsLoading ? (
    <>
      <StatSkeleton label="CPU" />
      <StatSkeleton label="Memory" />
      <StatSkeleton label="Network I/O" />
      <StatSkeleton label="PIDs" />
    </>
  ) : null;

  // 静态数据组件
  const staticStats = (
    <>
      <StatDisplay
        label="Uptime"
        value={isDockerOffline ? 'N/A' : container.Status}
        tooltipContent={
          <div>
            <p>Container Status: {container.Status}</p>
            <p>State: {container.State}</p>
          </div>
        }
      />
      <StatDisplay
        label="Network"
        value={container.HostConfig.NetworkMode}
        tooltipContent={
          <div>
            <p>Network Mode: {container.HostConfig.NetworkMode}</p>
            {Object.keys(container.NetworkSettings.Networks).length > 0 && (
              <div>
                <p>Networks:</p>
                {Object.entries(container.NetworkSettings.Networks).map(([name, network]: [string, DockerNetwork]) => (
                  <p key={name}>{name}: {network.IPAddress || 'N/A'}</p>
                ))}
              </div>
            )}
          </div>
        }
      />
    </>
  );

  return (
    <Tooltip.Provider delayDuration={100}>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`${isPortrait ? 'flex-col space-y-2' : 'flex-row'} py-1.5 px-3 rounded-md hover:bg-[var(--tertiary-color)] transition-colors`}
        style={{ backgroundColor: 'var(--primary-color)', display: 'flex' }}
      >
        {isPortrait ? (
          <>
            <div className="flex items-center justify-between w-full">
              <div className="flex-shrink-0 min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <h3 className="font-semibold text-sm truncate cursor-pointer" style={{ color: 'var(--text-color)', margin: 0 }}>
                        {containerName}
                      </h3>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="top"
                        align="center"
                        sideOffset={8}
                        className="p-3 rounded-md text-xs shadow-lg z-50 w-fit max-w-2xl"
                        style={{
                          backgroundColor: 'var(--primary-color)',
                          color: 'var(--text-color)',
                          border: '1px solid var(--tertiary-color)'
                        }}
                      >
                        <ContainerTooltipContent container={container} />
                        <Tooltip.Arrow style={{ fill: 'var(--primary-color)', stroke: 'var(--tertiary-color)', strokeWidth: 1 }} />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                  <ContainerActionMenu
                    container={container}
                    isDockerOffline={isDockerOffline}
                    onActionSuccess={onActionSuccess}
                  />
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--subtext-color)' }}>
                  {container.Image}
                </p>
              </div>
            </div>
            <div className="flex justify-end items-center gap-3 w-full overflow-x-auto">
              {dynamicStats}
              {staticStats}
            </div>
          </>
        ) : (
          <>
            <div className="flex-shrink-0 pr-4" style={{ width: '35%', minWidth: 0 }}>
              <div className="flex items-center space-x-2">
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <h3 className="font-semibold text-sm truncate cursor-pointer" style={{ color: 'var(--text-color)', margin: 0 }}>
                      {containerName}
                    </h3>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="top"
                      align="center"
                      sideOffset={8}
                      className="p-3 rounded-md text-xs shadow-lg z-50 w-fit max-w-2xl"
                      style={{
                        backgroundColor: 'var(--primary-color)',
                        color: 'var(--text-color)',
                        border: '1px solid var(--tertiary-color)'
                      }}
                    >
                      <ContainerTooltipContent container={container} />
                      <Tooltip.Arrow style={{ fill: 'var(--primary-color)', stroke: 'var(--tertiary-color)', strokeWidth: 1 }} />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
                <ContainerActionMenu
                  container={container}
                  isDockerOffline={isDockerOffline}
                  onActionSuccess={onActionSuccess}
                />
              </div>
              <p className="text-xs truncate" style={{ color: 'var(--subtext-color)' }}>
                {container.Image}
              </p>
            </div>
            <div className="flex-grow flex justify-end items-center gap-4 px-2">
              {dynamicStats}
              {staticStats}
            </div>
          </>
        )}
      </motion.div>
    </Tooltip.Provider>
  );
};

const ProcessSkeleton = () => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return (
    <div className="space-y-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`${isPortrait ? 'flex-col space-y-2' : 'flex-row'} py-1.5 px-3 rounded-md`}
          style={{ backgroundColor: 'var(--primary-color)', display: 'flex' }}>
          {isPortrait ? (
            <>
              <div className="flex items-center justify-between w-full">
                <div className="flex-shrink-0 min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-32 bg-[var(--tertiary-color)] rounded"></div>
                    <div className="h-5 w-16 bg-[var(--tertiary-color)] rounded-full"></div>
                  </div>
                  <div className="h-3 w-48 bg-[var(--tertiary-color)] rounded mt-1"></div>
                </div>
              </div>
              <div className="flex justify-end items-center gap-3 w-full overflow-x-auto">
                <StatSkeleton label="CPU" />
                <StatSkeleton label="Memory" />
                <StatSkeleton label="Network I/O" />
                <StatSkeleton label="PIDs" />
                <StatSkeleton label="Uptime" />
                <StatSkeleton label="Network" />
              </div>
            </>
          ) : (
            <>
              <div className="flex-shrink-0 pr-4 min-w-0" style={{ width: '35%' }}>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-32 bg-[var(--tertiary-color)] rounded"></div>
                  <div className="h-5 w-16 bg-[var(--tertiary-color)] rounded-full"></div>
                </div>
                <div className="h-3 w-48 bg-[var(--tertiary-color)] rounded mt-1"></div>
              </div>
              <div className="flex-grow flex justify-end items-center gap-4 px-2">
                <StatSkeleton label="CPU" />
                <StatSkeleton label="Memory" />
                <StatSkeleton label="Network I/O" />
                <StatSkeleton label="PIDs" />
                <StatSkeleton label="Uptime" />
                <StatSkeleton label="Network" />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

const DockerNotRunning = () => (
  <div className="text-center py-4 rounded-md">
    <p className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>
      Docker Not Running
    </p>
    <p className="text-xs" style={{ color: 'var(--subtext-color)' }}>
      Please start the Docker service to view containers.
    </p>
  </div>
);

export default function DockerProcessWidget() {
  const [processInfo, setProcessInfo] = useState<DockerProcessInfo | null>(null);
  const [cachedContainers, setCachedContainers] = useState<DockerContainer[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'retrying' | 'disconnected'>('loading');

  const failureCount = useRef(0);
  const disconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const isFetching = useRef(false);

  const handleActionSuccess = () => {
    // Force refresh after container action
    setTimeout(() => {
      if (isMounted.current) {
        // We call fetchWithLogic here, so it needs to be stable
        fetchWithLogic();
      }
    }, 500);
  };

  const fetchWithLogic = useCallback(async () => {
    if (isFetching.current || !isMounted.current) return;

    isFetching.current = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await request('/v1/containers', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.status === 200) {
        const data = await res.json();
        if (!isMounted.current) return;

        failureCount.current = 0;
        if (disconnectTimer.current) {
          clearTimeout(disconnectTimer.current);
          disconnectTimer.current = null;
        }
        setConnectionStatus('connected');

        if (data.data.containers && data.data.is_running) {
          setCachedContainers(data.data.containers);
        }

        setProcessInfo(data.data);
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
        setTimeout(fetchWithLogic, 3 * 1000);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchWithLogic();

    return () => {
      isMounted.current = false;
      isFetching.current = false;
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
      }
    };
  }, [fetchWithLogic]);

  const displayContainers = processInfo?.containers || cachedContainers;
  const sortedContainers = sortContainers(displayContainers);
  const hasEverHadContainers = cachedContainers.length > 0;
  const isDockerOffline = connectionStatus !== 'connected';

  return (
    <div className="p-0.5 rounded-lg" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="relative p-2 rounded-md min-h-[60px]" style={{ backgroundColor: 'var(--primary-color)' }}>

        {processInfo && sortedContainers.length > 0 ? (
          <div className="space-y-1">
            <AnimatePresence>
              {sortedContainers.map((container) => (
                <ContainerRow
                  key={container.Id}
                  container={container}
                  isDockerOffline={isDockerOffline}
                  onActionSuccess={handleActionSuccess}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : processInfo && sortedContainers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <p className="text-sm" style={{ color: 'var(--subtext-color)' }}>
              No active containers found.
            </p>
          </motion.div>
        ) : processInfo && !hasEverHadContainers ? (
          <motion.div
            key="daemon-stopped"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DockerNotRunning />
          </motion.div>
        ) : (
          <ProcessSkeleton />
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
              {connectionStatus === 'retrying' && (
                <RotateCw className="w-6 h-6 animate-spin" style={{ color: 'var(--subtext-color)' }} />
              )}
              {connectionStatus === 'disconnected' && (
                <Unplug className="w-6 h-6" style={{ color: 'var(--subtext-color)' }} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}