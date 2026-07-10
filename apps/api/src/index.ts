import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./env";
import { prisma } from "./prisma/client";
import { authRouter } from "./routes/auth";
import { contactsRouter } from "./routes/contacts";
import { dealsRouter } from "./routes/deals";
import { conversationsRouter } from "./routes/conversations";
import { campaignsRouter } from "./routes/campaigns";
import { automationRouter } from "./routes/automation";
import { aiRouter } from "./routes/ai";
import { analyticsRouter } from "./routes/analytics";
import { formsRouter } from "./routes/forms";
import { funnelsRouter } from "./routes/funnels";
import { invoicesRouter } from "./routes/invoices";
import { webhooksRouter } from "./routes/webhooks";
import { adminRouter } from "./routes/admin";
import { errorHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/auth";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: env.CORS_ORIGIN, credentials: true },
});

// ─── Middleware ───
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ───
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Public Routes ───
app.use("/api/auth", authRouter);

// ─── Protected Routes ───
app.use("/api/contacts", authenticate, contactsRouter);
app.use("/api/deals", authenticate, dealsRouter);
app.use("/api/conversations", authenticate, conversationsRouter);
app.use("/api/campaigns", authenticate, campaignsRouter);
app.use("/api/automation", authenticate, automationRouter);
app.use("/api/ai", authenticate, aiRouter);
app.use("/api/analytics", authenticate, analyticsRouter);
app.use("/api/forms", authenticate, formsRouter);
app.use("/api/funnels", authenticate, funnelsRouter);
app.use("/api/invoices", authenticate, invoicesRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/admin", authenticate, adminRouter);

// ─── Error Handler ───
app.use(errorHandler);

// ─── Socket.io ───
io.on("connection", (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);

  socket.on("join:organization", (orgId: string) => {
    socket.join(`org:${orgId}`);
  });

  socket.on("disconnect", () => {
    console.log(`⚡ Client disconnected: ${socket.id}`);
  });
});

// ─── Start Server ───
async function main() {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL connected");

    httpServer.listen(env.PORT, () => {
      console.log(`🚀 NEXUS API running on port ${env.PORT}`);
      console.log(`   Health: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

main();

// ─── Graceful Shutdown ───
process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down...");
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
});

export { app, httpServer, io };
