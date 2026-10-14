"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"DETAILS" | "OTP" | "SUCCESS">("DETAILS");
  const [formError, setFormError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSuccessMessage, setOtpSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    defaultValues: {
      role: "MEMBER",
    },
  });

  // Handle resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const onDetailsSubmit = async (data: SignupInput) => {
    setFormError("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = (await response.json()) as { error?: string; message?: string; email?: string };
      if (!response.ok) {
        setFormError(result.error ?? "Unable to create your account.");
        return;
      }

      setSubmittedEmail(data.email.toLowerCase());
      setStep("OTP");
      setResendCooldown(60);
      setOtpError("");
      setOtpSuccessMessage("A 6-digit verification code was sent to your email.");
    } catch (err) {
      setFormError("Network error. Please try again.");
    }
  };

  const onVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setOtpSuccessMessage("");

    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch("/api/auth/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: submittedEmail,
          otp: otpCode.trim(),
        }),
      });

      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setOtpError(result.error ?? "Failed to verify code.");
        setIsVerifyingOtp(false);
        return;
      }

      setStep("SUCCESS");
    } catch (err) {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResendingOtp) return;
    setIsResendingOtp(true);
    setOtpError("");
    setOtpSuccessMessage("");

    try {
      const response = await fetch("/api/auth/signup/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedEmail }),
      });

      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setOtpError(result.error ?? "Unable to resend code.");
        setIsResendingOtp(false);
        return;
      }

      setOtpSuccessMessage("New verification code sent!");
      setResendCooldown(60);
    } catch (err) {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsResendingOtp(false);
    }
  };

  if (step === "SUCCESS") {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-16 sm:px-16">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold text-black">Email Verified</h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 py-1 px-3 rounded-full inline-block">
            Request Pending Approval
          </p>
          <p className="mt-4 text-sm text-zinc-600">
            Your email has been verified and your signup request has been submitted to the administrators. You will receive an email notification once your account is approved.
          </p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-block rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Return to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "OTP") {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-16 sm:px-16">
        <div className="w-full max-w-sm">
          <button
            type="button"
            onClick={() => {
              setStep("DETAILS");
              setOtpError("");
              setOtpSuccessMessage("");
            }}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-black transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to details
          </button>

          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-black">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold text-black">Verify your email</h1>
          <p className="mt-2 text-sm text-zinc-600">
            We sent a 6-digit verification code to <span className="font-semibold text-zinc-900">{submittedEmail}</span>. Enter the code below to complete your request.
          </p>

          {otpSuccessMessage && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              {otpSuccessMessage}
            </div>
          )}

          {otpError && (
            <div role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
              {otpError}
            </div>
          )}

          <form onSubmit={onVerifyOtpSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-black">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="mt-1 w-full text-center text-xl tracking-widest font-mono rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isVerifyingOtp || otpCode.length !== 6}
              className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {isVerifyingOtp ? "Verifying..." : "Verify & Request Approval"}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-center text-xs text-zinc-600">
            <p>
              Didn&apos;t receive the email? Check your <strong>Spam</strong> or <strong>Junk</strong> folder.
            </p>
            <div className="mt-2 pt-2 border-t border-zinc-200/60 flex items-center justify-center gap-1.5">
              <span>Need a new code?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isResendingOtp}
                className="font-semibold text-black underline hover:text-zinc-700 disabled:no-underline disabled:text-zinc-400 disabled:cursor-not-allowed inline-flex items-center gap-1 transition"
              >
                {isResendingOtp ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" /> Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  `Resend code in 0:${resendCooldown < 10 ? `0${resendCooldown}` : resendCooldown}`
                ) : (
                  "Resend code now"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-8 py-16 sm:px-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-black">Create your account</h1>
        <p className="mt-2 text-sm text-zinc-600">Join IMAGES to get started.</p>
        {formError && <p role="alert" className="mt-4 text-sm text-red-600">{formError}</p>}
        <form onSubmit={handleSubmit(onDetailsSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-black">Username</label>
            <input
              id="username"
              type="text"
              {...register("username")}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
            {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black">Email</label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black">Password</label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-black">Account type</label>
            <select
              id="role"
              {...register("role")}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {isSubmitting ? "Sending verification code..." : "Continue to verification"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-black underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
