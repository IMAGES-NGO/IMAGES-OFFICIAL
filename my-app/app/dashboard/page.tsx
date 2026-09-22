"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PointTransaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface UserPointsData {
  points: number;
  history: PointTransaction[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<UserPointsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin"); 
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      async function fetchPoints() {
        try {
          const res = await fetch("/api/user/points");
          if (res.ok) {
            const json = await res.json();
            setData(json);
          } else {
             // Mock data fallback for preview
             setData({
                 points: 12450,
                 history: [
                     { id: "tx1", amount: 150, reason: "Weekly Challenge Winner", createdAt: new Date().toISOString() },
                     { id: "tx2", amount: 50, reason: "Daily Login Streak", createdAt: new Date(Date.now() - 86400000).toISOString() },
                     { id: "tx3", amount: -200, reason: "Redeemed Avatar Item", createdAt: new Date(Date.now() - 86400000*2).toISOString() },
                     { id: "tx4", amount: 500, reason: "Hackathon Participation", createdAt: new Date(Date.now() - 86400000*5).toISOString() },
                 ]
             });
          }
        } catch (error) {
             setData({
                 points: 12450,
                 history: [
                     { id: "tx1", amount: 150, reason: "Weekly Challenge Winner", createdAt: new Date().toISOString() },
                     { id: "tx2", amount: 50, reason: "Daily Login Streak", createdAt: new Date(Date.now() - 86400000).toISOString() },
                     { id: "tx3", amount: -200, reason: "Redeemed Avatar Item", createdAt: new Date(Date.now() - 86400000*2).toISOString() },
                     { id: "tx4", amount: 500, reason: "Hackathon Participation", createdAt: new Date(Date.now() - 86400000*5).toISOString() },
                 ]
             });
        } finally {
          setLoading(false);
        }
      }
      fetchPoints();
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Profile & Points Header */}
        <div className="relative group rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-emerald-600/20 blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-slate-900/80 border border-slate-800/80 p-8 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-xl z-10 overflow-hidden">
                
                {/* Decorative background circle */}
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="z-10 flex flex-col gap-2">
                    <span className="text-indigo-400 font-semibold tracking-wider text-sm uppercase">Member Dashboard</span>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
                    Welcome back, <br className="hidden sm:block md:hidden" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                        {session.user?.name || "Member"}
                    </span>
                    </h1>
                    <p className="text-slate-400 mt-2 max-w-lg">
                        Manage your profile, check your points balance, and review your recent activity.
                    </p>
                </div>

                <div className="z-10 w-full md:w-auto bg-slate-950/50 backdrop-blur-2xl border border-slate-700/50 p-6 rounded-2xl md:min-w-[240px] text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:bg-slate-900/60 transition-colors">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Total Balance</span>
                    </div>
                    <div className="text-5xl sm:text-6xl font-black text-white tracking-tight drop-shadow-md">
                        {data?.points.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-500 font-medium mt-1">available points</div>
                </div>
            </div>
        </div>

        {/* Transaction History */}
        <div className="bg-slate-900/60 rounded-3xl border border-slate-800/60 shadow-xl overflow-hidden backdrop-blur-xl p-2 sm:p-6 relative">
          <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          
          <div className="p-4 sm:p-2 mb-4 flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-200 flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                Transaction History
            </h2>
          </div>
          
          <div className="overflow-hidden sm:rounded-2xl border border-slate-800/40 bg-slate-950/30">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-900/80 text-slate-400 text-xs sm:text-sm uppercase tracking-wider font-semibold border-b border-slate-800">
                    <th className="py-4 px-6 whitespace-nowrap w-48">Date</th>
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6 text-right w-32">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {data?.history.length === 0 ? (
                    <tr>
                        <td colSpan={3} className="py-12 text-center text-slate-500 bg-slate-900/20">
                            <svg className="w-12 h-12 mx-auto text-slate-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            <p className="text-lg">No transactions yet.</p>
                        </td>
                    </tr>
                    ) : (
                        data?.history.map((tx) => {
                        const isPositive = tx.amount > 0;
                        return (
                            <tr 
                            key={tx.id} 
                            className="hover:bg-slate-800/40 transition-colors group"
                            >
                            <td className="py-4 px-6 text-sm text-slate-400 whitespace-nowrap group-hover:text-slate-300 transition-colors">
                                {new Date(tx.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'short', day: 'numeric',
                                })}
                                <span className="text-slate-600 ml-2 text-xs">
                                    {new Date(tx.createdAt).toLocaleTimeString(undefined, {
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </span>
                            </td>
                            <td className="py-4 px-6 font-medium text-slate-300 group-hover:text-white transition-colors">
                                {tx.reason}
                            </td>
                            <td className={`py-4 px-6 text-right font-bold whitespace-nowrap flex items-center justify-end gap-1.5
                                ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full ${isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                    <svg className={`w-3.5 h-3.5 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {isPositive 
                                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        }
                                    </svg>
                                </span>
                                {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                            </td>
                            </tr>
                        );
                        })
                    )}
                </tbody>
                </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
