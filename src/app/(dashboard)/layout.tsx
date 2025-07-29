/* /src/app/(dashboard)/layout.tsx */

import type { ReactNode } from "react";
import Sidebar from "~/modules/sidebar/sidebar";
import Footer from "~/modules/footer/footer";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col" style={{ backgroundColor: 'var(--primary-color)' }}>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex flex-1">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
