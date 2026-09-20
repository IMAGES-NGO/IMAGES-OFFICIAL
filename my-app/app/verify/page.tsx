"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { verifyOtpSchema } from "@/lib/validations/auth";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || isResending) return;
    setError("");
    setMessage("");
    setIsResending(true);

    try {
      const res = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resend code.");
      } else {
        setMessage(data.message || "A new code was sent.");
        setCooldown(60);
      }
    } catch {
      setError("Network error while resending code.");
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsed = verifyOtpSchema.safeParse({ email, otp });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const result = (await response.json()) as { error?: string; message?: string };
    setIsSubmitting(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to verify your email.");
      return;
    }
    setMessage(result.message ?? "Email verified.");
    setTimeout(() => router.push("/login"), 800);
  };

  return (
    <div className="flex flex-1 items-center justify-center px-8 py-16 sm:px-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-black">Verify your email</h1>
        <p className="mt-2 text-sm text-zinc-600">Enter the 6-digit code sent by email.</p>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        {message && <p role="status" className="mt-4 text-sm text-green-600">{message}</p>}
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
          <label className="text-sm font-medium text-black">
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal text-black outline-none" />
          </label>
          <label className="text-sm font-medium text-black">
            Verification code
            <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal tracking-[0.3em] text-black outline-none" />
          </label>
          <button type="submit" disabled={isSubmitting} className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50">
            {isSubmitting ? "Verifying..." : "Verify email"}
          </button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="text-zinc-600 hover:text-black underline disabled:no-underline disabled:text-zinc-400"
          >
            {isResending
              ? "Sending..."
              : cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Resend verification code"}
          </button>
          <Link href="/login" className="font-medium text-black underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center">Loading...</div>}>
      <VerifyForm />
    </Suspense>
  );
}