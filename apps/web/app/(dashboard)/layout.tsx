"use client";

import { type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AIChatPanel } from "@/components/ai/chat-panel";
import { AppProvider, useApp } from "@/store/app";
import { cn } from "@/lib/utils";

function DashboardShell({ children }: { children: ReactNode }) {
  const { sidebarCollapsed } = useApp();

  return (
    <div className="min-h-screen bg-nexus-bg">
      <Sidebar />
      <Topbar />
      <main className={cn(
        "min-h-screen transition-all duration-300",
        "pt-16",
        sidebarCollapsed ? "pl-16" : "pl-60"
      )}>
        <div className="p-6">{children}</div>
      </main>
      <AIChatPanel />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <DashboardShell>{children}</DashboardShell>
    </AppProvider>
  );
}
