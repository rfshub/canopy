/* /app/layout.tsx */

import type { Metadata } from 'next';
import '~/styles/globals.css';
import '~/styles/color.css';
import '~/styles/transitions.css';
import { AppProvider } from '~/app/provider';

const siteUrl = 'https://canopy.rfs.im';
const title = 'Canopy';
const description =
  'Canopy is a thoughtfully designed web panel for the rfs ecosystem, built with performance and clarity in mind.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description,
  manifest: '/site.webmanifest',
  appleWebApp: {
    title,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml', rel: 'icon' },
      { url: '/favicon.ico', sizes: 'any', rel: 'icon' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml', rel: 'icon' },
      { url: '/favicon.ico', sizes: 'any', rel: 'icon' },
    ],
    shortcut: [{ rel: 'shortcut icon', url: '/favicon.ico' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        style={{
          backgroundColor: 'var(--primary-color)',
          color: 'var(--text-color)',
        }}
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}