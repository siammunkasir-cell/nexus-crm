const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface PipelineStage {
  id: string;
  name: string;
  probability: number;
  color: string;
  order: number;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  isDefault: boolean;
  deals: Deal[];
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  probability: number;
  stageId: string;
  pipelineId: string;
  contactId: string | null;
  contact?: { id: string; firstName: string; lastName: string | null; email?: string; avatar?: string | null } | null;
  assignedToId: string | null;
  assignedTo?: { id: string; name: string | null; avatar: string | null } | null;
  expectedCloseDate: string | null;
  lostReason: string | null;
  wonAt: string | null;
  lostAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchPipelines(): Promise<{ pipelines: Pipeline[] }> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/api/deals`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch pipelines");
  return res.json();
}

export async function createDeal(data: Partial<Deal>): Promise<{ deal: Deal }> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/api/deals/deals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create deal");
  return res.json();
}

export async function updateDeal(id: string, data: Partial<Deal>): Promise<{ deal: Deal }> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/api/deals/deals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update deal");
  return res.json();
}

export async function createPipeline(data: { name: string; stages: PipelineStage[] }): Promise<{ pipeline: Pipeline }> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/api/deals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create pipeline");
  return res.json();
}

const STAGE_COLORS = [
  "#6366F1", "#8B5CF6", "#06B6D4", "#22C55E",
  "#F59E0B", "#EF4444", "#EC4899", "#14B8A6",
];

export function getStageColor(index: number): string {
  return STAGE_COLORS[index % STAGE_COLORS.length];
}

export function daysInStage(deal: Deal): number {
  return Math.floor((Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24));
}
