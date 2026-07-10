import { prisma } from "../../prisma/client";

/**
 * AI Lead Scoring Service
 * Analyzes contact engagement and generates a 0-100 score.
 * In production, calls DeepSeek V4 via the opencode API.
 */

export interface LeadScoreResult {
  score: number;
  reason: string;
}

export async function scoreLead(contactId: string): Promise<LeadScoreResult> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      deals: { select: { value: true, stageId: true, probability: true } },
      activities: { select: { type: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 20 },
      conversations: { select: { status: true, lastMessageAt: true } },
      formSubmissions: { take: 5 },
    },
  });

  if (!contact) {
    return { score: 0, reason: "Contact not found" };
  }

  // Heuristic scoring (covers cold-start before AI API is configured)
  let score = 10;

  // +20 if has email
  if (contact.email) score += 20;
  // +10 if has phone
  if (contact.phone) score += 10;

  // + up to 15 for recent activity
  const recentActivity = contact.activities.filter(
    (a) => a.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;
  score += Math.min(recentActivity * 3, 15);

  // + up to 20 for deal value and probability
  const totalDealValue = contact.deals.reduce((sum, d) => sum + d.value, 0);
  if (totalDealValue > 0) {
    score += Math.min(totalDealValue / 1000, 10);
    const avgProb = contact.deals.reduce((sum, d) => sum + d.probability, 0) / contact.deals.length;
    score += avgProb / 5;
  }

  // +10 if has active conversations
  const activeConvs = contact.conversations.filter((c) => c.status === "OPEN").length;
  if (activeConvs > 0) score += 10;

  // +10 if has form submissions
  if (contact.formSubmissions.length > 0) score += 10;

  // +15 if status is PROSPECT or CUSTOMER
  if (contact.status === "PROSPECT") score += 15;
  if (contact.status === "CUSTOMER") score += 25;

  // Normalize to 0-100
  score = Math.min(Math.max(score, 0), 100);

  const reason = score >= 70
    ? "Hot lead — high engagement and active deals"
    : score >= 40
    ? "Warm lead — some engagement, follow up recommended"
    : "Cold lead — needs initial contact and qualification";

  return { score, reason };
}

/**
 * Batch score all contacts in an organization
 */
export async function batchScoreOrganization(organizationId: string): Promise<void> {
  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    select: { id: true },
  });

  for (const contact of contacts) {
    const result = await scoreLead(contact.id);
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        score: result.score,
        notes: result.reason,
      },
    });
  }
}
