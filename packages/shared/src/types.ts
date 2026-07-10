// ─── User & Auth ───
export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MEMBER" | "CLIENT";
export type PlanType = "FREE" | "PRO" | "AGENCY" | "ENTERPRISE";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: UserRole;
  organizationId: string | null;
  emailVerified: string | null;
  twoFactorEnabled: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    plan: PlanType;
  } | null;
}

// ─── CRM Core ───
export type ContactStatus = "LEAD" | "PROSPECT" | "CUSTOMER" | "CHURNED";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  tags: string[];
  source: string | null;
  status: ContactStatus;
  customFields: Record<string, unknown>;
  notes: string | null;
  score: number;
  organizationId: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Deals & Pipeline ───
export interface PipelineStage {
  id: string;
  name: string;
  probability: number;
  color: string;
  order: number;
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
  organizationId: string;
  assignedToId: string | null;
  expectedCloseDate: string | null;
  lostReason: string | null;
  wonAt: string | null;
  lostAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Analytics ───
export interface DashboardAnalytics {
  totalContacts: number;
  totalDealValue: number;
  totalDeals: number;
  totalVisitors: number;
  totalCampaigns: number;
}

// ─── AI ───
export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AIConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  tokensUsed: number;
  contactId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Notifications ───
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

// ─── Campaigns ───
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "COMPLETED";
export type CampaignType = "EMAIL" | "SMS" | "SOCIAL" | "SEQUENCE";

// ─── Pagination ───
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── API Response ───
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: Pagination;
}
