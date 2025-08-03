/* /src/app/(dashboard)/layout.tsx */

import type { ReactNode } from "react";
import Sidebar from "~/modules/sidebar";
import Footer from "~/modules/footer";
import Pkg from "~/lib/pkg";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    // The root container has a fixed viewport height. This prevents the whole page
    // from scrolling and keeps the Sidebar fixed in place.
    <div className="flex h-dvh" style={{ backgroundColor: 'var(--primary-color)' }}>
      <Sidebar />
      {/* This wrapper takes the remaining width and handles its own scrolling. */}
      {/* It's a flex-column to stack the main content and footer. */}
      <div className="flex-1 flex flex-col overflow-y-auto scroll-smooth">
        {/* The main content area grows to fill the space inside the scrollable wrapper, */}
        {/* pushing the footer to the bottom on short pages. */}
        {/* When content is long, it expands and causes the wrapper to scroll. */}
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
      <Pkg />
    </div>
  );
}