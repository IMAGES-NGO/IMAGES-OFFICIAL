"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { ArrowLeft, CheckCircle2, Clock, Database, Download, Loader2, Search, ShieldCheck, User as UserIcon, XCircle } from "lucide-react";
import { RESIDENCE_LABELS } from "@/lib/validations/profile";

interface MemberRow {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  sid: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  residence: keyof typeof RESIDENCE_LABELS | null;
  points: number;
  eventsAttended: number;
  createdAt: string;
}

const STATUS_BADGE: Record<MemberRow["status"], { className: string; icon: typeof Clock }> = {
  APPROVED: { className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  PENDING: { className: "bg-zinc-100 text-zinc-600", icon: Clock },
  REJECTED: { className: "bg-rose-50 text-rose-700", icon: XCircle },
};

/** Downloads an export via fetch so failures surface as a toast instead of a broken file. */
async function downloadExport(type: "members" | "database") {
  const res = await fetch(`/api/admin/export?type=${type}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Export failed");
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `images-${type}.xlsx`;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [residence, setResidence] = useState("ALL");
  const [exporting, setExporting] = useState<"members" | "database" | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const { data: session } = useSession();

  const changeRole = async (member: MemberRow) => {
    const nextRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
    const prompt =
      nextRole === "ADMIN"
        ? `Make ${member.username} an admin? They will get full access to the admin dashboard, member data and exports.`
        : `Remove admin access from ${member.username}?`;
    if (!confirm(prompt)) return;

    setRoleChanging(member.id);
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, role: nextRole }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not change role");
      setMembers((list) => list?.map((m) => (m.id === member.id ? { ...m, role: nextRole } : m)) ?? null);
      toast.success(nextRole === "ADMIN" ? `${member.username} is now an admin` : `${member.username} is now a member`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change role");
    } finally {
      setRoleChanging(null);
    }
  };

  useEffect(() => {
    fetch("/api/admin/members", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Failed to load members");
        setMembers(json.members);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load members"));
  }, []);

  const filtered = useMemo(() => {
    if (!members) return [];
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (role !== "ALL" && m.role !== role) return false;
      if (status !== "ALL" && m.status !== status) return false;
      if (residence !== "ALL" && (m.residence ?? "NONE") !== residence) return false;
      if (!q) return true;
      return [m.username, m.email, m.sid, m.phone].some((v) => v?.toLowerCase().includes(q));
    });
  }, [members, query, role, status, residence]);

  const counts = useMemo(() => {
    const list = members ?? [];
    return {
      total: list.length,
      admins: list.filter((m) => m.role === "ADMIN").length,
      pending: list.filter((m) => m.status === "PENDING").length,
    };
  }, [members]);

  const runExport = async (type: "members" | "database") => {
    setExporting(type);
    try {
      await downloadExport(type);
      toast.success(type === "members" ? "Members exported" : "Database exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const selectClass = "rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500/40";

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 pb-24">
      <main className="mx-auto max-w-7xl px-4 pt-16 sm:pt-20 sm:px-8 space-y-6">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to admin dashboard
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Members</h1>
            <p className="text-sm text-zinc-500">
              {members ? `${counts.total} members · ${counts.admins} admins · ${counts.pending} pending` : "Everyone who has signed up"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runExport("members")}
              disabled={exporting !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50"
            >
              {exporting === "members" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              Members (Excel)
            </button>
            <button
              type="button"
              onClick={() => runExport("database")}
              disabled={exporting !== null}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              {exporting === "database" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Database className="h-4 w-4" aria-hidden="true" />}
              Full database (Excel)
            </button>
          </div>
        </div>

        {/* Filters + legend */}
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <label className="relative">
              <span className="sr-only">Search members</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, SID, phone"
                className="w-full rounded-xl border border-zinc-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 sm:w-72"
              />
            </label>
            <select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
              <option value="ALL">All roles</option>
              <option value="ADMIN">Admins</option>
              <option value="MEMBER">Members</option>
            </select>
            <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="ALL">All statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select aria-label="Filter by residence" value={residence} onChange={(e) => setResidence(e.target.value)} className={selectClass}>
              <option value="ALL">All residences</option>
              <option value="DAY_SCHOLAR">Day Scholar</option>
              <option value="HOSTELLER">Hosteller</option>
              <option value="NONE">Not provided</option>
            </select>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-600" aria-label="Legend">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-l-4 border-amber-400 bg-amber-50" /> Admin</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-zinc-200 bg-white" /> Member</span>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
        )}

        {!members && !error && (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading members…
          </div>
        )}

        {members && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-240 text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">SID</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Residence</th>
                    <th className="px-4 py-3 text-right">Points</th>
                    <th className="px-4 py-3 text-right">Events</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((m) => {
                    const isAdmin = m.role === "ADMIN";
                    const statusBadge = STATUS_BADGE[m.status];
                    const StatusIcon = statusBadge.icon;
                    return (
                      <tr
                        key={m.id}
                        className={isAdmin ? "border-l-4 border-l-amber-400 bg-amber-50/70 hover:bg-amber-50" : "border-l-4 border-l-transparent hover:bg-zinc-50"}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase ${isAdmin ? "bg-amber-200 text-amber-800" : "bg-sky-100 text-sky-700"}`}>
                              {m.username.charAt(0)}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-zinc-900">{m.username}</div>
                              <div className="truncate text-xs text-zinc-500">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${isAdmin ? "bg-amber-200 text-amber-900" : "bg-sky-50 text-sky-700"}`}>
                            {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                            {isAdmin ? "Admin" : "Member"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge.className}`}>
                            <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" /> {m.status.charAt(0) + m.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-zinc-700">{m.sid ?? <span className="text-zinc-400">—</span>}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-700">{m.phone ?? <span className="text-zinc-400">—</span>}</td>
                        <td className="px-4 py-3 text-zinc-700">{m.residence ? RESIDENCE_LABELS[m.residence] : <span className="text-zinc-400">—</span>}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{m.points.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{m.eventsAttended}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                          {new Date(m.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                            {m.id !== session?.user?.id && (isAdmin || m.status === "APPROVED") && (
                              <button
                                type="button"
                                onClick={() => changeRole(m)}
                                disabled={roleChanging === m.id}
                                className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:underline disabled:opacity-50"
                              >
                                {isAdmin ? "Remove admin" : "Make admin"}
                              </button>
                            )}
                            <Link href={`/profile/${m.id}`} className="text-xs font-semibold text-sky-700 hover:underline">
                              View profile
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-zinc-500">No members match these filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-500">
              Showing {filtered.length} of {members.length}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
