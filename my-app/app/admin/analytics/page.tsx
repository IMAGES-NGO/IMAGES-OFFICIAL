"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import PerspectiveWorkspace from "@/app/components/analytics/PerspectiveWorkspace";
import type { AnalyticsPayload } from "@/lib/analytics";

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">{value}</div>
      {note && <div className="mt-1 text-xs text-zinc-500">{note}</div>}
    </div>
  );
}

function ResidenceMeters({ residence }: { residence: AnalyticsPayload["summary"]["residence"] }) {
  const total = residence.DAY_SCHOLAR + residence.HOSTELLER + residence.NOT_PROVIDED;
  const rows = [
    { label: "Day Scholar", count: residence.DAY_SCHOLAR, bar: "bg-sky-600" },
    { label: "Hosteller", count: residence.HOSTELLER, bar: "bg-sky-600" },
    { label: "Not provided", count: residence.NOT_PROVIDED, bar: "bg-zinc-300" },
  ];

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Day scholars vs hostellers</h2>
      <p className="text-xs text-zinc-500">Share of approved members</p>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          const pct = total ? Math.round((row.count / total) * 100) : 0;
          return (
            <li key={row.label} className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-3 text-sm">
              <span className="text-zinc-700">{row.label}</span>
              <span className="h-2 rounded-full bg-zinc-100" title={`${row.count} of ${total}`}>
                <span className={`block h-2 rounded-full ${row.bar}`} style={{ width: `${pct}%` }} />
              </span>
              <span className="text-right tabular-nums text-zinc-600">
                {row.count} <span className="text-zinc-400">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load analytics");
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Fetch on mount; state updates happen after the await, not synchronously.
    void (async () => load())();
  }, [load]);

  const s = data?.summary;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 pb-24">
      <main className="mx-auto max-w-7xl px-4 pt-16 sm:pt-20 sm:px-8 space-y-6">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to admin dashboard
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Analytics</h1>
            <p className="text-sm text-zinc-500">
              {data ? `Updated ${new Date(data.generatedAt).toLocaleString()}` : "Members, events and points at a glance"}
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading analytics…
          </div>
        )}

        {s && data && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile label="Approved members" value={s.approvedMembers.toLocaleString()} note={`${s.admins} admin${s.admins === 1 ? "" : "s"}`} />
              <StatTile label="Pending approvals" value={s.pendingApprovals.toLocaleString()} />
              <StatTile label="Events" value={s.totalEvents.toLocaleString()} note={`${s.upcomingEvents} upcoming`} />
              <StatTile label="Points awarded" value={s.pointsAwarded.toLocaleString()} note={`${s.avgPointsPerMember.toLocaleString()} avg per member`} />
            </div>

            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
              <ResidenceMeters residence={s.residence} />
              <StatTile
                label="Profile completion"
                value={`${s.profileCompletion}%`}
                note="Approved members with SID, phone, date of birth and residence filled in"
              />
            </div>

            <PerspectiveWorkspace tables={data.tables} />
          </>
        )}
      </main>
    </div>
  );
}
