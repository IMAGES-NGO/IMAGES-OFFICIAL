"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  ArrowRight,
  Loader2,
  CalendarDays,
  Layers,
  HeartHandshake,
  GraduationCap,
  Stethoscope,
  TreePine,
  Megaphone,
  Footprints,
  LayoutGrid,
  AlertCircle,
  Camera,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

interface ParticipantUser {
  id: string;
  username: string;
  email?: string;
  role?: string;
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
  createdAt?: string;
}

/* ─────────────────────────────────────────────
   Editable configuration
   ───────────────────────────────────────────── */

interface CategoryConfig {
  label: string;
  value: string;
  icon: LucideIcon;
  gradient: string; // fallback gradient for cards without images
}

const CATEGORIES: CategoryConfig[] = [
  { label: "All Events",      value: "ALL",         icon: LayoutGrid,    gradient: "from-zinc-200 to-zinc-100" },
  { label: "Community",       value: "COMMUNITY",   icon: HeartHandshake, gradient: "from-rose-100 to-orange-50" },
  { label: "Education",       value: "EDUCATION",   icon: GraduationCap,  gradient: "from-sky-100 to-indigo-50" },
  { label: "Healthcare",      value: "HEALTHCARE",  icon: Stethoscope,    gradient: "from-emerald-100 to-teal-50" },
  { label: "Environment",     value: "ENVIRONMENT", icon: TreePine,       gradient: "from-lime-100 to-green-50" },
  { label: "GBM & Summits",   value: "GBM",         icon: Megaphone,      gradient: "from-violet-100 to-purple-50" },
  { label: "Visits",          value: "VISIT",       icon: Footprints,     gradient: "from-amber-100 to-yellow-50" },
];

const STATUS_OPTIONS = ["ALL", "UPCOMING", "ONGOING", "COMPLETED"] as const;

function getCategoryConfig(eventType: string): CategoryConfig {
  return CATEGORIES.find((c) => c.value === eventType.toUpperCase()) || CATEGORIES[0];
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getMonthAndDay(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { month: "EVENT", day: "" };
  return {
    month: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
    day: d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" }),
  };
}

/* ─────────────────────────────────────────────
   Skeleton Card
   ───────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden">
      <div className="aspect-[16/10] skeleton-shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-20 rounded skeleton-shimmer" />
        <div className="h-5 w-3/4 rounded skeleton-shimmer" />
        <div className="h-3 w-full rounded skeleton-shimmer" />
        <div className="h-3 w-2/3 rounded skeleton-shimmer" />
        <div className="border-t border-zinc-50 pt-3 mt-4 flex gap-4">
          <div className="h-3 w-24 rounded skeleton-shimmer" />
          <div className="h-3 w-28 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Event Card
   ───────────────────────────────────────────── */

function EventCard({
  event,
  index,
  onClick,
}: {
  event: EventItem;
  index: number;
  onClick: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dateParts = getMonthAndDay(event.eventDate);
  const hasImages = event.images && event.images.length > 0 && !imageError;
  const hasMultipleImages = event.images && event.images.length > 1;
  const catConfig = getCategoryConfig(event.eventType);
  const FallbackIcon = catConfig.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="card-enter group relative flex flex-col rounded-2xl border border-zinc-100 bg-white overflow-hidden text-left transition-all duration-[var(--transition-fast)] hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] hover:border-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 cursor-pointer"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* ── Image / Fallback ── */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {/* Branded gradient fallback */}
        <div className={`absolute inset-0 bg-gradient-to-br ${catConfig.gradient} flex items-center justify-center`}>
          <FallbackIcon className="h-12 w-12 text-zinc-300/60" strokeWidth={1} />
        </div>

        {/* Actual image */}
        {event.images && event.images.length > 0 && !imageError && (
          <Image
            src={event.images[0]}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={`object-cover transition-all duration-500 ease-out group-hover:scale-[1.03] ${
              imageLoaded ? "img-blur-up loaded" : "img-blur-up"
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        {/* Status badge (top-right) */}
        <div className="absolute top-3 right-3">
          {event.status === "ONGOING" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-white" />
              Live
            </span>
          ) : event.status === "UPCOMING" ? (
            <span className="rounded-full bg-sky-500/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
              Upcoming
            </span>
          ) : (
            <span className="rounded-full bg-zinc-800/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white/80 uppercase tracking-wider">
              Completed
            </span>
          )}
        </div>

        {/* Category pill (top-left) */}
        <span className="absolute top-3 left-3 rounded-full bg-white/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-zinc-700 uppercase tracking-wider border border-white/40">
          {event.eventType}
        </span>

        {/* Date block on image (for upcoming events) */}
        {event.status === "UPCOMING" && (
          <div className="absolute bottom-3 left-3 flex flex-col items-center justify-center rounded-xl bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-md min-w-[3rem]">
            <span className="text-[10px] font-extrabold text-sky-600 tracking-wider leading-tight">
              {dateParts.month}
            </span>
            <span className="text-base font-bold text-zinc-900 leading-tight">
              {dateParts.day}
            </span>
          </div>
        )}

        {/* Multi-image indicator */}
        {hasMultipleImages && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-2 py-1 text-[10px] font-semibold text-white flex items-center gap-1">
            <Camera className="h-3 w-3" />
            <span>{event.images.length}</span>
          </span>
        )}
      </div>

      {/* ── Card Content ── */}
      <div className="p-5 flex flex-col justify-between flex-1">
        <div>
          <h3 className="font-secondary font-bold text-zinc-900 text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-sky-600 transition-colors duration-200">
            {event.title}
          </h3>

          <p className="mt-2 font-secondary text-zinc-500 text-sm line-clamp-2 leading-relaxed">
            {event.description}
          </p>

          {/* Meta row */}
          <div className="mt-4 space-y-1.5 text-xs text-zinc-500 border-t border-zinc-50 pt-3 font-secondary">
            {/* Date (shown for non-upcoming since upcoming has the date block on image) */}
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span>{formatEventDate(event.eventDate)}</span>
            </div>

            {/* Time */}
            {(event.startTime || event.endTime) && (
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span>
                  {event.startTime || "Starts"} {event.endTime ? `– ${event.endTime}` : ""}
                </span>
              </div>
            )}

            {/* Location */}
            <div className="flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <span className="line-clamp-1 break-words leading-tight">{event.location}</span>
            </div>
          </div>
        </div>

        {/* Card footer */}
        <div className="mt-4 pt-3 border-t border-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-secondary">
            <Users className="h-3.5 w-3.5" />
            <span>
              {event.participantIds?.length || 0}{" "}
              {event.participantIds?.length === 1 ? "participant" : "participants"}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 group-hover:text-sky-700 transition-all">
            Details
            <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
          </span>
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Coming Soon Card
   ───────────────────────────────────────────── */

function ComingSoonCard() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center min-h-[20rem]">
      <Sparkles className="h-8 w-8 text-sky-300 mb-3" />
      <h3 className="font-secondary font-bold text-zinc-700 text-sm">
        More Events Coming Soon
      </h3>
      <p className="font-secondary text-zinc-400 text-xs mt-1 max-w-[18ch]">
        Stay tuned for upcoming initiatives and drives.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
   ───────────────────────────────────────────── */

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modal state
  const [extendedEvent, setExtendedEvent] = useState<EventItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Refs
  const toolbarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLElement>(null);

  /* ─── Data fetching ─── */
  useEffect(() => {
    async function loadEvents() {
      try {
        setFetchError(false);
        const res = await fetch("/api/events");
        const data = await res.json();
        if (res.ok && data.events) {
          setEvents(data.events);
        } else {
          setFetchError(true);
        }
      } catch (err) {
        console.error("Failed to load public events:", err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  /* ─── Debounced search ─── */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ─── URL sync (read on mount) ─── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const s = params.get("status");
    const c = params.get("category");
    const q = params.get("q");
    if (s && STATUS_OPTIONS.includes(s as typeof STATUS_OPTIONS[number])) setSelectedStatus(s);
    if (c && CATEGORIES.some((cat) => cat.value === c)) setSelectedCategory(c);
    if (q) { setSearchQuery(q); setDebouncedSearch(q); }
  }, []);

  /* ─── URL sync (write on change) ─── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (selectedStatus !== "ALL") params.set("status", selectedStatus);
    if (selectedCategory !== "ALL") params.set("category", selectedCategory);
    if (debouncedSearch) params.set("q", debouncedSearch);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [selectedStatus, selectedCategory, debouncedSearch]);

  /* ─── Filtering ─── */
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesCategory =
        selectedCategory === "ALL" || evt.eventType.toUpperCase() === selectedCategory;
      const matchesStatus =
        selectedStatus === "ALL" || evt.status.toUpperCase() === selectedStatus;
      const q = debouncedSearch.toLowerCase();
      const matchesSearch =
        !q ||
        evt.title.toLowerCase().includes(q) ||
        evt.description.toLowerCase().includes(q) ||
        evt.location.toLowerCase().includes(q);
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [events, selectedCategory, selectedStatus, debouncedSearch]);

  /* ─── Stats ─── */
  const upcomingCount = events.filter((e) => e.status === "UPCOMING").length;
  const hasActiveFilters = selectedCategory !== "ALL" || selectedStatus !== "ALL" || debouncedSearch !== "";

  const clearAllFilters = () => {
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
    setSearchQuery("");
    setDebouncedSearch("");
  };

  /* ─── Sticky toolbar detection ─── */
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        el.classList.toggle("is-stuck", !entry.isIntersecting);
      },
      { threshold: 1, rootMargin: "-81px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* ─── Scroll reveal for cards ─── */
  useEffect(() => {
    const container = gridRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    container.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredEvents]);

  /* ─── Modal ─── */
  const openExtendedModal = (event: EventItem) => {
    setExtendedEvent(event);
    setActiveImageIndex(0);
  };

  const closeExtendedModal = () => {
    setExtendedEvent(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExtendedModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const nextImage = () => {
    if (!extendedEvent || extendedEvent.images.length === 0) return;
    setActiveImageIndex((prev) =>
      prev === extendedEvent.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    if (!extendedEvent || extendedEvent.images.length === 0) return;
    setActiveImageIndex((prev) =>
      prev === 0 ? extendedEvent.images.length - 1 : prev - 1
    );
  };

  /* ─── Retry handler ─── */
  const handleRetry = () => {
    setLoading(true);
    setFetchError(false);
    setEvents([]);
    // Re-fetch
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        if (data.events) setEvents(data.events);
        else setFetchError(true);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-sky-500 selection:text-white">
      <main className="flex-1 pb-24">

        {/* ═══════════════════════════════════════
            HERO
            ═══════════════════════════════════════ */}
        <section className="relative px-6 pt-20 pb-14 text-center max-w-[var(--content-width)] mx-auto">
          {/* Ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-sky-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="scroll-reveal" style={{ animationDelay: "0ms" }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-100 bg-sky-50 text-sky-600 text-xs font-bold uppercase tracking-widest font-secondary mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Community Initiatives & Drives
            </span>

            <h1 className="font-primary-italic text-4xl sm:text-5xl lg:text-6xl text-zinc-900 mt-1">
              Our Events & Drives
            </h1>

            <p className="font-secondary text-zinc-500 text-sm sm:text-base max-w-[60ch] mx-auto mt-4 leading-relaxed">
              Discover the meaningful workshops, orphanage visits, environmental drives, and student
              empowerment initiatives led by IMAGES. Join us in making real, lasting change.
            </p>

            {/* Stats line */}
            {!loading && events.length > 0 && (
              <p className="font-secondary text-zinc-400 text-xs mt-4 tracking-wide">
                {events.length} event{events.length !== 1 ? "s" : ""}
                {upcomingCount > 0 && ` · ${upcomingCount} upcoming`}
              </p>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════
            FILTER TOOLBAR (sticky)
            ═══════════════════════════════════════ */}
        <div
          ref={toolbarRef}
          className="toolbar-sticky max-w-[var(--content-width)] mx-auto px-6 py-4"
        >
          <div className="space-y-3">

            {/* Row 1: Search + Status segmented control */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events..."
                  aria-label="Search events"
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-2.5 text-sm font-secondary outline-none transition-colors duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 placeholder:text-zinc-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status segmented control */}
              <div className="flex items-center rounded-xl bg-zinc-100 p-1 shrink-0" role="tablist" aria-label="Filter by status">
                {STATUS_OPTIONS.map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    role="tab"
                    aria-selected={selectedStatus === st}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold font-secondary transition-all duration-200 whitespace-nowrap ${
                      selectedStatus === st
                        ? "bg-white text-sky-600 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Category chips + result count + clear */}
            <div className="flex items-center gap-3">
              {/* Category chips */}
              <div className="relative flex-1 min-w-0">
                <div className="chip-scroll-container flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter by category">
                  {CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    const isActive = selectedCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        role="tab"
                        aria-selected={isActive}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium font-secondary whitespace-nowrap transition-all duration-200 shrink-0 ${
                          isActive
                            ? "bg-sky-500 text-white shadow-sm"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        <CatIcon className="h-3 w-3" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Result count & clear */}
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <span
                  className="text-xs text-zinc-400 font-secondary whitespace-nowrap"
                  role="status"
                  aria-live="polite"
                >
                  {loading ? "Loading…" : `Showing ${filteredEvents.length} event${filteredEvents.length !== 1 ? "s" : ""}`}
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-sky-600 hover:text-sky-700 font-semibold font-secondary whitespace-nowrap transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Mobile result count */}
            <div className="flex sm:hidden items-center justify-between">
              <span className="text-xs text-zinc-400 font-secondary" role="status" aria-live="polite">
                {loading ? "Loading…" : `Showing ${filteredEvents.length} event${filteredEvents.length !== 1 ? "s" : ""}`}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-sky-600 hover:text-sky-700 font-semibold font-secondary"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            EVENTS GRID
            ═══════════════════════════════════════ */}
        <section
          ref={gridRef}
          className="max-w-[var(--content-width)] mx-auto px-6 mt-8"
        >
          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && fetchError && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-16 text-center">
              <AlertCircle className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
              <h3 className="font-secondary font-bold text-zinc-700 text-lg">Something went wrong</h3>
              <p className="font-secondary text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                We couldn&apos;t load the events. Please check your connection and try again.
              </p>
              <button
                onClick={handleRetry}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white font-secondary font-semibold text-sm hover:bg-sky-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              >
                <Loader2 className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !fetchError && filteredEvents.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-16 text-center">
              <CalendarDays className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
              <h3 className="font-secondary font-bold text-zinc-700 text-lg">No events found</h3>
              <p className="font-secondary text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Try adjusting your filters or search terms."
                  : "Check back soon — new events are always being planned!"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white font-secondary font-semibold text-sm hover:bg-sky-600 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Event Grid */}
          {!loading && !fetchError && filteredEvents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={index}
                  onClick={() => openExtendedModal(event)}
                />
              ))}
              {/* "Coming soon" card to fill dead space when few events */}
              {filteredEvents.length > 0 && filteredEvents.length < 3 && !hasActiveFilters && (
                <ComingSoonCard />
              )}
            </div>
          )}
        </section>
      </main>

      {/* ═══════════════════════════════════════
          EXTENDED EVENT DETAIL MODAL
          ═══════════════════════════════════════ */}
      {extendedEvent && (
        <div
          onClick={closeExtendedModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={`Event details: ${extendedEvent.title}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
          >
            {/* Close Button */}
            <button
              onClick={closeExtendedModal}
              aria-label="Close modal"
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Scrollable Container */}
            <div className="overflow-y-auto overflow-x-hidden flex-1">
              {/* Image Gallery */}
              {extendedEvent.images && extendedEvent.images.length > 0 && (
                <div className="relative aspect-[16/9] w-full bg-zinc-900">
                  <Image
                    src={extendedEvent.images[activeImageIndex]}
                    alt={extendedEvent.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 896px"
                    className="object-contain"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/15 pointer-events-none" />

                  {extendedEvent.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        aria-label="Previous photo"
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        aria-label="Next photo"
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-4 right-4 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs text-white font-medium font-secondary">
                        {activeImageIndex + 1} / {extendedEvent.images.length}
                      </div>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                        {extendedEvent.images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            aria-label={`View photo ${idx + 1}`}
                            className={`rounded-full transition-all duration-300 ${
                              activeImageIndex === idx
                                ? "w-6 h-1.5 bg-white"
                                : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Detail Content */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Header */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="rounded-full bg-sky-50 text-sky-700 border border-sky-100 px-3 py-0.5 text-xs font-bold uppercase tracking-wider font-secondary">
                      {extendedEvent.eventType}
                    </span>
                    {extendedEvent.status === "ONGOING" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100 px-3 py-0.5 text-xs font-bold uppercase tracking-wider font-secondary">
                        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
                        Live
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider font-secondary ${
                          extendedEvent.status === "UPCOMING"
                            ? "bg-sky-50 text-sky-700 border border-sky-100"
                            : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                        }`}
                      >
                        {extendedEvent.status === "UPCOMING" ? "Upcoming" : "Completed"}
                      </span>
                    )}
                  </div>
                  <h2 className="font-primary-italic text-2xl sm:text-3xl text-zinc-900">
                    {extendedEvent.title}
                  </h2>
                </div>

                {/* Info bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-500 shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase font-secondary">Date</div>
                      <div className="text-sm font-bold text-zinc-900 font-secondary">{formatEventDate(extendedEvent.eventDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-500 shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase font-secondary">Time</div>
                      <div className="text-sm font-bold text-zinc-900 font-secondary">
                        {extendedEvent.startTime || "Scheduled"}{" "}
                        {extendedEvent.endTime ? `– ${extendedEvent.endTime}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-500 shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase font-secondary">Venue</div>
                      <div className="text-sm font-bold text-zinc-900 font-secondary break-words">{extendedEvent.location}</div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 font-secondary">
                    About this initiative
                  </h3>
                  <p className="text-sm sm:text-base text-zinc-600 leading-relaxed whitespace-pre-line font-secondary">
                    {extendedEvent.description}
                  </p>
                </div>

                {/* Participants */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-secondary">
                      <Users className="h-3.5 w-3.5 text-sky-500" />
                      Volunteers & Participants
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100 font-secondary">
                      {extendedEvent.participantIds?.length || 0} Registered
                    </span>
                  </div>

                  {extendedEvent.participants && extendedEvent.participants.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {extendedEvent.participants.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-100 bg-white"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600 font-bold text-xs font-secondary">
                            {(p.username || "Member").charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-zinc-900 truncate font-secondary">
                              {p.username}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate font-secondary">Volunteer</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-zinc-200 text-center text-xs text-zinc-400 font-secondary">
                      No participants registered for this event yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
