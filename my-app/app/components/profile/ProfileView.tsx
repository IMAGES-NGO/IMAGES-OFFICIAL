"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Mail, MapPin, ShieldCheck, Trophy, User as UserIcon } from "lucide-react";

interface ProfileData {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  status: string;
  points: number;
  verifiedAt: string | null;
  createdAt: string;
  history: Array<{ id: string; amount: number; reason: string; createdAt: string }>;
  events: Array<{ id: string; title: string; eventType: string; eventDate: string; location: string; status: string }>;
  stats: { eventsAttended: number; totalEarned: number; totalDeducted: number };
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

/** Fetches and renders a profile. Pass `userId` for a specific user, or omit it for the signed-in user. */
export default function ProfileView({ userId, viewedByAdmin = false }: { userId?: string; viewedByAdmin?: boolean }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const url = userId ? `/api/users/${encodeURIComponent(userId)}/profile` : "/api/profile";
    fetch(url)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "We could not load this profile.");
          setProfile(null);
        } else {
          setProfile(json.profile);
          setError(null);
        }
      })
      .catch(() => !cancelled && setError("We could not load this profile."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div role="alert" className="max-w-md w-full rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-center text-rose-700">
          {error || "Profile not found."}
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === "ADMIN";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {viewedByAdmin && (
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-800">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to admin dashboard
          </Link>
        )}

        {/* Identity card */}
        <div className="rounded-3xl border border-zinc-200 bg-white shadow-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl font-bold uppercase ${isAdmin ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>
            {profile.username.charAt(0)}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold break-all">{profile.username}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${isAdmin ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>
                {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                {profile.role}
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{profile.status}</span>
            </div>
            <p className="flex items-center gap-2 text-sm text-zinc-500 break-all">
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" /> {profile.email}
            </p>
            <p className="flex items-center gap-2 text-sm text-zinc-500">
              <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" /> Member since {formatDate(profile.createdAt)}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Points", value: profile.points },
            { label: "Events attended", value: profile.stats.eventsAttended },
            { label: "Points earned", value: profile.stats.totalEarned },
            { label: "Points deducted", value: Math.abs(profile.stats.totalDeducted) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{stat.label}</div>
              <div className="mt-2 text-3xl font-black text-sky-600 tabular-nums">{stat.value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Events attended */}
        <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <h2 className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50/50 p-5 text-lg font-bold">
            <Trophy className="h-5 w-5 text-sky-500" aria-hidden="true" /> Events attended
          </h2>
          {profile.events.length === 0 ? (
            <p className="p-8 text-center text-zinc-500">No events attended yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {profile.events.map((event) => (
                <li key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-800">{event.title}</p>
                    <p className="flex items-center gap-1 text-xs text-zinc-500">
                      <MapPin className="h-3 w-3" aria-hidden="true" /> {event.location} · {event.eventType}
                    </p>
                  </div>
                  <span className="text-sm text-zinc-500 whitespace-nowrap">{formatDate(event.eventDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Points history */}
        <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <h2 className="border-b border-zinc-200 bg-zinc-50/50 p-5 text-lg font-bold">Points history</h2>
          {profile.history.length === 0 ? (
            <p className="p-8 text-center text-zinc-500">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {profile.history.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-800">{tx.reason}</p>
                    <p className="text-xs text-zinc-500">{formatDate(tx.createdAt)}</p>
                  </div>
                  <span className={`font-bold tabular-nums whitespace-nowrap ${tx.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
