"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordInput>({ 
    resolver: zodResolver(forgotPasswordSchema), 
    mode: "onBlur" 
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setFormError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(data) 
      });
      const result = await response.json();
      
      if (!response.ok) {
        setFormError(result.error ?? "An error occurred. Please try again.");
        return;
      }
      
      setSuccessMessage(result.message);
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
      }, 2000);
    } catch (err) {
      setFormError("Network error. Please try again.");
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-8 py-16 sm:px-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-black">Reset password</h1>
        <p className="mt-2 text-sm text-zinc-600">Enter your email to receive a password reset code.</p>
        
        {formError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">{formError}</p>}
        {successMessage && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600 border border-emerald-100">{successMessage}</p>}
        
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black">Email</label>
            <input id="email" type="email" {...register("email")} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting || !!successMessage} className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50">
            {isSubmitting ? "Sending..." : "Send reset code"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-600"><Link href="/login" className="font-medium text-black underline">Back to login</Link></p>
      </div>
    </div>
  );
}
