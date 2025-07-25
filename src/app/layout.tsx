/* /app/layout.tsx */

import type { Metadata } from "next";
import "~/styles/globals.css";


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
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <body
        className={`antialiased bg-white text-black dark:bg-black dark:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
