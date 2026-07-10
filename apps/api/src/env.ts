import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().url().min(1, "DATABASE_URL is required"),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // SMS
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // AI
  OPeNCODE_API_KEY: z.string().optional(),

  // File Storage
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  R2_ENDPOINT: z.string().optional(),

  // Search
  MEILISEARCH_URL: z.string().url().optional(),
  MEILISEARCH_API_KEY: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Webhook
  WEBHOOK_SECRET: z.string().optional(),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
