"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, X, GripVertical, DollarSign, CalendarDays, User, Target, TrendingUp,
  ChevronDown, CheckCircle2, XCircle, BarChart3, Loader2, MoreHorizontal,
  Clock, Archive, Edit3, Trash2, MessageSquare, FileText, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Deal, type Pipeline, type PipelineStage,
  fetchPipelines, createDeal, updateDeal, createPipeline,
  daysInStage, getStageColor,
} from "@/lib/deals";

const DEFAULT_STAGES: PipelineStage[] = [
  { id: "lead-in", name: "Lead In", probability: 10, color: "#6366F1", order: 0 },
  { id: "contacted", name: "Contacted", probability: 20, color: "#8B5CF6", order: 1 },
  { id: "qualified", name: "Qualified", probability: 40, color: "#06B6D4", order: 2 },
  { id: "proposal", name: "Proposal", probability: 60, color: "#F59E0B", order: 3 },
  { id: "negotiation", name: "Negotiation", probability: 80, color: "#EC4899", order: 4 },
  { id: "closed-won", name: "Closed Won", probability: 100, color: "#22C55E", order: 5 },
  { id: "closed-lost", name: "Closed Lost", probability: 0, color: "#EF4444", order: 6 },
];

// ─── Main Page ───
export default function DealsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Deal detail drawer
  const [drawerDeal, setDrawerDeal] = useState<Deal | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modals
  const [showAddPipeline, setShowAddPipeline] = useState(false);
  const [quickCreateStage, setQuickCreateStage] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(false);

  // Won/Lost
  const [wonLostDeal, setWonLostDeal] = useState<{ deal: Deal; outcome: "won" | "lost" } | null>(null);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId) || pipelines[0];

  const loadPipelines = useCallback(async () => {
    try {
      const data = await fetchPipelines();
      setPipelines(data.pipelines);
      if (!activePipelineId && data.pipelines.length > 0) {
        setActivePipelineId(data.pipelines[0]!.id);
      }
    } catch (err) {
      console.error("Failed to load pipelines:", err);
    } finally {
      setLoading(false);
    }
  }, [activePipelineId]);

  useEffect(() => { loadPipelines(); }, []);

  // Drag and drop — move deal between stages
  const moveDeal = async (dealId: string, newStageId: string) => {
    // Optimistic update
    setPipelines((prev) => prev.map((p) => ({
      ...p,
      deals: p.deals.map((d) => d.id === dealId ? { ...d, stageId: newStageId } : d),
    })));

    try {
      await updateDeal(dealId, { stageId: newStageId });
    } catch {
      loadPipelines(); // rollback on failure
    }
  };

  // Mark deal as won/lost
  const markWonLost = async (dealId: string, outcome: "won" | "lost", details?: { lostReason?: string; value?: number }) => {
    const wonStage = activePipeline?.stages.find((s) => s.name.toLowerCase().includes("won"));
    const lostStage = activePipeline?.stages.find((s) => s.name.toLowerCase().includes("lost"));

    try {
      await updateDeal(dealId, {
        stageId: outcome === "won" ? (wonStage?.id || "") : (lostStage?.id || ""),
        wonAt: outcome === "won" ? new Date().toISOString() : undefined,
        lostAt: outcome === "lost" ? new Date().toISOString() : undefined,
        lostReason: outcome === "lost" ? details?.lostReason : undefined,
        value: details?.value,
      });
      loadPipelines();
    } catch (err) {
      console.error("Failed to update deal:", err);
    }
  };

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // ─── RENDER ───
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-nexus-text-muted">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading pipeline...
      </div>
    );
  }

  const totalPipelineValue = activePipeline?.deals.reduce((sum, d) => sum + d.value, 0) || 0;
  const activeDeals = activePipeline?.deals.filter((d) => !d.wonAt && !d.lostAt) || [];
  const weightedValue = activeDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-nexus-text-primary">Deals</h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-nexus-text-muted">
              Pipeline: <span className="text-nexus-text-primary font-medium">
                {activePipeline?.name || "No pipeline"}
              </span>
            </span>
            <span className="text-sm text-nexus-text-muted">
              Total: <span className="text-nexus-success font-semibold">
                ${totalPipelineValue.toLocaleString()}
              </span>
            </span>
            <span className="text-sm text-nexus-text-muted">
              Weighted: <span className="text-nexus-warning font-semibold">
                ${weightedValue.toLocaleString()}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForecast(!showForecast)} className="nexus-btn-secondary text-sm">
            <BarChart3 size={14} /> Forecast
          </button>
          <button onClick={() => setShowAddPipeline(true)} className="nexus-btn-secondary text-sm">
            <Plus size={14} /> New Pipeline
          </button>
        </div>
      </div>

      {/* Pipeline Tabs */}
      <div className="flex gap-1 border-b border-nexus-border pb-0 overflow-x-auto">
        {pipelines.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePipelineId(p.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-[1px] whitespace-nowrap transition-colors",
              activePipelineId === p.id
                ? "text-nexus-accent-primary border-nexus-accent-primary"
                : "text-nexus-text-muted border-transparent hover:text-nexus-text-primary"
            )}
          >
            {p.name}
            <span className="ml-2 text-xs text-nexus-text-muted">({p.deals.length})</span>
          </button>
        ))}
      </div>

      {/* Kanban Board */}
      {activePipeline ? (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
          {activePipeline.stages.map((stage, stageIdx) => {
            const stageDeals = activePipeline.deals.filter((d) => d.stageId === stage.id);
            const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

            return (
              <div
                key={stage.id}
                className={cn(
                  "flex-shrink-0 w-72 bg-nexus-surface rounded-lg border transition-all duration-150",
                  dragOverStage === stage.id ? "border-nexus-accent-primary/50 bg-nexus-accent-primary/5" : "border-nexus-border"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const dealId = e.dataTransfer.getData("dealId");
                  if (dealId) moveDeal(dealId, stage.id);
                  setDragOverStage(null);
                }}
              >
                {/* Stage Header */}
                <div className="p-3 border-b border-nexus-border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || getStageColor(stageIdx) }} />
                      <h3 className="text-sm font-semibold text-nexus-text-primary">{stage.name}</h3>
                      <span className="text-xs text-nexus-text-muted bg-nexus-surface-hover px-1.5 py-0.5 rounded-full">{stageDeals.length}</span>
                    </div>
                    <button
                      onClick={() => setQuickCreateStage(stage.id)}
                      className="nexus-btn-ghost p-1 text-nexus-text-muted hover:text-nexus-text-primary"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-nexus-text-muted">{stage.probability}%</span>
                    <span className={cn("font-medium", stageTotal > 0 ? "text-nexus-success" : "text-nexus-text-muted")}>
                      ${stageTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Deal Cards */}
                <div className="p-2 space-y-2 min-h-[100px]">
                  {stageDeals.length === 0 && (
                    <div className="text-center py-6 text-xs text-nexus-text-muted border-2 border-dashed border-nexus-border rounded-lg">
                      Drop deals here
                    </div>
                  )}
                  {stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      stage={stage}
                      onClick={() => { setDrawerDeal(deal); setDrawerOpen(true); }}
                      onWon={() => {
                        if (deal.stageId !== activePipeline.stages.find((s) => s.name.toLowerCase().includes("won"))?.id) {
                          setWonLostDeal({ deal, outcome: "won" });
                        }
                      }}
                      onLost={() => setWonLostDeal({ deal, outcome: "lost" })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="nexus-card p-12 text-center text-nexus-text-muted">
          <p>No pipelines yet. Create your first pipeline to start tracking deals.</p>
          <button onClick={() => setShowAddPipeline(true)} className="nexus-btn-primary mt-3">
            <Plus size={14} /> Create Pipeline
          </button>
        </div>
      )}

      {/* ─── QUICK CREATE DEAL ─── */}
      {quickCreateStage && (
        <QuickCreateDeal
          stageId={quickCreateStage}
          pipelineId={activePipeline!.id}
          stages={activePipeline!.stages}
          onClose={() => setQuickCreateStage(null)}
          onCreated={() => { setQuickCreateStage(null); loadPipelines(); }}
        />
      )}

      {/* ─── NEW PIPELINE ─── */}
      {showAddPipeline && (
        <NewPipelineModal
          onClose={() => setShowAddPipeline(false)}
          onCreated={() => { setShowAddPipeline(false); loadPipelines(); }}
        />
      )}

      {/* ─── FORECAST ─── */}
      {showForecast && activePipeline && (
        <ForecastPanel
          pipeline={activePipeline}
          onClose={() => setShowForecast(false)}
        />
      )}

      {/* ─── WON/LOST MODAL ─── */}
      {wonLostDeal && (
        <WonLostModal
          deal={wonLostDeal.deal}
          outcome={wonLostDeal.outcome}
          onClose={() => setWonLostDeal(null)}
          onConfirm={(details) => { markWonLost(wonLostDeal.deal.id, wonLostDeal.outcome, details); setWonLostDeal(null); }}
        />
      )}

      {/* ─── DEAL DETAIL DRAWER ─── */}
      {drawerOpen && drawerDeal && (
        <DealDetailDrawer
          deal={drawerDeal}
          pipelineStages={activePipeline?.stages || []}
          onClose={() => { setDrawerOpen(false); setDrawerDeal(null); }}
          onRefresh={loadPipelines}
          onWon={() => { setDrawerOpen(false); setWonLostDeal({ deal: drawerDeal, outcome: "won" }); }}
          onLost={() => { setDrawerOpen(false); setWonLostDeal({ deal: drawerDeal, outcome: "lost" }); }}
        />
      )}
    </div>
  );
}

// ─── Deal Card ───
function DealCard({
  deal, stage, onClick, onWon, onLost,
}: {
  deal: Deal; stage: PipelineStage; onClick: () => void; onWon: () => void; onLost: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const dqScore = deal.probability;

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("dealId", deal.id)}
      className="nexus-card p-3 cursor-grab active:cursor-grabbing group hover:border-nexus-accent-primary/30 transition-all duration-150"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-nexus-text-primary leading-tight">{deal.title}</h4>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="nexus-btn-ghost p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-nexus-surface border border-nexus-border rounded-lg shadow-lg z-50 p-1 animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setShowMenu(false); onWon(); }} className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-nexus-success hover:bg-nexus-surface-hover rounded-md">
                <CheckCircle2 size={14} /> Mark Won
              </button>
              <button onClick={() => { setShowMenu(false); onLost(); }} className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-nexus-danger hover:bg-nexus-surface-hover rounded-md">
                <XCircle size={14} /> Mark Lost
              </button>
            </div>
          )}
        </div>
      </div>

      {deal.contact && (
        <div className="flex items-center gap-1.5 mb-2">
          <User size={12} className="text-nexus-text-muted shrink-0" />
          <span className="text-xs text-nexus-text-secondary truncate">
            {deal.contact.firstName} {deal.contact.lastName}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <DollarSign size={12} className="text-nexus-success" />
          <span className="text-sm font-semibold text-nexus-text-primary">
            ${deal.value.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Target size={12} className="text-nexus-warning" />
          <span className="text-xs font-mono text-nexus-warning">{dqScore}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-nexus-border/50">
        <div className="flex items-center gap-1 text-xs text-nexus-text-muted">
          <Clock size={10} />
          {daysInStage(deal)}d
        </div>
        {deal.assignedTo && (
          <div className="w-5 h-5 rounded-full bg-nexus-accent-primary/20 flex items-center justify-center text-[10px] font-medium text-nexus-accent-primary"
            title={deal.assignedTo.name || ""}>
            {deal.assignedTo.name?.[0] || "?"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Quick Create Deal ───
function QuickCreateDeal({
  stageId, pipelineId, stages, onClose, onCreated,
}: {
  stageId: string; pipelineId: string; stages: PipelineStage[]; onClose: () => void; onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [contactName, setContactName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createDeal({
        title,
        value: parseFloat(value) || 0,
        stageId,
        pipelineId,
      });
      onCreated();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-nexus-surface border border-nexus-border rounded-xl p-6 w-full max-w-sm mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-nexus-text-primary">New Deal</h2>
          <button onClick={onClose} className="nexus-btn-ghost p-1"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-nexus-text-secondary mb-1 block">Deal Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="nexus-input text-sm" placeholder="e.g. Enterprise Subscription" autoFocus />
          </div>
          <div>
            <label className="text-xs text-nexus-text-secondary mb-1 block">Value ($)</label>
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="nexus-input text-sm" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-nexus-text-secondary mb-1 block">Stage</label>
            <select value={stageId} className="nexus-input text-sm" disabled>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="nexus-btn-secondary text-sm flex-1">Cancel</button>
            <button type="submit" disabled={!title.trim()} className="nexus-btn-primary text-sm flex-1">Create Deal</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── New Pipeline Modal ───
function NewPipelineModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [stages, setStages] = useState(DEFAULT_STAGES.map((s) => s.name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createPipeline({
        name,
        stages: stages.filter((s) => s.trim()).map((s, i) => ({
          id: s.toLowerCase().replace(/\s+/g, "-"),
          name: s,
          probability: i === 0 ? 10 : i === stages.length - 1 ? 0 : i * 20,
          color: getStageColor(i),
          order: i,
        })),
      });
      onCreated();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-nexus-surface border border-nexus-border rounded-xl p-6 w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-nexus-text-primary">New Pipeline</h2>
          <button onClick={onClose} className="nexus-btn-ghost p-1"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-nexus-text-secondary mb-1 block">Pipeline Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="nexus-input text-sm" placeholder="e.g. Sales Pipeline" autoFocus />
          </div>
          <div>
            <label className="text-xs text-nexus-text-secondary mb-1 block">Stages</label>
            {stages.map((stage, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5">
                <GripVertical size={14} className="text-nexus-text-muted shrink-0" />
                <input value={stage} onChange={(e) => setStages(stages.map((s, j) => j === i ? e.target.value : s))} className="nexus-input text-sm flex-1" />
                {stages.length > 2 && (
                  <button type="button" onClick={() => setStages(stages.filter((_, j) => j !== i))} className="text-nexus-danger text-xs">Remove</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setStages([...stages, ""])} className="text-xs text-nexus-accent-primary mt-1">+ Add stage</button>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="nexus-btn-secondary text-sm flex-1">Cancel</button>
            <button type="submit" disabled={!name.trim()} className="nexus-btn-primary text-sm flex-1">Create Pipeline</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Won/Lost Modal ───
function WonLostModal({
  deal, outcome, onClose, onConfirm,
}: {
  deal: Deal; outcome: "won" | "lost"; onClose: () => void; onConfirm: (details?: { lostReason?: string; value?: number }) => void;
}) {
  const [value, setValue] = useState(String(deal.value));
  const [lostReason, setLostReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-nexus-surface border border-nexus-border rounded-xl p-6 w-full max-w-sm mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          {outcome === "won" ? (
            <CheckCircle2 size={24} className="text-nexus-success" />
          ) : (
            <XCircle size={24} className="text-nexus-danger" />
          )}
          <div>
            <h2 className="text-base font-semibold text-nexus-text-primary">
              Mark as {outcome === "won" ? "Won" : "Lost"}
            </h2>
            <p className="text-sm text-nexus-text-secondary">{deal.title}</p>
          </div>
        </div>

        <div className="space-y-3">
          {outcome === "won" && (
            <div>
              <label className="text-xs text-nexus-text-secondary mb-1 block">Deal Value ($)</label>
              <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="nexus-input text-sm" />
            </div>
          )}
          {outcome === "lost" && (
            <div>
              <label className="text-xs text-nexus-text-secondary mb-1 block">Lost Reason</label>
              <select value={lostReason} onChange={(e) => setLostReason(e.target.value)} className="nexus-input text-sm">
                <option value="">Select reason...</option>
                <option value="budget">Budget</option>
                <option value="competitor">Chose competitor</option>
                <option value="timing">Bad timing</option>
                <option value="no-need">No longer needed</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="nexus-btn-secondary text-sm flex-1">Cancel</button>
            <button onClick={() => onConfirm({ lostReason: outcome === "lost" ? lostReason : undefined, value: parseFloat(value) })} className={cn("text-sm flex-1", outcome === "won" ? "nexus-btn-primary" : "bg-nexus-danger text-white hover:bg-nexus-danger/90 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-150")}>
              {outcome === "won" ? "Mark Won" : "Mark Lost"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Deal Detail Drawer ───
function DealDetailDrawer({
  deal, pipelineStages, onClose, onRefresh, onWon, onLost,
}: {
  deal: Deal; pipelineStages: PipelineStage[]; onClose: () => void; onRefresh: () => void; onWon: () => void; onLost: () => void;
}) {
  const currentStage = pipelineStages.find((s) => s.id === deal.stageId);
  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div className="w-[480px] max-w-[90vw] h-full bg-nexus-surface border-l border-nexus-border overflow-y-auto animate-slide-left" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-nexus-surface border-b border-nexus-border p-4 z-10">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold text-nexus-text-primary">{deal.title}</h2>
              {deal.contact && <p className="text-sm text-nexus-text-secondary">{deal.contact.firstName} {deal.contact.lastName}</p>}
            </div>
            <button onClick={onClose} className="nexus-btn-ghost p-1"><X size={16} /></button>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-nexus-success font-semibold">${deal.value.toLocaleString()}</span>
            {currentStage && (
              <span className="nexus-badge" style={{ backgroundColor: `${currentStage.color}20`, color: currentStage.color }}>
                {currentStage.name}
              </span>
            )}
            <span className="text-nexus-text-muted">{deal.probability}%</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* AI Next-Step Suggestion */}
          <div className="nexus-card p-4 border-nexus-ai/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-nexus-ai" />
              <span className="text-xs font-semibold text-nexus-ai uppercase tracking-wider">AI Suggestion</span>
            </div>
            <p className="text-sm text-nexus-text-secondary">
              {deal.probability < 30
                ? "This deal needs qualification. Consider scheduling a discovery call to understand their needs better."
                : deal.probability < 70
                ? "Good progress! Send a tailored proposal highlighting ROI and case studies from similar clients."
                : "Close to closing! Send a final review and address any remaining objections. Consider a limited-time offer."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {!deal.wonAt && !deal.lostAt && (
              <>
                <button onClick={onWon} className="nexus-btn-primary text-xs"><CheckCircle2 size={12} /> Mark Won</button>
                <button onClick={onLost} className="bg-nexus-danger/10 text-nexus-danger hover:bg-nexus-danger/20 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"><XCircle size={12} /> Mark Lost</button>
              </>
            )}
            <button className="nexus-btn-secondary text-xs"><MessageSquare size={12} /> Activity</button>
            <button className="nexus-btn-secondary text-xs"><FileText size={12} /> Invoice</button>
          </div>

          {/* Details */}
          <div className="nexus-card p-4 space-y-2">
            <h3 className="text-xs font-semibold text-nexus-text-muted uppercase tracking-wider mb-2">Details</h3>
            <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Stage</span><span className="text-sm text-nexus-text-primary">{currentStage?.name || "—"}</span></div>
            <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Probability</span><span className="text-sm text-nexus-text-primary">{deal.probability}%</span></div>
            <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Expected Close</span><span className="text-sm text-nexus-text-primary">{deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "—"}</span></div>
            <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Days in Stage</span><span className="text-sm text-nexus-text-primary">{daysInStage(deal)} days</span></div>
            {deal.wonAt && <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Won At</span><span className="text-sm text-nexus-success">{new Date(deal.wonAt).toLocaleDateString()}</span></div>}
            {deal.lostAt && <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Lost At</span><span className="text-sm text-nexus-danger">{new Date(deal.lostAt).toLocaleDateString()}</span></div>}
            {deal.lostReason && <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Lost Reason</span><span className="text-sm text-nexus-danger">{deal.lostReason}</span></div>}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-nexus-border">
            {(["overview", "activity"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-[1px] transition-colors",
                  activeTab === tab ? "text-nexus-accent-primary border-nexus-accent-primary" : "text-nexus-text-muted border-transparent")}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="nexus-card p-4 space-y-3">
              <h3 className="text-xs font-semibold text-nexus-text-muted uppercase tracking-wider mb-2">Contact Info</h3>
              {deal.contact ? (
                <>
                  <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Name</span><span className="text-sm text-nexus-text-primary">{(deal.contact as unknown as { firstName: string; lastName: string }).firstName} {(deal.contact as unknown as { firstName: string; lastName: string }).lastName}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Email</span><span className="text-sm text-nexus-primary">{(deal.contact as unknown as { email: string }).email}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Phone</span><span className="text-sm text-nexus-primary">{(deal.contact as unknown as { phone: string | null }).phone || "—"}</span></div>
                </>
              ) : (
                <p className="text-sm text-nexus-text-muted">No contact linked.</p>
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-2">
              {[
                { text: "Deal created", time: deal.createdAt },
                ...(deal.wonAt ? [{ text: "Deal won", time: deal.wonAt }] : []),
                ...(deal.lostAt ? [{ text: `Deal lost: ${deal.lostReason || "No reason"}`, time: deal.lostAt }] : []),
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-nexus-accent-primary/50 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-nexus-text-primary">{item.text}</p>
                    <p className="text-xs text-nexus-text-muted">{new Date(item.time).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Forecast Panel ───
function ForecastPanel({ pipeline, onClose }: { pipeline: Pipeline; onClose: () => void }) {
  const activeDeals = pipeline.deals.filter((d) => !d.wonAt && !d.lostAt);
  const totalValue = activeDeals.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = activeDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);
  const wonValue = pipeline.deals.filter((d) => d.wonAt).reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-nexus-surface border border-nexus-border rounded-xl p-6 w-full max-w-lg mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-nexus-text-primary">Forecast — {pipeline.name}</h2>
          <button onClick={onClose} className="nexus-btn-ghost p-1"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="nexus-card p-4 text-center">
            <p className="text-xs text-nexus-text-muted mb-1">Total Pipeline</p>
            <p className="text-xl font-bold text-nexus-text-primary">${totalValue.toLocaleString()}</p>
          </div>
          <div className="nexus-card p-4 text-center">
            <p className="text-xs text-nexus-text-muted mb-1">Weighted</p>
            <p className="text-xl font-bold text-nexus-warning">${weightedValue.toLocaleString()}</p>
          </div>
          <div className="nexus-card p-4 text-center">
            <p className="text-xs text-nexus-text-muted mb-1">Closed Won</p>
            <p className="text-xl font-bold text-nexus-success">${wonValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-nexus-text-primary">Stage Breakdown</h3>
          {pipeline.stages.map((stage, i) => {
            const stageDeals = activeDeals.filter((d) => d.stageId === stage.id);
            const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

            return (
              <div key={stage.id} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color || getStageColor(i) }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-nexus-text-primary truncate">{stage.name}</span>
                    <span className="text-nexus-text-secondary font-mono">${stageValue.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-nexus-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${totalValue > 0 ? (stageValue / totalValue) * 100 : 0}%`, backgroundColor: stage.color || getStageColor(i) }}
                    />
                  </div>
                  <p className="text-xs text-nexus-text-muted mt-0.5">{stageDeals.length} deals · {stage.probability}% probability</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
