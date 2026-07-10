"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  MessageSquare,
  Send,
  GitBranch,
  Layout,
  FileText,
  Calendar,
  Receipt,
  BrainCircuit,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  LogOut,
} from "lucide-react";
import { useApp } from "@/store/app";

const navGroups = [
  {
    label: "CRM",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/dashboard/contacts", icon: Users, label: "Contacts" },
      { href: "/dashboard/deals", icon: DollarSign, label: "Deals" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/dashboard/campaigns", icon: Send, label: "Campaigns" },
      { href: "/dashboard/automation", icon: GitBranch, label: "Automation" },
      { href: "/dashboard/forms", icon: FileText, label: "Forms" },
    ],
  },
  {
    label: "Conversations",
    items: [
      { href: "/dashboard/conversations", icon: MessageSquare, label: "Inbox" },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/dashboard/funnels", icon: Layout, label: "Funnels" },
      { href: "/dashboard/invoices", icon: Receipt, label: "Invoices" },
      { href: "/dashboard/calendar", icon: Calendar, label: "Calendar" },
    ],
  },
  {
    label: "AI Brain",
    items: [
      { href: "/dashboard/ai-brain", icon: BrainCircuit, label: "AI Assistant" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/dashboard/analytics", icon: BarChart3, label: "Reports" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/settings", icon: Settings, label: "Settings" },
      { href: "/dashboard/admin", icon: ShieldCheck, label: "Admin" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useApp();

  const handleSignOut = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "h-screen fixed left-0 top-0 z-40 flex flex-col bg-nexus-surface border-r border-nexus-border transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-nexus-border">
        {sidebarCollapsed ? (
          <span className="text-lg font-bold text-gradient mx-auto">N</span>
        ) : (
          <h1 className="text-lg font-bold text-gradient">NEXUS CRM</h1>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!sidebarCollapsed && (
              <p className="nexus-section-title px-3 mb-1.5">{group.label}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-nexus-accent-primary/10 text-nexus-accent-primary"
                          : "text-nexus-text-secondary hover:bg-nexus-surface-hover hover:text-nexus-text-primary"
                      )}
                    >
                      <item.icon size={18} />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-nexus-border p-3 space-y-2">
        <button
          onClick={toggleSidebar}
          className="nexus-btn-ghost w-full justify-center text-nexus-text-muted"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <button
          onClick={handleSignOut}
          className={cn(
            "nexus-btn-ghost w-full text-nexus-danger",
            sidebarCollapsed ? "justify-center" : "justify-start"
          )}
        >
          <LogOut size={16} />
          {!sidebarCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
