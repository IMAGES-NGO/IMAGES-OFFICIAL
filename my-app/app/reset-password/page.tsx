"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ResetPasswordInput>({ 
    resolver: zodResolver(resetPasswordSchema), 
    mode: "onBlur",
    defaultValues: { email: emailParam }
  });

  useEffect(() => {
    if (emailParam) {
      setValue("email", emailParam);
    }
  }, [emailParam, setValue]);

  const onSubmit = async (data: ResetPasswordInput) => {
    setFormError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/auth/reset-password", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(data) 
      });
      const result = await response.json();
      
      if (!response.ok) {
        setFormError(result.error ?? "Failed to reset password.");
        return;
      }
      
      setSuccessMessage(result.message);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setFormError("Network error. Please try again.");
    }
  };

  if (successMessage) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-16 sm:px-16">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold text-black">Password Reset</h1>
          <p className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200">
            {successMessage}
          </p>
          <div className="mt-8">
            <Link href="/login" className="inline-block rounded-full bg-black px-6 py-3 text-sm font-medium text-white">
              Return to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-8 py-16 sm:px-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-black">Create new password</h1>
        <p className="mt-2 text-sm text-zinc-600">Enter the 6-digit code sent to your email along with your new password.</p>
        
        {formError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">{formError}</p>}
        
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black">Email</label>
            <input id="email" type="email" {...register("email")} className="mt-1 w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 outline-none cursor-not-allowed" readOnly />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-black">Verification Code</label>
            <input 
              id="otp" 
              type="text" 
              inputMode="numeric" 
              autoComplete="one-time-code" 
              {...register("otp")} 
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center tracking-[0.3em] font-normal text-black outline-none" 
              placeholder="000000"
            />
            {errors.otp && <p className="mt-1 text-xs text-red-600">{errors.otp.message}</p>}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black">New Password</label>
            <div className="relative mt-1">
              <input id="password" type={showPassword ? "text" : "password"} {...register("password")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm text-black outline-none" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          
          <button type="submit" disabled={isSubmitting} className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50">
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-zinc-600">
          <Link href="/forgot-password" className="font-medium text-black underline">Request a new code</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-12 text-sm text-zinc-500">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
