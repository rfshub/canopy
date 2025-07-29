/* /app/layout.tsx */

import type { Metadata } from "next";
import "~/styles/globals.css";
import "~/styles/color.css";

export const metadata: Metadata = {
  title: "App",
  description: "Minimal Next.js template",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`antialiased bg-white text-black dark:bg-black dark:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
