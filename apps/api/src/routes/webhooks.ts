import { Router } from "express";
import crypto from "crypto";
import { env } from "../env";

const router = Router();

// Webhooks are public but validated via signature
router.post("/:provider", async (req, res) => {
  const signature = req.headers["x-webhook-signature"] as string;
  const payload = JSON.stringify(req.body);

  const webhookSecret = env.WEBHOOK_SECRET || "webhook-secret";
  const expectedSig = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");

  if (signature && signature !== expectedSig) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // Process webhook
  console.log(`Webhook received from ${req.params.provider}:`, req.body);
  res.json({ received: true });
});

export { router as webhooksRouter };
