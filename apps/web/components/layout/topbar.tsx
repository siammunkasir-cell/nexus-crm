"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Command, BrainCircuit, ChevronDown, Menu } from "lucide-react";
import { useApp } from "@/store/app";
import { useAIStore } from "@/store/ai";
import { cn } from "@/lib/utils";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/contacts": "Contacts",
  "/dashboard/deals": "Deals",
  "/dashboard/conversations": "Inbox",
  "/dashboard/campaigns": "Campaigns",
  "/dashboard/automation": "Automation",
  "/dashboard/funnels": "Funnels",
  "/dashboard/forms": "Forms",
  "/dashboard/calendar": "Calendar",
  "/dashboard/invoices": "Invoices",
  "/dashboard/ai-brain": "AI Assistant",
  "/dashboard/analytics": "Reports",
  "/dashboard/settings": "Settings",
  "/dashboard/admin": "Admin",
};

export function Topbar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useApp();

  const crumbs = pathname.split("/").reduce<string[]>((acc, _, i) => {
    const p = pathname.split("/").slice(0, i + 1).join("/");
    if (breadcrumbMap[p]) acc.push(breadcrumbMap[p]!);
    return acc;
  }, []);

  return (
    <header className={cn(
      "h-16 fixed top-0 right-0 z-30 flex items-center justify-between px-6 bg-nexus-bg/80 backdrop-blur-md border-b border-nexus-border transition-all duration-300",
      sidebarCollapsed ? "left-16" : "left-60"
    )}>
      {/* Left */}
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="nexus-btn-ghost lg:hidden">
          <Menu size={18} />
        </button>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-nexus-text-muted hover:text-nexus-text-primary">Home</Link>
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-nexus-text-muted">/</span>
              <span className={i === crumbs.length - 1 ? "text-nexus-text-primary font-medium" : "text-nexus-text-muted"}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="nexus-btn-ghost gap-2 text-nexus-text-muted hidden md:flex">
          <Search size={16} />
          <span className="text-sm">Search...</span>
          <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border border-nexus-border bg-nexus-surface">
            <Command size={10} />K
          </kbd>
        </button>

        {/* AI Brain */}
        <button
          onClick={() => useAIStore.getState().toggleOpen()}
          className="nexus-ai-badge gap-2 text-xs cursor-pointer"
        >
          <BrainCircuit size={14} />
          AI Brain
        </button>

        {/* Notifications */}
        <button className="relative nexus-btn-ghost">
          <Bell size={18} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-nexus-danger" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-nexus-accent-primary/20 flex items-center justify-center text-xs font-medium text-nexus-accent-primary">
            U
          </div>
          <ChevronDown size={14} className="text-nexus-text-muted hidden sm:block" />
        </div>
      </div>
    </header>
  );
}
