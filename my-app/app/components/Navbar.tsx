"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";

  return (
    <header className="relative flex items-center justify-between px-8 py-6 sm:px-16">
      <Link
        href="/"
        className="text-lg font-semibold tracking-tight text-black dark:text-white"
      >
        IMAGES
      </Link>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400 sm:flex">
        <Link href="#features" className="hover:text-black dark:hover:text-white">
          Features
        </Link>
        <Link href="#" className="hover:text-black dark:hover:text-white">
          Pricing
        </Link>
        {isSignedIn ? (
          <>
            <span className="text-zinc-500 dark:text-zinc-400">{session.user?.name ?? session.user?.email}</span>
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="hover:text-black dark:hover:text-white">Log out</button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-black dark:hover:text-white">Log in</Link>
            <Link href="/signup" className="rounded-full bg-black px-4 py-2 text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">Sign up</Link>
          </>
        )}
      </nav>

      {/* Mobile menu button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="text-sm font-medium text-black dark:text-white sm:hidden"
        aria-label="Toggle menu"
      >
        {menuOpen ? "Close" : "Menu"}
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute left-0 top-full flex w-full flex-col gap-4 bg-white px-8 py-6 shadow-md dark:bg-black sm:hidden">
          <Link href="#features" onClick={() => setMenuOpen(false)}>
            Features
          </Link>
          <Link href="#" onClick={() => setMenuOpen(false)}>
            Pricing
          </Link>
          {isSignedIn ? (
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="text-left">Log out</button>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)}>Sign up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}