/* /src/widgets/ipconfig.tsx */

'use client';

import { useState, useEffect, useRef } from 'react';
import { request } from '~/api/request';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Wifi, Cable, Globe, RotateCw, Unplug, Router } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface NetworkDevice {
  device_name: string;
  device_type: string;
  mac_address: string;
  status: 'active' | 'inactive';
  mtu: number;
  ip: {
    ipv4: string[];
    ipv6: string[];
  };
}

interface IpConfigResponse {
  status: string;
  data: NetworkDevice[];
  timestamp: string;
}

const getDeviceIcon = (deviceType: string, status: string) => {
  if (status === 'inactive') {
    return Network;
  }

  switch (deviceType) {
    case 'wi-fi':
      return Wifi;
    case 'ethernet':
    case 'thunderbolt':
      return Cable;
    case 'thunderbolt-bridge':
      return Router;
    default:
      return Globe;
  }
};

const getStatusColor = (status: string) => {
  return status === 'active' ? 'var(--green-color)' : 'var(--tertiary-color)';
};

const getDeviceDisplayName = (deviceName: string, deviceType: string) => {
  if (deviceType === 'wi-fi') return 'Wi-Fi';
  if (deviceType === 'ethernet') return 'Ethernet';
  if (deviceType === 'thunderbolt') return 'Thunderbolt';
  if (deviceType === 'thunderbolt-bridge') return 'TB Bridge';
  if (deviceType === 'tailscale') return 'Tailscale';
  if (deviceType === 'docker') return 'Docker';
  if (deviceName.startsWith('utun')) return 'VPN Tunnel';
  if (deviceName === 'awdl0') return 'AirDrop';
  if (deviceName === 'llw0') return 'Link Local';
  if (deviceName === 'lo0' || deviceName === 'lo') return 'Loopback';
  if (deviceName.startsWith('br-')) return 'Bridge';
  if (deviceName === 'docker0') return 'Docker';
  if (deviceName.startsWith('tailscale')) return 'Tailscale';
  return deviceName;
};

const NetworkDeviceItem = ({ device }: { device: NetworkDevice }) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const Icon = getDeviceIcon(device.device_type, device.status);
  const displayName = getDeviceDisplayName(device.device_name, device.device_type);
  const primaryIp = device.ip.ipv4[0] || device.ip.ipv6[0]?.split('%')[0] || 'None';

  return (
    <Tooltip.Provider delayDuration={100}>
      <Tooltip.Root open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
        <Tooltip.Trigger asChild>
          <div className="flex items-center justify-between text-sm cursor-pointer">
            <div className="flex items-center min-w-0 flex-1">
              <div
                className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: getStatusColor(device.status) }}
              />
              <Icon
                className="w-4 h-4 mr-2 flex-shrink-0"
                style={{ color: device.status === 'active' ? 'var(--text-color)' : 'var(--subtext-color)' }}
              />
              <span
                className="font-medium truncate"
                style={{ color: device.status === 'active' ? 'var(--text-color)' : 'var(--subtext-color)' }}
              >
                {displayName}
              </span>
            </div>
            <span
              className="text-xs font-mono ml-2 flex-shrink-0 truncate max-w-[120px]"
              style={{ color: device.status === 'active' ? 'var(--text-color)' : 'var(--subtext-color)' }}
            >
              {primaryIp}
            </span>
          </div>
        </Tooltip.Trigger>
        <AnimatePresence>
          {isTooltipOpen && (
            <Tooltip.Portal forceMount>
              <Tooltip.Content
                side="top"
                align="center"
                sideOffset={5}
                className="p-3 rounded-md text-xs shadow-lg z-50 max-w-sm"
                style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-color)', border: '1px solid var(--tertiary-color)' }}
              >
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="font-semibold mb-2">{device.device_name}</div>
                  <div className="space-y-1">
                    <div>
                      <span style={{ color: 'var(--subtext-color)' }}>Type: </span>
                      <span className="font-mono">{device.device_type}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--subtext-color)' }}>Status: </span>
                      <span
                        className="font-mono font-semibold"
                        style={{ color: getStatusColor(device.status) }}
                      >
                        {device.status}
                      </span>
                    </div>
                    {device.mac_address && (
                      <div>
                        <span style={{ color: 'var(--subtext-color)' }}>MAC: </span>
                        <span className="font-mono">{device.mac_address}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--subtext-color)' }}>MTU: </span>
                      <span className="font-mono">{device.mtu}</span>
                    </div>
                    {device.ip.ipv4.length > 0 && (
                      <div>
                        <span style={{ color: 'var(--subtext-color)' }}>IPv4: </span>
                        {device.ip.ipv4.map(ip => (
                          <div key={ip} className="font-mono ml-2">{ip}</div>
                        ))}
                      </div>
                    )}
                    {device.ip.ipv6.length > 0 && (
                      <div>
                        <span style={{ color: 'var(--subtext-color)' }}>IPv6: </span>
                        {device.ip.ipv6.slice(0, 3).map(ip => (
                          <div key={ip} className="font-mono ml-2 truncate">{ip}</div>
                        ))}
                        {device.ip.ipv6.length > 3 && (
                          <div className="ml-2" style={{ color: 'var(--subtext-color)' }}>
                            +{device.ip.ipv6.length - 3} more...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Tooltip.Arrow style={{ fill: 'var(--tertiary-color)' }} />
                </motion.div>
              </Tooltip.Content>
            </Tooltip.Portal>
          )}
        </AnimatePresence>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

const IpConfigSkeleton = () => (
  <div className="p-3.5 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
    <div className="h-6 w-1/3 bg-[var(--tertiary-color)] rounded mb-3 animate-pulse"></div>
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-[var(--tertiary-color)] rounded-full mr-2 animate-pulse"></div>
            <div className="h-4 w-16 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
          </div>
          <div className="h-3 w-20 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

export default function IpConfigWidget() {
  const [devices, setDevices] = useState<{ devices: NetworkDevice[], remaining: number } | null>(null);
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
        const res = await request('/v1/system/ipconfig', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.status === 200) {
          const data: IpConfigResponse = await res.json();
          if (!isMounted.current) return;

          failureCount.current = 0;
          if (disconnectTimer.current) {
            clearTimeout(disconnectTimer.current);
            disconnectTimer.current = null;
          }
          setConnectionStatus('connected');
          // Smart filtering logic: prioritize active devices, then fill with inactive if needed
          const activeDevices = data.data.filter(device => device.status === 'active');
          const inactiveDevices = data.data.filter(device => device.status === 'inactive');
          // Sort active devices by importance
          const sortedActiveDevices = activeDevices.sort((a, b) => {
            const importance = {
              'wi-fi': 1,
              'ethernet': 2,
              'tailscale': 3,
              'thunderbolt': 4,
              'docker': 5,
              'thunderbolt-bridge': 6,
              'unknown': 7
            };
            return (importance[a.device_type as keyof typeof importance] || 7) -
                  (importance[b.device_type as keyof typeof importance] || 7);
          });
          // Sort inactive devices by importance (only show important types)
          const sortedInactiveDevices = inactiveDevices
            .filter(device =>
              ['wi-fi', 'ethernet', 'thunderbolt', 'thunderbolt-bridge'].includes(device.device_type) ||
              device.device_name === 'lo0' || device.device_name === 'lo'
            )
            .sort((a, b) => {
              const importance = {
                'wi-fi': 1,
                'ethernet': 2,
                'thunderbolt': 3,
                'thunderbolt-bridge': 4,
                'unknown': 5
              };
              return (importance[a.device_type as keyof typeof importance] || 5) - 
                    (importance[b.device_type as keyof typeof importance] || 5);
            });
          // Combine: prioritize active devices, fill remaining slots with inactive
          const maxDevices = 5;
          let selectedDevices = [...sortedActiveDevices];
          if (selectedDevices.length < maxDevices) {
            const remainingSlots = maxDevices - selectedDevices.length;
            selectedDevices = [...selectedDevices, ...sortedInactiveDevices.slice(0, remainingSlots)];
          } else {
            selectedDevices = selectedDevices.slice(0, maxDevices);
          }

          // Calculate remaining devices for "more" indicator
          const totalDevices = data.data.length;
          const remainingCount = totalDevices - selectedDevices.length;
          setDevices({ devices: selectedDevices, remaining: remainingCount });
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
          // Refresh every minute (60000ms) instead of every second
          setTimeout(fetchWithLogic, 60000);
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
        {devices ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h2 className="text-lg font-semibold flex items-center mb-3" style={{ color: 'var(--text-color)' }}>
              <Network className="w-5 h-5 mr-2" />
              Interfaces
            </h2>
            <div className="space-y-2">
              {devices.devices.map(device => (
                <NetworkDeviceItem key={device.device_name} device={device} />
              ))}
              {devices.remaining > 0 && (
                <div className="text-xs" style={{ color: 'var(--subtext-color)' }}>
                  +{devices.remaining} more...
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <IpConfigSkeleton />
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