"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(1, "Organization name is required"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Registration failed");
      }

      const result = await res.json();
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-nexus-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gradient">NEXUS CRM</h1>
          <p className="text-nexus-text-secondary text-sm mt-1">Create your workspace</p>
        </div>

        <div className="nexus-card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="nexus-badge-danger w-full justify-center py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-nexus-text-secondary mb-1.5">Name</label>
              <input className="nexus-input" placeholder="Your name" {...register("name")} />
              {errors.name && <p className="text-nexus-danger text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-nexus-text-secondary mb-1.5">Email</label>
              <input type="email" className="nexus-input" placeholder="you@company.com" {...register("email")} />
              {errors.email && <p className="text-nexus-danger text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-nexus-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} className="nexus-input pr-10" placeholder="••••••••" {...register("password")} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-text-muted hover:text-nexus-text-secondary" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-nexus-danger text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-nexus-text-secondary mb-1.5">Organization</label>
              <input className="nexus-input" placeholder="Your company name" {...register("organizationName")} />
              {errors.organizationName && <p className="text-nexus-danger text-xs mt-1">{errors.organizationName.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="nexus-btn-primary w-full">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {isSubmitting ? "Creating..." : "Create workspace"}
            </button>
          </form>

          <p className="text-center text-sm text-nexus-text-muted mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-nexus-accent-primary hover:text-nexus-accent-primary/80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
