"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginInput) => {
    // Replace with your real API call
    console.log("Login data:", data);
    router.push("/");
  };

  return (
    <div className="flex flex-1 items-center justify-center px-8 py-16 sm:px-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-black dark:text-white">
          Log in to IMAGES
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Welcome back — enter your details below.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black dark:text-white">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black dark:border-zinc-700 dark:bg-black dark:text-white dark:focus:border-white"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-black dark:text-white">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black dark:border-zinc-700 dark:bg-black dark:text-white dark:focus:border-white"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-black underline dark:text-white">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}