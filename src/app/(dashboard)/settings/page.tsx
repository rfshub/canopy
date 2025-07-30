/* /src/app/(dashboard)/settings/page.tsx */

import type { Metadata } from 'next';
import SettingsIndex from './index';

export const metadata: Metadata = {
  title: 'Settings',
};

export default function SettingsPage() {
  return <SettingsIndex />;
}
