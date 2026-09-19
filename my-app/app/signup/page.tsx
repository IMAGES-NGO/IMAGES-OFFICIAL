"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";

export default function SignupPage() {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupInput>({ resolver: zodResolver(signupSchema), mode: "onBlur" });

  const onSubmit = async (data: SignupInput) => {
    setFormError("");
    const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setFormError(result.error ?? "Unable to create your account.");
      return;
    }
    router.push(`/verify?email=${encodeURIComponent(data.email)}`);
  };

  return (
    <div className="flex flex-1 items-center justify-center px-8 py-16 sm:px-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-black">Create your account</h1>
        <p className="mt-2 text-sm text-zinc-600">Join IMAGES to get started.</p>
        {formError && <p role="alert" className="mt-4 text-sm text-red-600">{formError}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-black">Username</label>
            <input id="username" type="text" {...register("username")} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none" />
            {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black">Email</label>
            <input id="email" type="email" {...register("email")} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black outline-none" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black">Password</label>
            <div className="relative mt-1">
              <input id="password" type={showPassword ? "text" : "password"} {...register("password")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm text-black outline-none" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50">
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-600">Already have an account? <Link href="/login" className="font-medium text-black underline">Log in</Link></p>
      </div>
    </div>
  );
}
