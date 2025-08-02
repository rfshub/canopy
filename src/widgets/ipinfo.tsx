/* /src/widgets/ipinfo.tsx */

'use client';

import { useState, useEffect, useRef } from 'react';
import { request } from '~/api/request';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, BadgeInfo, MapPin, Building, Info, Clock, Hash, RotateCw, Unplug } from 'lucide-react';

interface IpInfoData {
  network: {
    ip: string;
    isp: string;
    org: string;
    asn: string;
  };
  country: {
    city: string[];
    code: string;
    zip: string[];
    timezone: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  connection: {
    is_proxy: boolean;
    is_tor: boolean;
    is_crawler: boolean;
    is_datacenter: boolean;
    is_vpn: boolean;
  };
}

interface IpInfoResponse {
  status: string;
  data: IpInfoData;
  timestamp: string;
}

const InfoRow = ({
  icon: Icon,
  label,
  value,
  tooltip
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tooltip?: React.ReactNode;
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const content = (
    <div className="flex items-center justify-between text-sm cursor-pointer">
      <div className="flex items-center" style={{ color: 'var(--subtext-color)' }}>
        <Icon className="w-4 h-4 mr-2" />
        <span>{label}</span>
      </div>
      <span className="font-mono" style={{ color: 'var(--text-color)' }}>{value}</span>
    </div>
  );

  if (!tooltip) {
    return content;
  }

  return (
    <Tooltip.Provider delayDuration={100}>
      <Tooltip.Root open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
        <Tooltip.Trigger asChild>
          {content}
        </Tooltip.Trigger>
        <AnimatePresence>
          {isTooltipOpen && (
            <Tooltip.Portal forceMount>
              <Tooltip.Content
                side="top"
                align="center"
                sideOffset={5}
                className="p-2 rounded-md text-xs shadow-lg z-50 max-w-sm"
                style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-color)', border: '1px solid var(--tertiary-color)' }}
              >
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {tooltip}
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

const IpInfoSkeleton = () => (
  <div className="p-3.5 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
    <div className="h-6 w-1/3 bg-[var(--tertiary-color)] rounded mb-3 animate-pulse"></div>
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <div className="h-4 w-1/4 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
          <div className="h-4 w-1/2 bg-[var(--tertiary-color)] rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

export default function IpInfoWidget() {
  const [ipInfo, setIpInfo] = useState<IpInfoData | null>(null);
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
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        const res = await request('/v2/ip', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.status === 200) {
          const data: IpInfoResponse = await res.json();
          if (!isMounted.current) return;

          failureCount.current = 0;
          if (disconnectTimer.current) {
            clearTimeout(disconnectTimer.current);
            disconnectTimer.current = null;
          }
          setConnectionStatus('connected');
          setIpInfo(data.data);
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
          // Refresh every 15 minutes (900000ms)
          setTimeout(fetchWithLogic, 900000);
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

  const getConnectionStatus = (connection: IpInfoData['connection']) => {
    const flags = [];
    if (connection.is_vpn) flags.push('VPN');
    if (connection.is_proxy) flags.push('Proxy');
    if (connection.is_tor) flags.push('Tor');
    if (connection.is_datacenter) flags.push('Datacenter');
    if (connection.is_crawler) flags.push('Crawler');
    return flags.length > 0 ? flags.join(', ') : 'Direct';
  };

  return (
    <div className="p-0.5 rounded-lg h-full" style={{ backgroundColor: 'var(--secondary-color)' }}>
      <div className="relative p-3.5 rounded-md h-full" style={{ backgroundColor: 'var(--primary-color)' }}>
        {ipInfo ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h2 className="text-lg font-semibold flex items-center mb-3" style={{ color: 'var(--text-color)' }}>
              <BadgeInfo className="w-5 h-5 mr-2" />
              Information
            </h2>
            <div className="space-y-2">
              <InfoRow
                icon={Globe}
                label="IP Address"
                value={ipInfo.network.ip}
              />
              <InfoRow
                icon={MapPin}
                label="Location"
                value={`${ipInfo.country.city[0]}, ${ipInfo.country.code}`}
                tooltip={
                  <div>
                    <div className="font-semibold mb-1">Location Details:</div>
                    <div><span className="font-semibold">Cities:</span> {ipInfo.country.city.join(', ')}</div>
                    <div><span className="font-semibold">ZIP Codes:</span> {ipInfo.country.zip.join(', ')}</div>
                    <div><span className="font-semibold">Coordinates:</span> {ipInfo.location.latitude.toFixed(4)}, {ipInfo.location.longitude.toFixed(4)}</div>
                    <div><span className="font-semibold">Timezone:</span> {ipInfo.country.timezone}</div>
                  </div>
                }
              />
              <InfoRow
                icon={Building}
                label="ISP"
                value={ipInfo.network.isp}
                tooltip={
                  <div>
                    <div className="font-semibold mb-1">Network Details:</div>
                    <div><span className="font-semibold">ISP:</span> {ipInfo.network.isp}</div>
                    <div><span className="font-semibold">Organization:</span> {ipInfo.network.org}</div>
                    <div><span className="font-semibold">ASN:</span> {ipInfo.network.asn}</div>
                  </div>
                }
              />
              <InfoRow
                icon={Hash}
                label="ASN"
                value={ipInfo.network.asn}
              />
              <InfoRow
                icon={Clock}
                label="Timezone"
                value={ipInfo.country.timezone.split('/').pop() || ipInfo.country.timezone}
              />
              <InfoRow
                icon={Info}
                label="Connection"
                value={getConnectionStatus(ipInfo.connection)}
                tooltip={
                  <div>
                    <div className="font-semibold mb-1">Connection Analysis:</div>
                    <div><span className="font-semibold">VPN:</span> {ipInfo.connection.is_vpn ? 'Yes' : 'No'}</div>
                    <div><span className="font-semibold">Proxy:</span> {ipInfo.connection.is_proxy ? 'Yes' : 'No'}</div>
                    <div><span className="font-semibold">Tor:</span> {ipInfo.connection.is_tor ? 'Yes' : 'No'}</div>
                    <div><span className="font-semibold">Datacenter:</span> {ipInfo.connection.is_datacenter ? 'Yes' : 'No'}</div>
                    <div><span className="font-semibold">Crawler:</span> {ipInfo.connection.is_crawler ? 'Yes' : 'No'}</div>
                  </div>
                }
              />
            </div>
          </motion.div>
        ) : (
          <IpInfoSkeleton />
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