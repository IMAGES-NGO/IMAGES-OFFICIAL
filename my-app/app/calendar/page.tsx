"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  X,
  Loader2,
  HeartHandshake,
  GraduationCap,
  Stethoscope,
  TreePine,
  Megaphone,
  Footprints,
  CalendarPlus,
  AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

interface ParticipantUser {
  id: string;
  username: string;
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  eventType: string;
  images: string[];
  participantIds: string[];
  participants?: ParticipantUser[];
  eventDate: string;
  location: string;
  startTime?: string | null;
  endTime?: string | null;
  status: string;
}

/* ─────────────────────────────────────────────
   Category configuration (colors, icons)
   ───────────────────────────────────────────── */

interface CategoryStyle {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;      // text color for pills
  bg: string;         // bg color for pills
  dot: string;        // dot color for legend
}

interface EventType {
  id: string;
  name: string;
  points: number;
}

const PALETTE = [
  { icon: HeartHandshake, color: "text-rose-700",    bg: "bg-rose-100",    dot: "bg-rose-400" },
  { icon: Megaphone,      color: "text-violet-700",  bg: "bg-violet-100",  dot: "bg-violet-400" },
  { icon: TreePine,       color: "text-lime-700",    bg: "bg-lime-100",    dot: "bg-lime-500" },
  { icon: GraduationCap,  color: "text-sky-700",     bg: "bg-sky-100",     dot: "bg-sky-400" },
  { icon: Stethoscope,    color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-400" },
  { icon: Footprints,     color: "text-amber-700",   bg: "bg-amber-100",   dot: "bg-amber-400" },
];

/* ─────────────────────────────────────────────
   Date helpers
   ───────────────────────────────────────────── */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { date: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    days.push({ date: d, month: month - 1, year: month === 0 ? year - 1 : year, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: d, month, year, isCurrentMonth: true });
  }

  // Next month leading days (fill to 42 = 6 rows)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: d, month: month + 1, year: month === 11 ? year + 1 : year, isCurrentMonth: false });
  }

  return days;
}

function dateKey(year: number, month: number, date: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function isToday(year: number, month: number, date: number) {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === date;
}

/* ─────────────────────────────────────────────
   Main Calendar Page
   ───────────────────────────────────────────── */

export default function CalendarPage() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  /* ─── Fetch events & types ─── */
  useEffect(() => {
    async function loadData() {
      try {
        setFetchError(false);
        const [eventsRes, typesRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/admin/event-types")
        ]);
        
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData.events || []);
        } else {
          setFetchError(true);
        }

        if (typesRes.ok) {
          const typesData = await typesRes.json();
          setEventTypes(Array.isArray(typesData) ? typesData : typesData.eventTypes || []);
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const dynamicCategories = useMemo(() => {
    return eventTypes.map((t, idx) => ({
      label: t.name,
      value: t.name.toUpperCase(),
      ...PALETTE[idx % PALETTE.length]
    }));
  }, [eventTypes]);

  const getCategoryStyle = useCallback((eventType: string) => {
    return (
      dynamicCategories.find((c) => c.value === eventType.toUpperCase()) || {
        label: eventType,
        value: eventType,
        icon: CalendarIcon,
        color: "text-zinc-700",
        bg: "bg-zinc-100",
        dot: "bg-zinc-400",
      }
    );
  }, [dynamicCategories]);

  /* ─── Month navigation ─── */
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  /* ─── Map events by date ─── */
  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    events.forEach((evt) => {
      const d = new Date(evt.eventDate);
      if (isNaN(d.getTime())) return;
      const key = dateKey(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      const list = map.get(key) || [];
      list.push(evt);
      map.set(key, list);
    });
    return map;
  }, [events]);

  /* ─── Calendar days for current month ─── */
  const calendarDays = useMemo(
    () => getCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  /* ─── Category counts for current month events ─── */
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach((evt) => {
      const d = new Date(evt.eventDate);
      if (isNaN(d.getTime())) return;
      if (d.getUTCFullYear() === currentYear && d.getUTCMonth() === currentMonth) {
        const cat = evt.eventType.toUpperCase();
        counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    });
    return counts;
  }, [events, currentYear, currentMonth]);

  /* ─── "This week" events ─── */
  const thisWeekEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    return events
      .filter((evt) => {
        const d = new Date(evt.eventDate);
        return d >= today && d < endOfWeek;
      })
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .slice(0, 4);
  }, [events]);

  /* ─── Modal close ─── */
  const closeModal = useCallback(() => {
    setSelectedEvent(null);
    setSelectedDate(null);
    setActiveImageIndex(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeModal]);

  /* ─── Handle date click (shows all events for that date) ─── */
  const handleDateClick = (key: string) => {
    const dayEvents = eventsByDate.get(key);
    if (dayEvents && dayEvents.length === 1) {
      setSelectedEvent(dayEvents[0]);
      setActiveImageIndex(0);
    } else if (dayEvents && dayEvents.length > 1) {
      setSelectedDate(key);
    }
  };

  /* ─── Events for selected date in multi-event modal ─── */
  const selectedDateEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];

  /* ─── Max pills to show in a date cell ─── */
  const MAX_PILLS = 2;

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-sky-500 selection:text-white">
      <main className="flex-1 pb-16">

        {/* ═══ Hero ═══ */}
        <section className="relative px-6 pt-20 pb-10 text-center max-w-[var(--content-width)] mx-auto">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-sky-100/30 rounded-full blur-3xl pointer-events-none -z-10" />
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-100 bg-sky-50 text-sky-600 text-xs font-bold uppercase tracking-widest font-secondary mb-5">
            <CalendarIcon className="h-3.5 w-3.5" />
            Event Calendar
          </span>
          <h1 className="font-primary-italic text-4xl sm:text-5xl lg:text-6xl text-zinc-900 mt-1">
            Club Calendar
          </h1>
          <p className="font-secondary text-zinc-500 text-sm sm:text-base max-w-[55ch] mx-auto mt-3 leading-relaxed">
            Browse all upcoming and past events at a glance. Click any date to see full details.
          </p>
        </section>

        {/* ═══ Calendar + Sidebar ═══ */}
        <section className="max-w-[var(--content-width)] mx-auto px-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-sky-500" />
              <p className="text-sm font-secondary font-medium">Loading calendar…</p>
            </div>
          ) : fetchError ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-16 text-center">
              <AlertCircle className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
              <h3 className="font-secondary font-bold text-zinc-700 text-lg">Something went wrong</h3>
              <p className="font-secondary text-zinc-500 text-sm mt-1">Could not load events. Please try again.</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">

              {/* ─── Calendar Grid ─── */}
              <div className="flex-1 min-w-0">
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="font-primary-italic text-2xl sm:text-3xl text-zinc-900">
                      {MONTH_NAMES[currentMonth]} {currentYear}
                    </h2>
                    <button
                      onClick={goToToday}
                      className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-xs font-semibold font-secondary hover:bg-zinc-200 transition-colors"
                    >
                      Today
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goToPrevMonth}
                      aria-label="Previous month"
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={goToNextMonth}
                      aria-label="Next month"
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-zinc-200">
                  {DAY_NAMES.map((day) => (
                    <div key={day} className="py-2 text-center text-xs font-bold text-zinc-400 uppercase tracking-wider font-secondary">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 border-l border-zinc-200">
                  {calendarDays.map((day, idx) => {
                    const key = dateKey(day.year, day.month, day.date);
                    const dayEvents = eventsByDate.get(key) || [];
                    const todayMark = isToday(day.year, day.month, day.date);
                    const hasEvents = dayEvents.length > 0;
                    const visiblePills = dayEvents.slice(0, MAX_PILLS);
                    const extraCount = dayEvents.length - MAX_PILLS;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => hasEvents && handleDateClick(key)}
                        className={`relative border-r border-b border-zinc-200 p-1.5 sm:p-2 min-h-[5rem] sm:min-h-[6.5rem] text-left transition-colors duration-150 ${
                          day.isCurrentMonth ? "bg-white" : "bg-zinc-50/60"
                        } ${hasEvents ? "cursor-pointer hover:bg-sky-50/40" : "cursor-default"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500`}
                        aria-label={`${day.date} ${MONTH_NAMES[day.month >= 0 ? day.month % 12 : 11]} ${day.year}${hasEvents ? `, ${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}` : ""}`}
                      >
                        {/* Date number */}
                        <span
                          className={`inline-flex items-center justify-center text-xs sm:text-sm font-semibold font-secondary w-6 h-6 sm:w-7 sm:h-7 rounded-full ${
                            todayMark
                              ? "bg-sky-500 text-white"
                              : day.isCurrentMonth
                              ? "text-zinc-800"
                              : "text-zinc-300"
                          }`}
                        >
                          {day.date}
                        </span>

                        {/* Event pills */}
                        <div className="mt-1 space-y-0.5">
                          {visiblePills.map((evt) => {
                            const cat = getCategoryStyle(evt.eventType);
                            return (
                              <div
                                key={evt.id}
                                className={`${cat.bg} ${cat.color} rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold font-secondary truncate leading-tight`}
                                title={evt.title}
                              >
                                <span className="hidden sm:inline">
                                  {evt.title.length > 16 ? evt.title.slice(0, 14) + "…" : evt.title}
                                </span>
                                <span className="sm:hidden">
                                  {evt.title.length > 8 ? evt.title.slice(0, 7) + "…" : evt.title}
                                </span>
                              </div>
                            );
                          })}
                          {extraCount > 0 && (
                            <div className="text-[10px] text-zinc-400 font-secondary font-medium pl-0.5">
                              +{extraCount} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── Right Sidebar ─── */}
              <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-6">

                {/* Category Legend */}
                <div className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <h3 className="font-secondary font-bold text-zinc-800 text-sm mb-4">Categories</h3>
                  <div className="space-y-2.5">
                    {dynamicCategories.map((cat) => {
                      const count = categoryCounts.get(cat.value) || 0;
                      return (
                        <div key={cat.value} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${cat.dot}`} />
                            <span className="font-secondary text-sm text-zinc-600">{cat.label}</span>
                          </div>
                          <span className="font-secondary text-sm text-zinc-400 font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* This Week */}
                {thisWeekEvents.length > 0 && (
                  <div className="rounded-2xl border border-zinc-100 bg-white p-5">
                    <h3 className="font-secondary font-bold text-zinc-800 text-sm mb-4">This week</h3>
                    <div className="space-y-4">
                      {thisWeekEvents.map((evt) => {
                        const d = new Date(evt.eventDate);
                        const dayNum = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
                        const dayName = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
                        return (
                          <button
                            key={evt.id}
                            type="button"
                            onClick={() => { setSelectedEvent(evt); setActiveImageIndex(0); }}
                            className="flex items-start gap-3 w-full text-left group hover:bg-zinc-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                          >
                            <div className="text-center shrink-0 w-8">
                              <div className="font-secondary font-bold text-lg text-zinc-800 leading-tight">{dayNum}</div>
                              <div className="font-secondary text-[10px] text-zinc-400 uppercase">{dayName}</div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-secondary font-bold text-sm text-zinc-800 truncate group-hover:text-sky-600 transition-colors">
                                {evt.title}
                              </div>
                              <div className="font-secondary text-xs text-zinc-400 truncate">
                                {evt.startTime || "All day"} · {evt.location}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CTA Card */}
                <div className="rounded-2xl bg-zinc-900 p-6 text-white">
                  <h3 className="font-secondary font-bold text-base mb-1.5">Never miss a date</h3>
                  <p className="font-secondary text-zinc-400 text-xs leading-relaxed mb-4">
                    Sync the club calendar to your phone and get reminders before each event.
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-zinc-900 font-secondary font-semibold text-sm hover:bg-sky-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Add to my calendar
                  </button>
                  {/* Category value pills */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {["Smart", "Social", "Passion", "Moral", "Mature"].map((tag) => (
                      <span key={tag} className="px-2.5 py-0.5 rounded-full bg-sky-600/80 text-[10px] font-bold font-secondary uppercase tracking-wider">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ═══ Single Event Detail Modal ═══ */}
      {selectedEvent && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={`Event details: ${selectedEvent.title}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
          >
            <button
              onClick={closeModal}
              aria-label="Close modal"
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="overflow-y-auto flex-1">
              {/* Image */}
              {selectedEvent.images && selectedEvent.images.length > 0 && (
                <div className="relative aspect-[16/9] w-full bg-zinc-900">
                  <Image
                    src={selectedEvent.images[activeImageIndex]}
                    alt={selectedEvent.title}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 672px"
                    className="object-cover"
                  />
                  {selectedEvent.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImageIndex((prev) => prev === 0 ? selectedEvent.images.length - 1 : prev - 1)}
                        aria-label="Previous photo"
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/30 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setActiveImageIndex((prev) => prev === selectedEvent.images.length - 1 ? 0 : prev + 1)}
                        aria-label="Next photo"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/30 transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                        {selectedEvent.images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            aria-label={`Photo ${idx + 1}`}
                            className={`rounded-full transition-all duration-300 ${
                              activeImageIndex === idx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-6 space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {(() => {
                      const cat = getCategoryStyle(selectedEvent.eventType);
                      return (
                        <span className={`rounded-full ${cat.bg} ${cat.color} px-3 py-0.5 text-xs font-bold uppercase tracking-wider font-secondary`}>
                          {selectedEvent.eventType}
                        </span>
                      );
                    })()}
                    <span className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider font-secondary ${
                      selectedEvent.status === "UPCOMING" ? "bg-sky-50 text-sky-700 border border-sky-100"
                      : selectedEvent.status === "ONGOING" ? "bg-sky-50 text-sky-700 border border-sky-100"
                      : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                    }`}>
                      {selectedEvent.status === "ONGOING" ? "Live" : selectedEvent.status === "UPCOMING" ? "Upcoming" : "Completed"}
                    </span>
                  </div>
                  <h2 className="font-primary-italic text-xl sm:text-2xl text-zinc-900">
                    {selectedEvent.title}
                  </h2>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-500 shrink-0">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase font-secondary">Date</div>
                      <div className="text-xs font-bold text-zinc-900 font-secondary">{formatEventDate(selectedEvent.eventDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-500 shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase font-secondary">Time</div>
                      <div className="text-xs font-bold text-zinc-900 font-secondary">
                        {selectedEvent.startTime || "All day"}{selectedEvent.endTime ? ` – ${selectedEvent.endTime}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-500 shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase font-secondary">Venue</div>
                      <div className="text-xs font-bold text-zinc-900 font-secondary break-words">{selectedEvent.location}</div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 font-secondary">About</h3>
                  <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line font-secondary">{selectedEvent.description}</p>
                </div>

                {/* Participants */}
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-secondary">
                  <Users className="h-3.5 w-3.5" />
                  <span>{selectedEvent.participantIds?.length || 0} participant{(selectedEvent.participantIds?.length || 0) !== 1 ? "s" : ""} registered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Multi-Event Date Modal ═══ */}
      {selectedDate && !selectedEvent && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={`Events on ${selectedDate}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden my-8 max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <h2 className="font-primary-italic text-xl text-zinc-900">
                {(() => {
                  const [y, m, d] = selectedDate.split("-").map(Number);
                  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
                })()}
              </h2>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="p-1.5 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {selectedDateEvents.map((evt) => {
                const cat = getCategoryStyle(evt.eventType);
                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => { setSelectedEvent(evt); setSelectedDate(null); setActiveImageIndex(0); }}
                    className="w-full flex items-start gap-3 p-3 rounded-xl border border-zinc-100 bg-white hover:bg-zinc-50 hover:border-sky-100 transition-all text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center`}>
                      {(() => { const Icon = cat.icon; return <Icon className={`h-4 w-4 ${cat.color}`} />; })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-secondary font-bold text-sm text-zinc-800 truncate group-hover:text-sky-600 transition-colors">
                        {evt.title}
                      </h3>
                      <p className="font-secondary text-xs text-zinc-400 mt-0.5">
                        {evt.startTime || "All day"} · {evt.location}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full ${cat.bg} ${cat.color} px-2 py-0.5 text-[10px] font-bold font-secondary uppercase`}>
                      {evt.eventType}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
