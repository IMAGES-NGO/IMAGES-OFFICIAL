"use client";

import { useEffect, useState } from "react";
import { Award, Trophy, Medal } from "lucide-react";

interface UserRank {
  id: string;
  username: string;
  points: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<UserRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
            const data = await res.json();
            setUsers(data);
        } else {
            console.error("Failed to fetch leaderboard.");
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  const top3 = users.slice(0, 3);
  const rest = users;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-sky-500/30">
      <div className="max-w-4xl mx-auto space-y-16">
        
        <div className="text-center space-y-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-sky-200/50 blur-[100px] rounded-full pointer-events-none"></div>
          <h1 className="font-primary-italic text-4xl sm:text-5xl lg:text-6xl text-zinc-900 mt-1">
            Leaderboard
          </h1>
        </div>

        {/* Podium Section */}
        {top3.length >= 3 && (
          <div className="flex justify-center items-end h-72 gap-3 sm:gap-6 md:gap-10 pb-8 mt-12 relative z-10">
            {/* 2nd Place */}
            <div className="flex flex-col items-center w-24 sm:w-32 md:w-40 transform hover:-translate-y-2 transition-transform duration-300 group">
              <div className="mb-3 text-center transition-all duration-300 group-hover:scale-105">
                <div className="flex justify-center mb-1 text-zinc-400">
                  <Medal className="h-6 w-6" />
                </div>
                <div className="text-zinc-600 font-bold truncate w-full text-sm sm:text-base">{top3[1].username}</div>
                <div className="text-zinc-500 font-semibold text-xs sm:text-sm">{top3[1].points.toLocaleString()} pts</div>
              </div>
              <div className="w-full bg-gradient-to-t from-zinc-300 via-zinc-200 to-zinc-100 h-32 sm:h-40 rounded-t-2xl shadow-xl shadow-zinc-200/50 border border-zinc-300/50 flex items-start justify-center pt-4 relative overflow-hidden">
                 <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                 <span className="text-4xl sm:text-5xl font-black text-zinc-400 shadow-sm drop-shadow-sm">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center w-28 sm:w-36 md:w-48 z-10 transform hover:-translate-y-3 transition-transform duration-300 group">
              <div className="mb-4 text-center transition-all duration-300 group-hover:scale-110">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-amber-400 animate-bounce">
                  <Trophy className="h-9 w-9 drop-shadow-md text-amber-500" />
                </div>
                <div className="text-amber-600 font-extrabold truncate w-full text-base sm:text-lg">{top3[0].username}</div>
                <div className="text-amber-500 text-sm sm:text-base font-bold drop-shadow-sm">{top3[0].points.toLocaleString()} pts</div>
              </div>
              <div className="w-full bg-gradient-to-t from-amber-400 via-amber-300 to-amber-100 h-44 sm:h-56 rounded-t-2xl shadow-2xl shadow-amber-200/60 border border-amber-300/60 flex items-start justify-center pt-4 sm:pt-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/50 w-[200%] h-full transform -skew-x-12 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
                <span className="text-6xl sm:text-7xl font-black text-amber-500 drop-shadow-md">1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center w-24 sm:w-32 md:w-40 transform hover:-translate-y-2 transition-transform duration-300 group">
              <div className="mb-3 text-center transition-all duration-300 group-hover:scale-105">
                <div className="flex justify-center mb-1 text-orange-400">
                  <Award className="h-6 w-6" />
                </div>
                <div className="text-orange-600 font-bold truncate w-full text-sm sm:text-base">{top3[2].username}</div>
                <div className="text-orange-500 font-semibold text-xs sm:text-sm">{top3[2].points.toLocaleString()} pts</div>
              </div>
              <div className="w-full bg-gradient-to-t from-orange-300 via-orange-200 to-orange-100 h-24 sm:h-32 rounded-t-2xl shadow-xl shadow-orange-200/50 border border-orange-300/50 flex items-start justify-center pt-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="text-4xl sm:text-5xl font-black text-orange-400 drop-shadow-sm">3</span>
              </div>
            </div>
          </div>
        )}

        {/* Table Section */}
        <div className="relative group max-w-3xl mx-auto">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-200 to-sky-100 rounded-[2rem] blur opacity-50 transition duration-1000"></div>
          <div className="relative bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 text-xs sm:text-sm uppercase tracking-widest font-bold">
                    <th className="py-5 px-6 sm:px-8 w-24 text-center">Rank</th>
                    <th className="py-5 px-6 sm:px-8">Member</th>
                    <th className="py-5 px-6 sm:px-8 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rest.map((user, index) => (
                    <tr 
                      key={user.id} 
                      className="hover:bg-zinc-50 transition-colors duration-200 group/row"
                    >
                      <td className="py-4 px-6 sm:px-8 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-sm sm:text-base transition-transform group-hover/row:scale-110
                          ${index === 0 ? 'bg-amber-100 text-amber-600' : 
                            index === 1 ? 'bg-zinc-100 text-zinc-600' : 
                            index === 2 ? 'bg-orange-100 text-orange-600' : 
                            'bg-zinc-50 text-zinc-400'}
                        `}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-6 sm:px-8 font-bold text-zinc-800 text-sm sm:text-base">
                        {user.username}
                      </td>
                      <td className="py-4 px-6 sm:px-8 text-right font-black text-sky-600 text-sm sm:text-base">
                        {user.points.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {rest.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-zinc-400 font-medium">
                        No members found on the leaderboard yet.
                      </td>
                    </tr>
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
