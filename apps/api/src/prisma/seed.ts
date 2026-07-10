import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding NEXUS CRM database...");

  // ─── Create super admin org ───
  const org = await prisma.organization.upsert({
    where: { slug: "nexus-super-admin" },
    update: {},
    create: {
      name: "NEXUS Super Admin",
      slug: "nexus-super-admin",
      plan: "ENTERPRISE",
      settings: { theme: "dark", locale: "en" },
      aiPersonaName: "Nexus",
      aiSystemPrompt: "You are NEXUS AI, a helpful CRM assistant.",
    },
  });

  // ─── Create super admin user ───
  const hashedPassword = await bcrypt.hash("Admin@123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@nexuscrm.io" },
    update: {},
    create: {
      email: "admin@nexuscrm.io",
      name: "Super Admin",
      role: "SUPER_ADMIN",
      hashedPassword,
      organizationId: org.id,
      emailVerified: new Date(),
    },
  });

  // Update org owner
  await prisma.organization.update({
    where: { id: org.id },
    data: { ownerId: admin.id },
  });

  // ─── Create demo org ───
  const demoOrg = await prisma.organization.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: {
      name: "Demo Agency",
      slug: "demo-agency",
      plan: "PRO",
      ownerId: admin.id,
      settings: { theme: "dark", locale: "en" },
      aiPersonaName: "Nexus",
    },
  });

  // ─── Create demo user ───
  const demoPassword = await bcrypt.hash("Demo@123456", 12);
  await prisma.user.upsert({
    where: { email: "demo@demo.com" },
    update: {},
    create: {
      email: "demo@demo.com",
      name: "Demo User",
      role: "ADMIN",
      hashedPassword: demoPassword,
      organizationId: demoOrg.id,
      emailVerified: new Date(),
    },
  });

  // ─── Create default pipeline ───
  const pipeline = await prisma.pipeline.upsert({
    where: { id: "default-pipeline" },
    update: {},
    create: {
      id: "default-pipeline",
      name: "Default Sales Pipeline",
      stages: [
        { id: "lead-in", name: "Lead In", probability: 10, color: "#6366F1", order: 0 },
        { id: "contacted", name: "Contacted", probability: 20, color: "#8B5CF6", order: 1 },
        { id: "qualified", name: "Qualified", probability: 40, color: "#06B6D4", order: 2 },
        { id: "proposal", name: "Proposal", probability: 60, color: "#F59E0B", order: 3 },
        { id: "negotiation", name: "Negotiation", probability: 80, color: "#EC4899", order: 4 },
        { id: "closed-won", name: "Closed Won", probability: 100, color: "#22C55E", order: 5 },
        { id: "closed-lost", name: "Closed Lost", probability: 0, color: "#EF4444", order: 6 },
      ],
      isDefault: true,
      organizationId: demoOrg.id,
    },
  });

  // ─── Create sample contacts ───
  const contacts = [
    { firstName: "Alice", lastName: "Johnson", email: "alice@example.com", phone: "+1-555-0101", status: "CUSTOMER" as const, tags: ["vip", "enterprise"], source: "Website", score: 85 },
    { firstName: "Bob", lastName: "Smith", email: "bob@example.com", phone: "+1-555-0102", status: "LEAD" as const, tags: ["cold"], source: "Referral", score: 25 },
    { firstName: "Carol", lastName: "Williams", email: "carol@example.com", phone: "+1-555-0103", status: "PROSPECT" as const, tags: ["warm"], source: "Social Media", score: 55 },
    { firstName: "David", lastName: "Brown", email: "david@example.com", phone: "+1-555-0104", status: "LEAD" as const, tags: ["hot"], source: "Event", score: 70 },
    { firstName: "Eve", lastName: "Davis", email: "eve@example.com", phone: "+1-555-0105", status: "CUSTOMER" as const, tags: ["vip"], source: "Referral", score: 95 },
  ];

  for (const c of contacts) {
    if (!c.email) continue;
    await prisma.contact.upsert({
      where: { email: c.email },
      update: {},
      create: {
        ...c,
        organizationId: demoOrg.id,
        assignedToId: admin.id,
        notes: `Sample contact for demo purposes.`,
      },
    });
  }

  // ─── Create sample deals ───
  const sampleContacts = await prisma.contact.findMany({ where: { organizationId: demoOrg.id } });
  for (let i = 0; i < sampleContacts.length; i++) {
    await prisma.deal.create({
      data: {
        title: `${sampleContacts[i].firstName}'s Deal`,
        value: Math.floor(Math.random() * 50000) + 1000,
        currency: "USD",
        probability: [10, 20, 40, 60, 80][i] || 50,
        stageId: pipeline.stages[i]?.id || pipeline.stages[0].id,
        pipelineId: pipeline.id,
        contactId: sampleContacts[i].id,
        organizationId: demoOrg.id,
        assignedToId: admin.id,
      },
    });
  }

  // ─── Create sample conversations ───
  if (sampleContacts[0]) {
    const conv = await prisma.conversation.create({
      data: {
        channel: "CHAT",
        status: "OPEN",
        contactId: sampleContacts[0].id,
        organizationId: demoOrg.id,
      },
    });
    await prisma.message.createMany({
      data: [
        { body: "Hi, I'm interested in your Pro plan pricing.", sender: "CONTACT", conversationId: conv.id, organizationId: demoOrg.id },
        { body: "Hello Alice! Our Pro plan starts at $49/month. Would you like a demo?", sender: "USER", conversationId: conv.id, organizationId: demoOrg.id },
      ],
    });
  }

  // ─── Create sample campaign ───
  await prisma.campaign.create({
    data: {
      name: "Summer Outreach 2026",
      type: "EMAIL",
      status: "DRAFT",
      subject: "Special summer offers just for you",
      body: "<h1>Summer Sale!</h1><p>Exclusive deals for our valued customers.</p>",
      organizationId: demoOrg.id,
    },
  });

  // ─── Create sample automation ───
  await prisma.automation.create({
    data: {
      name: "Welcome Sequence",
      trigger: { type: "contact.created" },
      steps: [{ type: "send_email", template: "welcome", delay: 0 }],
      isActive: true,
      organizationId: demoOrg.id,
    },
  });

  console.log("✅ Seed complete!");
  console.log("   Super admin: admin@nexuscrm.io / Admin@123456");
  console.log("   Demo user:   demo@demo.com / Demo@123456");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
