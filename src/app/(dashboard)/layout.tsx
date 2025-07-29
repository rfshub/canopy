/* /src/app/(dashboard)/layout.tsx */

import type { ReactNode } from "react";
import Sidebar from "~/modules/sidebar/sidebar";
import Footer from "~/modules/footer/footer";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh" style={{ backgroundColor: 'var(--primary-color)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <main className="min-h-dvh flex flex-col">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
