/* /src/lib/console.tsx */

'use client';

import { useEffect, useRef } from 'react';
import { request } from '~/api/request';

interface ConsoleProps {
  name: string;
  version: string;
}

interface BackendResponse {
  status: string;
  data: {
    name: string;
    version: string;
    stage: string;
    repository: string;
    license: string;
    copyright: {
      year: number;
      author: {
        name: string;
        url: string;
      };
      holder: {
        name: string;
        urls: string[];
      };
    };
  };
  timestamp: string;
}

function getBrowserName(): string {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  return 'Unknown';
}

function getBrowserVersion(): string {
  const userAgent = navigator.userAgent;
  const browserName = getBrowserName();
  let version = 'Unknown';
  switch (browserName) {
    case 'Chrome':
      const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
      version = chromeMatch ? chromeMatch[1] : 'Unknown';
      break;
    case 'Firefox':
      const firefoxMatch = userAgent.match(/Firefox\/(\d+)/);
      version = firefoxMatch ? firefoxMatch[1] : 'Unknown';
      break;
    case 'Safari':
      const safariMatch = userAgent.match(/Version\/(\d+)/);
      version = safariMatch ? safariMatch[1] : 'Unknown';
      break;
    case 'Edge':
      const edgeMatch = userAgent.match(/Edg\/(\d+)/);
      version = edgeMatch ? edgeMatch[1] : 'Unknown';
      break;
    case 'Opera':
      const operaMatch = userAgent.match(/(?:Opera|OPR)\/(\d+)/);
      version = operaMatch ? operaMatch[1] : 'Unknown';
      break;
  }
  return version;
}

export default function Console({ name, version }: ConsoleProps) {
  const hasLogged = useRef(false);

  useEffect(() => {
    if (hasLogged.current) return;
    hasLogged.current = true;

    const logInfo = async () => {
      try {
        const response = await request('/');
        const data: BackendResponse = await response.json();
        const timestamp = new Date(data.timestamp).toLocaleString('sv-SE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).replace(' ', ' ');
        const browserName = getBrowserName();
        const browserVersion = getBrowserVersion();
        console.log(
          `%c
  ▲ ${name} ${version}%c
  - Service: ${data.data.name} ${data.data.version} (${data.data.stage})
  - Repository: %c${data.data.repository}%c             ／＞　 フ
  - Browser: ${browserName} ${browserVersion}                                   | 　_　_|
  - Timestamp: ${timestamp}                       ／\` ミ＿xノ
  - Copyright:                                          ／　　　　 |
    ✓ ${data.data.copyright.year} © ${data.data.copyright.author.name} ${data.data.copyright.holder.name}, rfs ecosystem               (　 ヽ＿ヽ_)__)
    ✓ Released under the ${data.data.license} License               ＼二 )
    ✓ Author: %c${data.data.copyright.author.url}
%c`,
          'color: #ae9add; font-weight: bold',
          'color: inherit',
          'color: #3b82f6; text-decoration: underline',
          'color: inherit',
          'color: #3b82f6; text-decoration: underline',
          'color: inherit'
        );
      } catch (error) {
        console.error('Failed to fetch backend information:', error);
        const fallbackTimestamp = new Date().toLocaleString('sv-SE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).replace(' ', ' ');
        const browserName = getBrowserName();
        const browserVersion = getBrowserVersion();
        console.log(
          `%c
  ▲ ${name} ${version}%c
  - Service: Unknown                                 ／＞　 フ
  - Browser: ${browserName} ${browserVersion}                             | 　_　_|
  - Timestamp: ${fallbackTimestamp}                 ／\` ミ＿xノ
  - Copyright:                                    ／　　　　 |
    ✓ 2025 © Canmi @rfshub, rfs ecosystem        (　 ヽ＿ヽ_)__)
    ✓ Released under the AGPL-3.0 License         ＼二 )
`,
          'color: #ae9add; font-weight: bold',
          'color: inherit'
        );
      }
    };

    logInfo();
  }, [name, version]);

  return null;
}