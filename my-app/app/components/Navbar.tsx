"use client";

import { SquareMenu } from "lucide-react";
import { X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";

  const isActive = (path: string) => {
    if (path === "/#features") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const navLinkClass = (path: string) => {
    const base = "relative transition-all duration-200 hover:text-slate-900 hover:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 focus-visible:ring-offset-2";
    const active = "after:absolute after:bottom-[-6px] after:left-0 after:right-0 after:h-[2px] after:bg-sky-500 after:rounded-full font-medium text-zinc-900";
    return isActive(path) ? `${base} ${active}` : base;
  };

  return (
      <header className="sticky mx-8 md:w-full top-10 z-50 rounded-xl bg-linear-to-b from-slate-50/20 to-slate-50 backdrop-blur-md border border-gray-400/20 shadow-xl flex items-center justify-between px-8 py-4 md:mx-auto md:max-w-5xl md:rounded-2xl md:px-8">
        <Link
          href="/"
          className="font-primary text-lg font-semibold tracking-widest text-black transition-all duration-200 hover:text-slate-900 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 focus-visible:ring-offset-2"
        >
          IMAGES
        </Link>

        {/* Desktop nav */}
        <nav className="font-secondary text-black hidden items-center gap-7 text-sm md:flex">
          <Link
            href="/#features"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className={navLinkClass("/#features")}
          >
            About Us
          </Link>
          <Link
            href="/calendar"
            className={navLinkClass("/calendar")}
          >
            Calendar
          </Link>
          <Link
            href="/events"
            className={navLinkClass("/events")}
          >
            Events
          </Link>
          {isSignedIn ? (
            <>
              {session.user?.role === "ADMIN" && (
                <Link
                  href="/admin/dashboard"
                  className="transition-all duration-200 hover:text-slate-900 hover:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 focus-visible:ring-offset-2 font-medium"
                >
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-zinc-400 hover:text-zinc-600 transition-all duration-200 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 focus-visible:ring-offset-2"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="transition-all duration-200 hover:text-slate-1000 hover:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 focus-visible:ring-offset-2"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-block rounded-full bg-black px-4 py-2 text-white hover:bg-white hover:text-black transition-all hover:scale-110 duration-200"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="relative text-sm font-medium text-black md:hidden px-3 py-1.5 rounded-md"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X /> : <SquareMenu />}
        </button>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="absolute left-0 right-0 z-50 top-full mt-4 flex flex-col gap-4 bg-white/95 backdrop-blur-lg border border-gray-200 p-6 shadow-xl rounded-2xl md:hidden text-black">
            <Link
              href="/#features"
              onClick={(e) => {
                setMenuOpen(false);
                if (pathname === "/") {
                  e.preventDefault();
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="hover:underline"
            >
              About Us
            </Link>
            <Link
              href="/calendar"
              onClick={() => setMenuOpen((open) => !open)}
              className={isActive("/calendar") ? "text-sky-600 font-semibold" : "hover:underline"}
            >
              Calendar
            </Link>
            <Link
              href="/events"
              onClick={() => setMenuOpen((open) => !open)}
              className={isActive("/events") ? "text-sky-600 font-semibold" : "hover:underline font-medium"}
            >
              Events
            </Link>
            <hr className="border-gray-200" />
            {isSignedIn ? (
              <div className="flex flex-col gap-4">
                {session.user?.role === "ADMIN" && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="hover:underline font-semibold"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-left text-zinc-400 hover:text-zinc-600 font-medium"
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
