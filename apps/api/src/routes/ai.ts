import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { authenticate } from "../middleware/auth";
import { scopeTenant } from "../middleware/tenancy";
import { AppError } from "../middleware/errorHandler";
import { scoreLead, batchScoreOrganization } from "../services/ai/brain";
import { executeToolCall, getToolDefinitions } from "../services/ai/tools";
import { env } from "../env";

const router = Router();
router.use(authenticate, scopeTenant);

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  context: z.object({
    page: z.string().optional(),
    contactId: z.string().uuid().optional(),
    dealId: z.string().uuid().optional(),
  }).optional(),
});

const OPeNCODE_API_BASE = "https://api.opencode.ai/v1";

// ─── Helper: Call DeepSeek V4 via opencode API ───
async function callAI(messages: any[], tools?: any[], stream = false) {
  const body: Record<string, unknown> = {
    model: "deepseek-v4",
    messages,
    max_tokens: 4096,
    temperature: 0.7,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  if (stream) {
    body.stream = true;
  }

  const res = await fetch(`${OPeNCODE_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPeNCODE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`AI API error (${res.status}): ${errBody}`);
  }

  return res;
}

// ─── Helper: Build AI response with tool execution ───
async function processWithTools(
  messages: any[],
  toolDefs: any[],
  ctx: { userId: string; organizationId: string },
  maxTurns = 5,
): Promise<{ content: string; toolCalls: any[] }> {
  let currentMessages = [...messages];
  const allToolCalls: any[] = [];

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await callAI(currentMessages, toolDefs);
    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      return { content: "No response from AI", toolCalls: allToolCalls };
    }

    const msg = choice.message;

    // Check for tool calls
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      currentMessages.push(msg);

      for (const tc of msg.tool_calls) {
        const toolName = tc.function.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = {};
        }

        console.log(`[AI] Executing tool: ${toolName}`, args);
        const result = await executeToolCall(toolName, args, {
          userId: ctx.userId,
          organizationId: ctx.organizationId,
        });

        allToolCalls.push({ toolName, args, result });

        currentMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: toolName,
          content: JSON.stringify(result),
        });
      }

      continue; // Let AI respond with final text
    }

    // Final text response
    return { content: msg.content || "", toolCalls: allToolCalls };
  }

  return {
    content: "Reached maximum reasoning turns. Please refine your question.",
    toolCalls: allToolCalls,
  };
}

// ─── Helper: Generate response without API key (fallback) ───
async function generateFallbackResponse(message: string, messages: any[], org: any, organizationId: string) {
  const lower = message.toLowerCase();

  if (lower.includes("score") || (lower.includes("lead") && (lower.includes("hot") || lower.includes("cold") || lower.includes("warm")))) {
    return generateLeadScoreResponse(message, messages, organizationId);
  }
  if (lower.includes("pipeline") || lower.includes("deal") || lower.includes("forecast")) {
    return generatePipelineResponse(message, messages, organizationId);
  }

  return `I understand you're asking about: "${message}". As ${org?.aiPersonaName || "Nexus"}, I can help you:\n\n- Search and manage contacts\n- View pipeline and deal summaries\n- Analyze campaign performance\n- Create tasks and follow-ups\n- Generate business insights\n\nWhat would you like me to help with?`;
}

async function generateLeadScoreResponse(message: string, _messages: any[], organizationId: string) {
  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    orderBy: { score: "desc" },
    take: 5,
    select: { id: true, firstName: true, lastName: true, email: true, score: true, status: true },
  });

  return `Here are your top contacts by lead score:\n\n${contacts.map((c, i) => `${i + 1}. **${c.firstName} ${c.lastName}** (${c.email}) — Score: ${c.score}/100 — Status: ${c.status}`).join("\n")}\n\nI can provide more details about any specific contact or suggest next steps.`;
}

async function generatePipelineResponse(message: string, _messages: any[], organizationId: string) {
  const pipelines = await prisma.pipeline.findMany({
    where: { organizationId },
    include: {
      deals: {
        include: { contact: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  const totalValue = pipelines.reduce((sum, p) => sum + p.deals.reduce((s, d) => s + d.value, 0), 0);
  const dealCount = pipelines.reduce((sum, p) => sum + p.deals.length, 0);

  return `Your pipeline overview:\n\n- **${dealCount} total deals** across ${pipelines.length} pipeline(s)\n- **Total pipeline value:** $${totalValue.toLocaleString()}\n\n${pipelines.map((p) => {
    const stages = typeof p.stages === "string" ? JSON.parse(p.stages) : p.stages;
    const stageNames = Array.isArray(stages) ? stages.map((s: any) => s.name).join(" → ") : "stages configured";
    return `**${p.name}:** ${p.deals.length} deals — ${stageNames}`;
  }).join("\n")}\n\nWant me to drill down into any specific deal or pipeline?`;
}

// ─── GET /api/ai/conversations ───
router.get("/conversations", async (req, res, next) => {
  try {
    const conversations = await prisma.aIConversation.findMany({
      where: { userId: req.user!.userId, organizationId: req.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true, createdAt: true, updatedAt: true, tokensUsed: true, messages: true, contactId: true,
      },
    });

    const summaries = conversations.map((c) => {
      const msgs = (c.messages as any[]) || [];
      const firstUserMsg = msgs.find((m) => m.role === "user");
      return {
        id: c.id,
        title: firstUserMsg?.content?.slice(0, 80) || "New conversation",
        messageCount: msgs.length,
        tokensUsed: c.tokensUsed,
        contactId: c.contactId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    res.json({ conversations: summaries });
  } catch (error) { next(error); }
});

// ─── POST /api/ai/chat ───
router.post("/chat", async (req, res, next) => {
  try {
    const { message, conversationId, context } = chatSchema.parse(req.body);

    let conversation;
    if (conversationId) {
      conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId: req.user!.userId, organizationId: req.organizationId },
      });
      if (!conversation) throw new AppError(404, "Conversation not found");
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { name: true, aiPersonaName: true, aiSystemPrompt: true },
    });

    const messages = conversation ? [...((conversation.messages as any[]) || [])] : [];
    let toolCalls: any[] = [];

    if (!conversation) {
      const personaName = org?.aiPersonaName || "Nexus";
      const systemPrompt = org?.aiSystemPrompt
        || `You are ${personaName}, the AI business assistant for ${org?.name || "this organization"}. You have full read and write access to the CRM and can take actions on behalf of the user. Be concise, action-oriented, and data-driven. You can search contacts, view deals, create records, send emails, generate insights, and more. Always cite specific data when available.`;

      messages.push({ role: "system", content: systemPrompt, timestamp: new Date().toISOString() });
    }

    if (context?.page) {
      messages.push({ role: "system", content: `Current page: ${context.page}`, timestamp: new Date().toISOString() });
    }

    if (context?.contactId) {
      messages.push({ role: "system", content: `Viewing contact: ${context.contactId}`, timestamp: new Date().toISOString() });
    }

    if (context?.dealId) {
      messages.push({ role: "system", content: `Viewing deal: ${context.dealId}`, timestamp: new Date().toISOString() });
    }

    messages.push({ role: "user", content: message, timestamp: new Date().toISOString() });

    // AI response
    let aiContent: string;

    const hasApiKey = env.OPeNCODE_API_KEY && env.OPeNCODE_API_KEY.length > 0;

    if (hasApiKey) {
      try {
        const result = await processWithTools(
          messages.map((m) => ({ role: m.role, content: m.content })),
          getToolDefinitions(),
          { userId: req.user!.userId, organizationId: req.organizationId! },
        );
        aiContent = result.content;
        toolCalls = result.toolCalls;
      } catch (err) {
        console.error("[AI] API call failed, using fallback:", err);
        aiContent = await generateFallbackResponse(message, messages, org, req.organizationId!);
      }
    } else {
      aiContent = await generateFallbackResponse(message, messages, org, req.organizationId!);
    }

    const aiResponse = { role: "assistant", content: aiContent, timestamp: new Date().toISOString() };
    messages.push(aiResponse);

    const result = await prisma.aIConversation.upsert({
      where: { id: conversationId || "none" },
      create: {
        userId: req.user!.userId,
        organizationId: req.organizationId!,
        contactId: context?.contactId || null,
        messages,
        tokensUsed: message.length + (toolCalls.length * 100),
        context: context || {},
      },
      update: {
        messages,
        tokensUsed: { increment: message.length + (toolCalls.length * 100) },
        context: context || {},
      },
    });

    res.json({
      message: aiResponse,
      conversationId: result.id,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    });
  } catch (error) { next(error); }
});

// ─── GET /api/ai/chat/stream (SSE streaming) ───
router.get("/chat/stream", async (req, res, next) => {
  try {
    const message = req.query.message as string;
    if (!message) throw new AppError(400, "message query param is required");

    const conversationId = req.query.conversationId as string | undefined;
    const contactId = req.query.contactId as string | undefined;

    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { name: true, aiPersonaName: true, aiSystemPrompt: true },
    });

    // SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Load or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId: req.user!.userId, organizationId: req.organizationId },
      });
    }

    const messages = conversation ? [...((conversation.messages as any[]) || [])] : [];

    if (!conversation) {
      const personaName = org?.aiPersonaName || "Nexus";
      const systemPrompt = org?.aiSystemPrompt
        || `You are ${personaName}, the AI business assistant for ${org?.name || "this organization"}. You have full read and write access to the CRM and can take actions on behalf of the user. Be concise, action-oriented, and data-driven.`;

      messages.push({ role: "system", content: systemPrompt, timestamp: new Date().toISOString() });
    }

    messages.push({ role: "user", content: message, timestamp: new Date().toISOString() });

    const hasApiKey = env.OPeNCODE_API_KEY && env.OPeNCODE_API_KEY.length > 0;

    if (hasApiKey) {
      try {
        const streamRes = await callAI(
          messages.map((m) => ({ role: m.role, content: m.content })),
          getToolDefinitions(),
          true,
        );

        const reader = streamRes.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let toolCallBuffer: any[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const chunk = JSON.parse(jsonStr);
              const delta = chunk.choices?.[0]?.delta;

              if (delta?.content) {
                fullContent += delta.content;
                sendEvent("token", { token: delta.content });
              }

              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (tc.function?.name) {
                    toolCallBuffer.push({ name: tc.function.name, arguments: tc.function.arguments || "" });
                  } else if (tc.function?.arguments && toolCallBuffer.length > 0) {
                    toolCallBuffer[toolCallBuffer.length - 1].arguments += tc.function.arguments;
                  }
                }
              }
            } catch { /* skip malformed chunks */ }
          }
        }

        // Process tool calls
        if (toolCallBuffer.length > 0) {
          const ctx = { userId: req.user!.userId, organizationId: req.organizationId! };
          for (const tc of toolCallBuffer) {
            let args: Record<string, unknown> = {};
            try { args = JSON.parse(tc.arguments); } catch { args = {}; }
            const result = await executeToolCall(tc.name, args, ctx);
            sendEvent("tool_result", { toolName: tc.name, args, result });
          }
        }

        sendEvent("done", { content: fullContent });
      } catch (err: any) {
        console.error("[AI] Stream error, using fallback:", err);
        const fallback = await generateFallbackResponse(message, messages, org, req.organizationId!);
        sendEvent("token", { token: fallback });
        sendEvent("done", { content: fallback });
      }
    } else {
      const fallback = await generateFallbackResponse(message, messages, org, req.organizationId!);
      sendEvent("token", { token: fallback });
      sendEvent("done", { content: fallback });
    }

    // Save conversation
    const aiResponse = { role: "assistant", content: "", timestamp: new Date().toISOString() };
    messages.push(aiResponse);

    await prisma.aIConversation.upsert({
      where: { id: conversationId || "none" },
      create: {
        userId: req.user!.userId,
        organizationId: req.organizationId!,
        contactId: contactId || null,
        messages,
        tokensUsed: message.length,
        context: {},
      },
      update: {
        messages,
        tokensUsed: { increment: message.length },
      },
    });

    res.end();
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/ai/score-contact/:id ───
router.post("/score-contact/:id", async (req, res, next) => {
  try {
    const result = await scoreLead(req.params.id);
    await prisma.contact.update({
      where: { id: req.params.id },
      data: { score: result.score },
    });
    res.json({ score: result.score, reason: result.reason });
  } catch (error) { next(error); }
});

// ─── POST /api/ai/batch-score ───
router.post("/batch-score", async (req, res, next) => {
  try {
    await batchScoreOrganization(req.organizationId!);
    res.json({ message: "Batch scoring complete" });
  } catch (error) { next(error); }
});

// ─── GET /api/ai/conversations/:id ───
router.get("/conversations/:id", async (req, res, next) => {
  try {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, organizationId: req.organizationId },
    });
    if (!conversation) throw new AppError(404, "Conversation not found");
    res.json({ conversation });
  } catch (error) { next(error); }
});

// ─── DELETE /api/ai/conversations/:id ───
router.delete("/conversations/:id", async (req, res, next) => {
  try {
    await prisma.aIConversation.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId, organizationId: req.organizationId },
    });
    res.json({ message: "Conversation deleted" });
  } catch (error) { next(error); }
});

export { router as aiRouter };
