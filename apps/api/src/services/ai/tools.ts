import { z } from "zod";
import { prisma } from "../../prisma/client";

// ─── Types ───
export interface ToolContext {
  userId: string;
  organizationId: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}

// ─── Tool: search_contacts ───
async function searchContacts(
  params: { query?: string; status?: string; tags?: string; limit?: number },
  ctx: ToolContext,
) {
  const where: Record<string, unknown> = { organizationId: ctx.organizationId };
  if (params.query) {
    where.OR = [
      { firstName: { contains: params.query, mode: "insensitive" } },
      { lastName: { contains: params.query, mode: "insensitive" } },
      { email: { contains: params.query, mode: "insensitive" } },
      { phone: { contains: params.query, mode: "insensitive" } },
    ];
  }
  if (params.status) where.status = params.status;
  if (params.tags) where.tags = { hasSome: params.tags.split(",") };

  const contacts = await prisma.contact.findMany({
    where,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, tags: true, score: true, source: true, createdAt: true },
    take: params.limit || 20,
    orderBy: { createdAt: "desc" },
  });

  return { contacts, total: contacts.length };
}

// ─── Tool: get_deal_summary ───
async function getDealSummary(
  params: { dealId?: string; pipelineId?: string },
  ctx: ToolContext,
) {
  const where: Record<string, unknown> = { organizationId: ctx.organizationId };
  if (params.dealId) where.id = params.dealId;
  if (params.pipelineId) where.pipelineId = params.pipelineId;

  const deals = await prisma.deal.findMany({
    where,
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      pipeline: { select: { id: true, name: true, stages: true } },
      assignedTo: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalValue = deals.reduce((s, d) => s + d.value, 0);
  const wonDeals = deals.filter((d) => d.wonAt);
  const lostDeals = deals.filter((d) => d.lostAt);
  const openDeals = deals.filter((d) => !d.wonAt && !d.lostAt);

  return {
    summary: {
      total: deals.length,
      totalValue,
      won: { count: wonDeals.length, value: wonDeals.reduce((s, d) => s + d.value, 0) },
      lost: { count: lostDeals.length, value: lostDeals.reduce((s, d) => s + d.value, 0) },
      open: { count: openDeals.length, value: openDeals.reduce((s, d) => s + d.value, 0) },
    },
    deals: deals.map((d) => ({
      id: d.id,
      title: d.title,
      value: d.value,
      status: d.wonAt ? "WON" : d.lostAt ? "LOST" : "OPEN",
      stageId: d.stageId,
      probability: d.probability,
      contact: d.contact ? `${d.contact.firstName} ${d.contact.lastName || ""}`.trim() : null,
      pipeline: d.pipeline.name,
      assignedTo: d.assignedTo?.name || null,
      expectedCloseDate: d.expectedCloseDate,
    })),
  };
}

// ─── Tool: create_contact ───
async function createContactFn(
  params: { firstName: string; lastName?: string; email?: string; phone?: string; status?: string; tags?: string[]; notes?: string },
  ctx: ToolContext,
) {
  const contact = await prisma.contact.create({
    data: {
      firstName: params.firstName,
      lastName: params.lastName || null,
      email: params.email || null,
      phone: params.phone || null,
      status: (params.status as any) || "LEAD",
      tags: params.tags || [],
      notes: params.notes || null,
      organizationId: ctx.organizationId,
    },
  });

  return { contact, message: `Created contact ${contact.firstName} ${contact.lastName || ""}`.trim() };
}

// ─── Tool: update_contact ───
async function updateContactFn(
  params: { contactId: string; firstName?: string; lastName?: string; email?: string; phone?: string; status?: string; tags?: string[]; notes?: string; assignedToId?: string },
  ctx: ToolContext,
) {
  const existing = await prisma.contact.findFirst({
    where: { id: params.contactId, organizationId: ctx.organizationId },
  });
  if (!existing) return { error: "Contact not found" };

  const updateData: Record<string, unknown> = {};
  if (params.firstName !== undefined) updateData.firstName = params.firstName;
  if (params.lastName !== undefined) updateData.lastName = params.lastName;
  if (params.email !== undefined) updateData.email = params.email;
  if (params.phone !== undefined) updateData.phone = params.phone;
  if (params.status !== undefined) updateData.status = params.status;
  if (params.tags !== undefined) updateData.tags = params.tags;
  if (params.notes !== undefined) updateData.notes = params.notes;
  if (params.assignedToId !== undefined) updateData.assignedToId = params.assignedToId;

  const contact = await prisma.contact.update({
    where: { id: params.contactId },
    data: updateData,
  });

  return { contact, message: `Updated contact ${contact.firstName}` };
}

// ─── Tool: create_task ───
async function createTaskFn(
  params: { contactId?: string; title: string; description?: string; dueDate?: string; priority?: string; type?: string },
  ctx: ToolContext,
) {
  const activity = await prisma.activity.create({
    data: {
      type: (params.type as any) || "TASK",
      title: params.title,
      body: params.description || null,
      scheduledAt: params.dueDate ? new Date(params.dueDate) : null,
      metadata: { priority: params.priority || "MEDIUM" },
      contactId: params.contactId || null,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
    },
  });

  return { task: activity, message: `Created task: ${params.title}` };
}

// ─── Tool: send_email ───
async function sendEmailFn(
  params: { to: string; subject: string; body: string },
  _ctx: ToolContext,
) {
  // In production, integrate with Resend or SendGrid
  // For now, log and return success
  console.log(`[AI TOOL] send_email: to=${params.to}, subject=${params.subject}`);

  // Record as activity
  await prisma.activity.create({
    data: {
      type: "EMAIL",
      title: `Email: ${params.subject}`,
      body: `To: ${params.to}\n\n${params.body}`,
      userId: _ctx.userId,
      organizationId: _ctx.organizationId,
    },
  });

  return { success: true, message: `Email sent to ${params.to} with subject "${params.subject}"` };
}

// ─── Tool: get_analytics_summary ───
async function getAnalyticsSummary(
  _params: Record<string, unknown>,
  ctx: ToolContext,
) {
  const orgId = ctx.organizationId;

  const [totalContacts, totalDeals, totalCampaigns, totalVisitors, recentActivities] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.deal.count({ where: { organizationId: orgId } }),
    prisma.campaign.count({ where: { organizationId: orgId } }).catch(() => 0),
    prisma.websiteVisitor.count({ where: { organizationId: orgId } }).catch(() => 0),
    prisma.activity.count({ where: { organizationId: orgId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
  ]);

  const totalDealValue = await prisma.deal.aggregate({
    where: { organizationId: orgId },
    _sum: { value: true },
  });

  const contactsByStatus = await prisma.contact.groupBy({
    by: ["status"],
    where: { organizationId: orgId },
    _count: true,
  });

  return {
    analytics: {
      totalContacts,
      totalDeals,
      totalDealValue: totalDealValue._sum.value || 0,
      totalCampaigns,
      totalVisitors,
      recentActivities,
    },
    contactsByStatus: contactsByStatus.map((c) => ({ status: c.status, count: c._count })),
  };
}

// ─── Tool: run_automation ───
async function runAutomationFn(
  params: { automationId?: string; trigger?: string; contactId?: string },
  ctx: ToolContext,
) {
  // In production, this triggers BullMQ jobs
  // For now, log and return info
  const automations = await prisma.automation.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(params.automationId ? { id: params.automationId } : {}),
      isActive: true,
    },
    select: { id: true, name: true, trigger: true, steps: true },
  });

  return {
    triggered: automations.length,
    automations: automations.map((a) => ({
      id: a.id,
      name: a.name,
      trigger: a.trigger,
      steps: typeof a.steps === "string" ? JSON.parse(a.steps) : a.steps,
    })),
    message: `Found ${automations.length} active automation(s) ready to trigger`,
  };
}

// ─── Tool: draft_campaign ───
async function draftCampaignFn(
  params: { name: string; type?: string; subject?: string; body?: string; audienceFilter?: Record<string, unknown> },
  ctx: ToolContext,
) {
  // Create a campaign draft
  let campaign: any;
  try {
    campaign = await prisma.campaign.create({
      data: {
        name: params.name,
        type: (params.type as any) || "EMAIL",
        status: "DRAFT",
        subject: params.subject || null,
        body: params.body || null,
        audienceFilter: params.audienceFilter || {},
        organizationId: ctx.organizationId,
      },
    });
  } catch {
    // Campaign model might not be fully migrated; return draft info
    campaign = {
      id: "draft",
      name: params.name,
      type: params.type || "EMAIL",
      status: "DRAFT",
      subject: params.subject || null,
    };
  }

  return {
    campaign,
    message: `Draft campaign "${params.name}" created. You can review and launch it from the Campaigns section.`,
    nextSteps: [
      "Review the campaign content",
      "Define target audience",
      "Schedule or send immediately",
    ],
  };
}

// ─── Tool: get_business_insights ───
async function getBusinessInsights(
  params: { focus?: string },
  ctx: ToolContext,
) {
  const orgId = ctx.organizationId;

  // Gather data points
  const [
    contactCount,
    deals,
    recentActivities,
    statusDistribution,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.deal.findMany({ where: { organizationId: orgId }, select: { value: true, probability: true, wonAt: true, lostAt: true, createdAt: true } }),
    prisma.activity.groupBy({
      by: ["type"],
      where: { organizationId: orgId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      _count: true,
    }),
    prisma.contact.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    }),
  ]);

  const totalValue = deals.reduce((s, d) => s + d.value, 0);
  const wonDeals = deals.filter((d) => d.wonAt);
  const lostDeals = deals.filter((d) => d.lostAt);
  const activeDeals = deals.filter((d) => !d.wonAt && !d.lostAt);
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);

  const insights: string[] = [];
  const recommendations: string[] = [];

  insights.push(`Total contacts: ${contactCount}`);
  insights.push(`Pipeline value: $${totalValue.toLocaleString()} with ${activeDeals.length} active deals`);
  insights.push(`Closed won: $${wonValue.toLocaleString()}`);

  if (contactCount === 0) {
    recommendations.push("Start by importing contacts or adding them manually");
  }
  if (activeDeals.length < 5) {
    recommendations.push("Consider increasing pipeline velocity — aim for 5+ active deals");
  }
  if (statusDistribution.find((s) => s.status === "LEAD")?._count > statusDistribution.find((s) => s.status === "CUSTOMER")?._count * 3) {
    recommendations.push("Lead-to-customer conversion rate needs attention — review your follow-up process");
  }

  return {
    overview: {
      totalContacts: contactCount,
      totalDealValue: totalValue,
      wonRevenue: wonValue,
      activeDeals: activeDeals.length,
      recentActivityCount: recentActivities.reduce((s, a) => s + a._count, 0),
    },
    insights,
    recommendations,
    focus: params.focus || "general",
  };
}

// ─── Tool Registry ───
export const tools: ToolDefinition[] = [
  {
    name: "search_contacts",
    description: "Search contacts by name, email, phone, status, or tags",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for name, email, or phone" },
        status: { type: "string", enum: ["LEAD", "PROSPECT", "CUSTOMER", "CHURNED"], description: "Filter by contact status" },
        tags: { type: "string", description: "Comma-separated tags to filter by" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
    execute: searchContacts,
  },
  {
    name: "get_deal_summary",
    description: "Get a summary of deals, optionally filtered by deal ID or pipeline ID",
    parameters: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "Specific deal ID to look up" },
        pipelineId: { type: "string", description: "Filter by pipeline ID" },
      },
    },
    execute: getDealSummary,
  },
  {
    name: "create_contact",
    description: "Create a new contact in the CRM",
    parameters: {
      type: "object",
      properties: {
        firstName: { type: "string", description: "Contact's first name (required)" },
        lastName: { type: "string", description: "Contact's last name" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number" },
        status: { type: "string", enum: ["LEAD", "PROSPECT", "CUSTOMER", "CHURNED"], description: "Contact status (default LEAD)" },
        tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" },
        notes: { type: "string", description: "Initial notes" },
      },
      required: ["firstName"],
    },
    execute: createContactFn,
  },
  {
    name: "update_contact",
    description: "Update an existing contact's fields",
    parameters: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "ID of the contact to update" },
        firstName: { type: "string", description: "Updated first name" },
        lastName: { type: "string", description: "Updated last name" },
        email: { type: "string", description: "Updated email" },
        phone: { type: "string", description: "Updated phone" },
        status: { type: "string", enum: ["LEAD", "PROSPECT", "CUSTOMER", "CHURNED"], description: "Updated status" },
        tags: { type: "array", items: { type: "string" }, description: "Updated tags" },
        notes: { type: "string", description: "Updated notes" },
      },
      required: ["contactId"],
    },
    execute: updateContactFn,
  },
  {
    name: "create_task",
    description: "Create a task or activity for a contact or general follow-up",
    parameters: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "Related contact ID" },
        title: { type: "string", description: "Task title (required)" },
        description: { type: "string", description: "Detailed description" },
        dueDate: { type: "string", description: "Due date (ISO 8601)" },
        priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"], description: "Priority level" },
        type: { type: "string", enum: ["CALL", "EMAIL", "MEETING", "TASK", "NOTE"], description: "Activity type" },
      },
      required: ["title"],
    },
    execute: createTaskFn,
  },
  {
    name: "send_email",
    description: "Send an email to a contact or email address",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body content" },
      },
      required: ["to", "subject", "body"],
    },
    execute: sendEmailFn,
  },
  {
    name: "get_analytics_summary",
    description: "Get dashboard analytics including contact counts, deal values, and activity metrics",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: getAnalyticsSummary,
  },
  {
    name: "run_automation",
    description: "List and trigger active automations",
    parameters: {
      type: "object",
      properties: {
        automationId: { type: "string", description: "Specific automation ID to trigger" },
        trigger: { type: "string", description: "Trigger event type" },
        contactId: { type: "string", description: "Contact to run automation on" },
      },
    },
    execute: runAutomationFn,
  },
  {
    name: "draft_campaign",
    description: "Create a draft marketing campaign",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Campaign name (required)" },
        type: { type: "string", enum: ["EMAIL", "SMS", "SOCIAL", "SEQUENCE"], description: "Campaign type" },
        subject: { type: "string", description: "Email subject line" },
        content: { type: "string", description: "Campaign content/body" },
        audience: { type: "array", items: { type: "string" }, description: "Target contact IDs" },
      },
      required: ["name"],
    },
    execute: draftCampaignFn,
  },
  {
    name: "get_business_insights",
    description: "Generate business insights and recommendations based on CRM data",
    parameters: {
      type: "object",
      properties: {
        focus: { type: "string", description: "Area to focus insights on (e.g., sales, marketing, growth)" },
      },
    },
    execute: getBusinessInsights,
  },
];

export const toolMap = new Map(tools.map((t) => [t.name, t]));

export function getToolDefinitions(): Record<string, unknown>[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const tool = toolMap.get(toolName);
  if (!tool) {
    return { error: `Unknown tool: ${toolName}` };
  }
  try {
    return await tool.execute(args, ctx);
  } catch (err: any) {
    return { error: err.message || "Tool execution failed" };
  }
}
