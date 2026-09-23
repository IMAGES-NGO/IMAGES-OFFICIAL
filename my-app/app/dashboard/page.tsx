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
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-sky-500/30">
      <div className="max-w-4xl mx-auto space-y-16">
        
        {/* Header section */}
        <div className="text-center space-y-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-sky-200/50 blur-[100px] rounded-full pointer-events-none"></div>
          <h1 className="font-primary-italic text-4xl sm:text-5xl lg:text-6xl text-zinc-900 mt-1">
            Welcome back, {session.user?.name || "Member"}
          </h1>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto font-medium">
            Manage your profile, check your points balance, and review your recent activity.
          </p>
        </div>

        {/* Balance Card */}
        <div className="relative group max-w-sm mx-auto text-center">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-200 to-sky-100 rounded-[2rem] blur opacity-50"></div>
            <div className="relative bg-white rounded-3xl border border-zinc-200 shadow-xl p-8">
                <div className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-2">Total Balance</div>
                <div className="text-6xl sm:text-7xl font-black text-sky-600 tracking-tight drop-shadow-sm">
                    {data?.points.toLocaleString()}
                </div>
            </div>
        </div>

        {/* Transaction History */}
        <div className="relative group max-w-3xl mx-auto">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-200 to-sky-100 rounded-[2rem] blur opacity-50 transition duration-1000"></div>
          <div className="relative bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-zinc-200 bg-zinc-50/50">
               <h2 className="text-xl sm:text-2xl font-bold text-zinc-800 flex items-center gap-2">
                 <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 Transaction History
               </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 text-xs sm:text-sm uppercase tracking-widest font-bold">
                    <th className="py-5 px-6 sm:px-8 w-48 text-left">Date</th>
                    <th className="py-5 px-6 sm:px-8">Description</th>
                    <th className="py-5 px-6 sm:px-8 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {data?.history.length === 0 ? (
                    <tr>
                        <td colSpan={3} className="py-12 text-center text-zinc-500 bg-zinc-50">
                            <p className="text-lg">No transactions yet.</p>
                        </td>
                    </tr>
                    ) : (
                        data?.history.map((tx) => {
                        const isPositive = tx.amount > 0;
                        return (
                            <tr 
                            key={tx.id} 
                            className="hover:bg-zinc-50 transition-colors group"
                            >
                            <td className="py-4 px-6 sm:px-8 text-sm text-zinc-500 whitespace-nowrap">
                                {new Date(tx.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'short', day: 'numeric',
                                })}
                                <span className="text-zinc-400 ml-2 text-xs">
                                    {new Date(tx.createdAt).toLocaleTimeString(undefined, {
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </span>
                            </td>
                            <td className="py-4 px-6 sm:px-8 font-medium text-zinc-800">
                                {tx.reason}
                            </td>
                            <td className={`py-4 px-6 sm:px-8 text-right font-bold whitespace-nowrap flex items-center justify-end gap-1.5
                                ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full ${isPositive ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                    <svg className={`w-3.5 h-3.5 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
