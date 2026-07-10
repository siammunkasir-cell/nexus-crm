import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXUS CRM — AI-Powered Business Growth Platform",
  description:
    "Multi-tenant AI-powered CRM with native AI brain, sub-second UX, and clean minimalist design. Built for agencies, coaches, consultants, and local businesses.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-nexus-bg text-nexus-text-primary font-display antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
