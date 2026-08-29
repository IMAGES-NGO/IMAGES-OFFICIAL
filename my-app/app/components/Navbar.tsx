"use client";

import { SquareMenu } from "lucide-react";
import { X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";

  return (
    <header className="sticky top-0 z-50 rounded-xl bg-gradient-to-b from-slate-50/20 to-slate-50 backdrop-blur-md border border-gray-400/20 shadow-xl flex items-center justify-between px-8 py-4 m-4 md:m-4 md:mx-auto md:max-w-5xl md:rounded-2xl md:px-8">
      <Link
        href="/"
        className="font-primary text-lg font-semibold tracking-widest text-black hover:text-white transition-colors"
      >
        IMAGES
      </Link>

      {/* Desktop nav */}
      <nav className="font-secondary text-black hidden items-center gap-6 text-sm md:flex">
        <Link href="#features" className="hover:text-white transition-colors">
          Features
        </Link>
        <Link href="#" className="hover:text-white transition-colors">
          Pricing
        </Link>
        {isSignedIn ? (
          <>
            <span className="text-zinc-600">
              {session.user?.name ?? session.user?.email}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hover:text-white transition-colors"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-black px-4 py-2 text-white hover:bg-white hover:text-black transition-all"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>

      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMenuOpen((open)=>!open)}
        className="text-sm font-medium text-black md:hidden px-3 py-1.5 rounded-md"
        aria-label="Toggle menu"
      >
        {menuOpen ? <X /> : <SquareMenu />}
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute left-0 right-0 z-50 top-full mt-4 flex flex-col gap-4 bg-white/95 backdrop-blur-lg border border-gray-200 p-6 shadow-xl rounded-2xl md:hidden text-black">
          <Link
            href="#features"
            onClick={() => setMenuOpen((open)=>!open)}
            className="hover:underline"
          >
            Features
          </Link>
          <Link
            href="#"
            onClick={() => setMenuOpen((open)=>!open)}
            className="hover:underline"
          >
            Pricing
          </Link>
          <hr className="border-gray-200" />
          {isSignedIn ? (
            <div className="flex flex-col gap-4">
              <span className="text-zinc-500 text-sm font-medium">
                {session.user?.name ?? session.user?.email}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-left text-red-600 font-medium"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-center py-2 rounded-xl border border-gray-300"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="text-center bg-black text-white py-2 rounded-xl"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
