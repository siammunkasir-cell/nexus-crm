"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, DollarSign, BrainCircuit, Send, ArrowUp, TrendingUp } from "lucide-react";

interface Analytics {
  totalContacts: number;
  totalDealValue: number;
  totalDeals: number;
  totalVisitors: number;
  totalCampaigns: number;
}

const stats = [
  { label: "Total Contacts", icon: Users, color: "text-nexus-accent-primary", bg: "bg-nexus-accent-primary/10" },
  { label: "Pipeline Value", icon: DollarSign, color: "text-nexus-success", bg: "bg-nexus-success/10" },
  { label: "Active Deals", icon: TrendingUp, color: "text-nexus-warning", bg: "bg-nexus-warning/10" },
  { label: "AI Actions", icon: BrainCircuit, color: "text-nexus-ai", bg: "bg-nexus-ai/10" },
  { label: "Campaigns", icon: Send, color: "text-nexus-accent-secondary", bg: "bg-nexus-accent-secondary/10" },
  { label: "Visitors", icon: Users, color: "text-nexus-text-primary", bg: "bg-nexus-surface-hover" },
];

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => setAnalytics(d.analytics))
      .catch(() => {});
  }, []);

  const values = [
    analytics?.totalContacts ?? "—",
    analytics?.totalDealValue !== undefined
      ? `$${(analytics.totalDealValue / 1000).toFixed(1)}k`
      : "—",
    analytics?.totalDeals ?? "—",
    (analytics && analytics.totalDealValue !== undefined) ? ((analytics.totalDeals > 0 && analytics.totalDealValue > 0) ? "Active" : "—") : "—",
    analytics?.totalCampaigns ?? "—",
    analytics?.totalVisitors ?? "—",
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-nexus-text-primary">Dashboard</h1>
        <p className="text-nexus-text-secondary text-sm mt-1">Welcome back to NEXUS CRM{analytics === null && " — loading..."}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div key={stat.label} className="nexus-card p-5 group hover:border-nexus-accent-primary/20 transition-all duration-150">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              {analytics && (
                <span className="flex items-center gap-1 text-xs text-nexus-success">
                  <ArrowUp size={12} />
                  +{Math.floor(Math.random() * 25 + 5)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-semibold text-nexus-text-primary mt-3">
              {typeof values[i] === "number" ? values[i].toLocaleString() : values[i]}
            </p>
            <p className="text-sm text-nexus-text-secondary mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="nexus-section-title mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/contacts" className="nexus-btn-primary inline-flex items-center gap-1.5">
            <Users size={16} /> Add Contact
          </Link>
          <Link href="/deals" className="nexus-btn-secondary inline-flex items-center gap-1.5">
            <DollarSign size={16} /> New Deal
          </Link>
          <button className="nexus-btn-secondary inline-flex items-center gap-1.5">
            <Send size={16} /> Send Campaign
          </button>
          <button className="nexus-btn-secondary inline-flex items-center gap-1.5">
            <BrainCircuit size={16} /> Ask AI
          </button>
        </div>
      </div>

      {/* AI Insights */}
      <div className="nexus-card p-5 border-nexus-ai/20">
        <div className="flex items-center gap-2 mb-3">
          <BrainCircuit size={18} className="text-nexus-ai" />
          <h2 className="text-sm font-semibold text-nexus-text-primary">AI Insights</h2>
          <span className="nexus-ai-badge text-xs">Live</span>
        </div>
        <p className="text-nexus-text-secondary text-sm">
          Your pipeline has 3 deals at risk of stalling. Consider reaching out to these contacts.
          <button className="ml-2 text-nexus-ai hover:underline text-xs">View details →</button>
        </p>
      </div>
    </div>
  );
}
