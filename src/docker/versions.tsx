/* /src/docker/versions.tsx */

'use client';

import { useState, useEffect, useRef } from 'react';
import { request } from '~/api/request';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, Unplug } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface DockerComponent {
  Name: string;
  Version: string;
  Details: {
    ApiVersion?: string;
    Arch?: string;
    BuildTime?: string;
    GitCommit?: string;
    GoVersion?: string;
    KernelVersion?: string;
    MinAPIVersion?: string;
    Os?: string;
  };
}

interface DockerVersion {
  Platform: {
    Name: string;
  };
  Components: DockerComponent[];
  Version: string;
  ApiVersion: string;
  MinAPIVersion: string;
  GitCommit: string;
  GoVersion: string;
  Os: string;
  Arch: string;
  KernelVersion: string;
  BuildTime: string;
}

interface DockerInfo {
  is_installed: boolean;
  is_running: boolean;
  version: DockerVersion | null;
}

const StatusBadge = ({ isInstalled, isRunning }: { isInstalled: boolean; isRunning: boolean }) => {
  if (!isInstalled) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--red-color)' }}>
        Not Installed
      </span>
    );
  }

  if (!isRunning) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--yellow-color)' }}>
        Stopped
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--green-color)' }}>
      Running
    </span>
  );
};

const DetailedVersionInfo = ({ version }: { version: DockerVersion }) => (
  <div className="font-mono text-xs space-y-3 max-w-md">
    <div>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-color)' }}>
        Platform
      </p>
      <p style={{ color: 'var(--subtext-color)' }}>
        {version.Platform.Name}
      </p>
    </div>
    <div>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-color)' }}>
        Engine Details
      </p>
      <div className="space-y-1" style={{ color: 'var(--subtext-color)' }}>
        <p>Version: {version.Version}</p>
        <p>API: {version.ApiVersion} (min: {version.MinAPIVersion})</p>
        <p>Go: {version.GoVersion}</p>
        <p>OS/Arch: {version.Os}/{version.Arch}</p>
        <p>Git: {version.GitCommit}</p>
        <p>Kernel: {version.KernelVersion}</p>
        <p>Built: {new Date(version.BuildTime).toLocaleDateString()}</p>
      </div>
    </div>
    <div>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-color)' }}>
        Components
      </p>
      <div className="space-y-1">
        {version.Components.map(component => (
          <div key={component.Name} style={{ color: 'var(--subtext-color)' }}>
            <span className="font-medium">{component.Name}</span>: {component.Version}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const DockerSkeleton = () => (
  <div className="p-4 rounded-md h-full flex items-center" style={{ backgroundColor: 'var(--primary-color)' }}>
    <div className="flex items-center space-x-4 w-full">
      <div className="flex-1">
        <div className="h-5 w-32 bg-[var(--tertiary-color)] rounded mb-2 animate-pulse"></div>
        <div className="h-4 w-48 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="h-4 w-16 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
        <div className="h-4 w-20 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
        <div className="h-4 w-16 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
        <div className="h-4 w-20 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
        <div className="h-4 w-16 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
      </div>
    </div>
  </div>
);

const DockerDaemonStopped = () => (
  <div className="relative h-full">
    <DockerSkeleton />
    <div className="absolute inset-0.5 flex flex-col items-center justify-center rounded-md bg-[rgba(var(--primary-color-rgb),0.8)] backdrop-blur-[5px]">
      <div className="text-center">
        <p className="text-lg font-medium" style={{ color: 'var(--text-color)' }}>
          Docker Daemon Not Running
        </p>
        <p className="text-sm" style={{ color: 'var(--subtext-color)' }}>
          Please start Docker to view container information
        </p>
      </div>
    </div>
  </div>
);

export default function DockerVersionsWidget() {
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);
  const [cachedVersion, setCachedVersion] = useState<DockerVersion | null>(null);
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
          // Cache version info when available
          if (data.data.version && data.data.is_running) {
            setCachedVersion(data.data.version);
          }
          setDockerInfo(data.data);
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
          // Refresh every 5 seconds
          setTimeout(fetchWithLogic, 5 * 1000);
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

  // Use cached version if current version is null but we have cached data
  const displayVersion = dockerInfo?.version || cachedVersion;
  const hasEverHadVersion = !!cachedVersion;

  return (
    <div className="p-0.5 rounded-lg h-24" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="relative py-4 px-6 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
        {dockerInfo && displayVersion ? (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between h-full"
          >
            <div className="flex items-center space-x-4">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-color)' }}>
                    Docker Engine
                  </h2>
                  <StatusBadge
                    isInstalled={dockerInfo.is_installed}
                    isRunning={dockerInfo.is_running}
                  />
                </div>
                <p className="text-sm" style={{ color: 'var(--subtext-color)' }}>
                  {displayVersion.Platform.Name}
                </p>
              </div>
            </div>
            <div className="relative flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: 'var(--subtext-color)' }}>
                  Version
                </p>
                <p className="font-mono text-sm" style={{ color: 'var(--text-color)' }}>
                  {displayVersion.Version}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: 'var(--subtext-color)' }}>
                  Architecture
                </p>
                <p className="font-mono text-sm" style={{ color: 'var(--text-color)' }}>
                  {displayVersion.Os}/{displayVersion.Arch}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: 'var(--subtext-color)' }}>
                  Go Version
                </p>
                <p className="font-mono text-sm" style={{ color: 'var(--text-color)' }}>
                  {displayVersion.GoVersion}
                </p>
              </div>
              <Tooltip.Provider delayDuration={100}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <div className="absolute inset-0 cursor-pointer bg-transparent z-10" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="left"
                      align="center"
                      sideOffset={5}
                      className="p-3 rounded-md text-xs shadow-lg z-50"
                      style={{
                        backgroundColor: 'var(--primary-color)',
                        color: 'var(--text-color)',
                        border: '1px solid var(--tertiary-color)'
                      }}
                    >
                      <DetailedVersionInfo version={displayVersion} />
                      <Tooltip.Arrow style={{ fill: 'var(--tertiary-color)' }} />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
          </motion.div>
        ) : dockerInfo && !hasEverHadVersion ? (
          <motion.div
            key="daemon-stopped"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DockerDaemonStopped />
          </motion.div>
        ) : (
          <DockerSkeleton />
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