"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Loader2, ArrowLeft, Check, Users, Search, Plus } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface ParticipantUser {
  id: string;
  username: string;
}

interface EventItem {
  id: string;
  title: string;
  participantIds: string[];
  requestedParticipantIds: string[];
  attendanceMarked?: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
}

export default function AttendancePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    } else if (authStatus === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [authStatus, session, router]);

  const fetchData = async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      const [eventRes, usersRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/admin/users`)
      ]);

      if (eventRes.ok && usersRes.ok) {
        const eventData = await eventRes.json();
        const usersData = await usersRes.json();
        setEvent(eventData.event);
        setAllUsers(usersData.users || []);
        
        // Initialize selection. If attendance was marked, start with participantIds. 
        // Otherwise, maybe start empty or with requested participants?
        // Let's start with existing participants if marked, else empty.
        if (eventData.event.attendanceMarked) {
          setSelectedParticipants(new Set(eventData.event.participantIds || []));
        } else {
          // You could pre-select requested, but let's start empty to let them select
          // Or pre-select requested? Let's not assume they all showed up.
          setSelectedParticipants(new Set());
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role === "ADMIN") {
      fetchData();
    }
  }, [eventId, authStatus, session]);

  const toggleParticipant = (id: string) => {
    const newSet = new Set(selectedParticipants);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedParticipants(newSet);
  };

  const selectAllRequested = () => {
    if (!event) return;
    const allRequested = event.requestedParticipantIds || [];
    const newSet = new Set(selectedParticipants);
    let allAdded = true;
    for (const id of allRequested) {
      if (!newSet.has(id)) {
        allAdded = false;
        newSet.add(id);
      }
    }
    if (allAdded) {
      // If all were already added, deselect them all
      allRequested.forEach(id => newSet.delete(id));
    }
    setSelectedParticipants(newSet);
  };

  const confirmAttendance = async () => {
    if (!event) return;
    try {
      setIsConfirmingAttendance(true);
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          participantIds: Array.from(selectedParticipants),
          attendanceMarked: true
        }),
      });
      if (res.ok) {
        await fetchData();
        toast.success("Attendance has been successfully saved. Points have been updated.");
      } else {
        toast.error("Failed to save attendance.");
      }
    } catch (error) {
      console.error("Failed to confirm attendance:", error);
      toast.error("An error occurred while saving.");
    } finally {
      setIsConfirmingAttendance(false);
    }
  };

  // The base list of users to display in the main grid
  // This should include: any requested participants, AND any currently selected participants 
  // (so if an admin adds someone outside the requests, they show up here)
  const baseUserIds = useMemo(() => {
    if (!event) return [];
    const set = new Set([...(event.requestedParticipantIds || []), ...Array.from(selectedParticipants)]);
    return Array.from(set);
  }, [event, selectedParticipants]);

  // Main grid users mapped to full user objects
  const gridUsers = useMemo(() => {
    return baseUserIds.map(id => {
      const u = allUsers.find(user => user.id === id);
      return u || { id, username: `User ${id.substring(0,6)}`, email: '' };
    });
  }, [baseUserIds, allUsers]);

  // Users for the manual addition search (exclude those already in the grid)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allUsers.filter(u => 
      !baseUserIds.includes(u.id) && 
      (u.username.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    ).slice(0, 5); // top 5 matches
  }, [allUsers, searchQuery, baseUserIds]);

  if (authStatus === "loading" || isLoading || !event) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <p className="text-sm font-medium text-zinc-500 animate-pulse">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 p-4 md:p-8 pt-24 md:pt-32">
      <div className="mx-auto max-w-4xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link 
              href={`/admin/events/${eventId}`} 
              className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Event
            </Link>
            <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-2">
              Event Attendance
            </h1>
            <p className="text-zinc-500 font-medium">
              {event.title}
            </p>
          </div>
          <button 
            onClick={confirmAttendance}
            disabled={isConfirmingAttendance}
            className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {isConfirmingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Attendance
          </button>
        </div>

        {event.attendanceMarked && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/60 flex items-center gap-3 text-emerald-700">
            <Check className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm font-semibold">
              Attendance has been marked. You are currently editing existing attendance.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main List */}
          <div className="md:col-span-2 space-y-6">
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/60">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  Participants List
                  <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 text-xs rounded-lg">
                    {selectedParticipants.size} selected
                  </span>
                </h2>
                {event.requestedParticipantIds && event.requestedParticipantIds.length > 0 && (
                  <button 
                    onClick={selectAllRequested}
                    className="text-sm text-zinc-600 font-semibold hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg"
                  >
                    Toggle All Requested
                  </button>
                )}
              </div>

              {gridUsers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gridUsers.map((user) => (
                    <div 
                      key={user.id} 
                      onClick={() => toggleParticipant(user.id)}
                      className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all duration-200 select-none ${
                        selectedParticipants.has(user.id) 
                          ? 'border-sky-500 bg-sky-50/50 shadow-[0_0_0_1px_rgba(14,165,233,1)]' 
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedParticipants.has(user.id) ? 'border-sky-500 bg-sky-500' : 'border-zinc-300 bg-white'
                      }`}>
                        {selectedParticipants.has(user.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-bold text-zinc-900 truncate">{user.username}</div>
                        <div className="text-[11px] text-zinc-500 font-medium truncate">
                          {event.requestedParticipantIds?.includes(user.id) ? "Requested" : "Manually Added"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-zinc-50/50 rounded-3xl border border-dashed border-zinc-200">
                  <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-zinc-100">
                    <Users className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div className="text-zinc-800 font-bold text-sm mb-1">No participants yet</div>
                  <div className="text-zinc-500 text-sm max-w-[200px] mx-auto">Use the search to manually add users to this list.</div>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar / Search */}
          <div className="space-y-6">
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/60 sticky top-24">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">Add User</h2>
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>

              {searchQuery.trim() && (
                <div className="space-y-2">
                  {searchResults.length > 0 ? (
                    searchResults.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/50">
                        <div className="truncate pr-2">
                          <div className="text-xs font-bold text-zinc-900 truncate">{u.username}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{u.email}</div>
                        </div>
                        <button 
                          onClick={() => {
                            toggleParticipant(u.id);
                            setSearchQuery("");
                          }}
                          className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 hover:bg-sky-500 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-zinc-500 py-4">
                      No matching users found.
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
