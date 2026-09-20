"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const [formError, setFormError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: { role: "MEMBER" },
        mode: "onBlur",
    });

    const onSubmit = async (data: LoginInput) => {
        setFormError("");
        const result = await signIn("credentials", { ...data, redirect: false, callbackUrl });
        if (!result || result.error) {
            setFormError("Invalid credentials, account type, or unverified email.");
            return;
        }
        router.push(result.url ?? callbackUrl);
    };

    return (
        <div className="flex flex-1 items-center justify-center px-8 py-16 sm:px-16">
            <div className="w-full max-w-sm">
                <h1 className="text-2xl font-semibold text-black">Log in to IMAGES</h1>
                <p className="mt-2 text-sm text-zinc-600">Welcome back - enter your details below.</p>
                {formError && <p role="alert" className="mt-4 text-sm text-red-600">{formError}</p>}
                <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
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
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-black">Account type</label>
                        <select id="role" {...register("role")} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black">
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                        </select>

                        {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
                    </div>
                    <button type="submit" disabled={isSubmitting} className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50">
                        {isSubmitting ? "Logging in..." : "Log in"}
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-zinc-600">Don&apos;t have an account? <Link href="/signup" className="font-medium text-black underline">Sign up</Link></p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex flex-1 items-center justify-center p-12 text-sm text-zinc-500">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
