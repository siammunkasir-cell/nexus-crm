"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2 } from "lucide-react";

const schema = z.object({ email: z.string().email("Invalid email") });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send reset email");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nexus-bg px-4">
        <div className="nexus-card p-8 text-center max-w-sm w-full animate-fade-in">
          <CheckCircle2 size={48} className="text-nexus-success mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-nexus-text-primary mb-2">Check your email</h2>
          <p className="text-nexus-text-secondary text-sm mb-6">If the email exists, we&apos;ve sent a reset link.</p>
          <Link href="/login" className="nexus-btn-primary inline-flex">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-nexus-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gradient">NEXUS CRM</h1>
          <p className="text-nexus-text-secondary text-sm mt-1">Reset your password</p>
        </div>
        <div className="nexus-card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="nexus-badge-danger w-full justify-center py-2 rounded-md text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-nexus-text-secondary mb-1.5">Email</label>
              <input type="email" className="nexus-input" placeholder="you@company.com" {...register("email")} />
              {errors.email && <p className="text-nexus-danger text-xs mt-1">{errors.email.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="nexus-btn-primary w-full">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
          <p className="text-center text-sm text-nexus-text-muted mt-6">
            <Link href="/login" className="text-nexus-accent-primary hover:text-nexus-accent-primary/80">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
