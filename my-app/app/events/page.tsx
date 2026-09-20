"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";

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

const CATEGORIES = [
  { label: "All Events", value: "ALL" },
  { label: "Community", value: "COMMUNITY" },
  { label: "Education", value: "EDUCATION" },
  { label: "Healthcare", value: "HEALTHCARE" },
  { label: "Environment", value: "ENVIRONMENT" },
  { label: "GBM & Summits", value: "GBM" },
  { label: "Visits", value: "VISIT" },
];

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Extended Detail Modal State
  const [extendedEvent, setExtendedEvent] = useState<EventItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        if (res.ok && data.events) {
          setEvents(data.events);
        }
      } catch (err) {
        console.error("Failed to load public events:", err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesCategory =
        selectedCategory === "ALL" || evt.eventType.toUpperCase() === selectedCategory;
      const matchesStatus =
        selectedStatus === "ALL" || evt.status.toUpperCase() === selectedStatus;
      const matchesSearch =
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.location.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [events, selectedCategory, selectedStatus, searchQuery]);

  const openExtendedModal = (event: EventItem) => {
    setExtendedEvent(event);
    setActiveImageIndex(0);
  };

  const closeExtendedModal = () => {
    setExtendedEvent(null);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeExtendedModal();
      }
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

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const getMonthAndDay = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { month: "EVENT", day: "" };
    return {
      month: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
      day: d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" }),
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-sky-500 selection:text-white">
      <main className="flex-1 pb-24">
        {/* Hero Section */}
        <section className="relative px-4 pt-16 pb-12 sm:px-8 text-center max-w-5xl mx-auto">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold uppercase tracking-wider mb-4 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-sky-500" />
            <span>Community Initiatives & Drives</span>
          </div>

          <h1 className="font-secondary text-slate-800 text-3xl sm:text-5xl font-bold tracking-tight">
            Our Events & Drives
          </h1>
          <p className="font-primary-italic text-3xl sm:text-4xl text-sky-600 mt-2">
            Meet. Connect. Learn. Make an Impact.
          </p>

          <p className="font-secondary text-zinc-600 text-sm sm:text-base max-w-2xl mx-auto mt-4 leading-relaxed">
            Discover the meaningful workshops, orphanage visits, environmental drives, and student
            empowerment initiatives led by IMAGES. Join us in making real, lasting change.
          </p>
        </section>

        {/* Filter & Search Bar */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 mb-10">
          <div className="rounded-2xl border border-gray-200 bg-slate-50/80 backdrop-blur-md p-4 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events by title, keyword, or venue..."
                className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm outline-none transition focus:border-black"
              />
            </div>

            {/* Category / Status Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-xl bg-white border border-gray-300 p-1">
                {["ALL", "UPCOMING", "ONGOING", "COMPLETED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatus(st)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      selectedStatus === st
                        ? "bg-black text-white shadow-xs"
                        : "text-zinc-600 hover:text-black"
                    }`}
                  >
                    {st === "ALL" ? "All Status" : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category Chips Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === cat.value
                    ? "bg-sky-500 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Events Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-sky-500" />
              <p className="text-sm font-medium">Gathering NGO events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 p-16 text-center bg-slate-50/50">
              <CalendarDays className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-800">No events found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Try adjusting your search criteria or explore other categories.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event) => {
                const dateParts = getMonthAndDay(event.eventDate);
                const hasMultipleImages = event.images && event.images.length > 1;

                return (
                  <div
                    key={event.id}
                    onClick={() => openExtendedModal(event)}
                    className="group relative flex flex-col rounded-3xl border border-gray-200/90 bg-white overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                  >
                    {/* Event Banner */}
                    <div className="relative aspect-[16/10] w-full bg-zinc-100 overflow-hidden">
                      {event.images && event.images.length > 0 ? (
                        <Image
                          src={event.images[0]}
                          alt={event.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-300">
                          <Layers className="h-10 w-10" />
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        {/* Event Type Pill */}
                        <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white uppercase tracking-wider">
                          {event.eventType}
                        </span>

                        {/* Status Pill */}
                        <span
                          className={`rounded-full backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            event.status === "UPCOMING"
                              ? "bg-amber-500/90 text-white"
                              : event.status === "ONGOING"
                              ? "bg-sky-500/90 text-white"
                              : "bg-emerald-600/90 text-white"
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>

                      {/* Multi-image indicator badge */}
                      {hasMultipleImages && (
                        <span className="absolute bottom-3 right-3 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white flex items-center gap-1">
                          <span>📷</span>
                          <span>{event.images.length} photos</span>
                        </span>
                      )}

                      {/* Floating Date Badge */}
                      <div className="absolute bottom-3 left-3 flex flex-col items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-md">
                        <span className="text-[10px] font-extrabold text-sky-600 tracking-wider">
                          {dateParts.month}
                        </span>
                        <span className="text-base font-bold text-zinc-900 leading-tight">
                          {dateParts.day}
                        </span>
                      </div>
                    </div>

                    {/* Card Content - Parameters shown directly */}
                    <div className="p-6 flex flex-col justify-between flex-1">
                      <div>
                        <h3 className="text-xl font-bold text-zinc-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                          {event.title}
                        </h3>

                        <p className="mt-2 text-xs sm:text-sm text-zinc-600 line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>

                        <div className="mt-5 space-y-2 text-xs text-zinc-600 border-t border-zinc-100 pt-4">
                          {/* Time */}
                          {(event.startTime || event.endTime) && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                              <span>
                                {event.startTime || "Starts"} {event.endTime ? `to ${event.endTime}` : ""}
                              </span>
                            </div>
                          )}

                          {/* Location */}
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 break-words leading-tight">{event.location}</span>
                          </div>

                          {/* Participants Count Indicator */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2 text-indigo-600 font-medium">
                              <Users className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {event.participantIds?.length || 0}{" "}
                                {event.participantIds?.length === 1
                                  ? "Participant"
                                  : "Participants"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Link */}
                      <div className="mt-5 pt-3 flex items-center justify-between text-xs font-semibold text-sky-600 group-hover:text-sky-700 transition">
                        <span>Explore Event Details</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* EXTENDED EVENT DETAIL MODAL */}
      {extendedEvent && (
        <div
          onClick={closeExtendedModal}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
          >
            {/* Close Button */}
            <button
              onClick={closeExtendedModal}
              aria-label="Close modal"
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Scrollable Container */}
            <div className="overflow-y-auto overflow-x-hidden flex-1">
              {/* Image Carousel / Gallery Section */}
              {extendedEvent.images && extendedEvent.images.length > 0 && (
                <div className="relative aspect-[16/9] w-full bg-black">
                  <Image
                    src={extendedEvent.images[activeImageIndex]}
                    alt={extendedEvent.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 896px"
                    className="object-contain"
                  />

                  {/* Gradient Overlay for controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

                  {/* Left / Right Carousel Controls if multiple images */}
                  {extendedEvent.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        aria-label="Previous photo"
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md transition hover:scale-110"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      <button
                        onClick={nextImage}
                        aria-label="Next photo"
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md transition hover:scale-110"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      {/* Image Counter */}
                      <div className="absolute bottom-4 right-4 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-xs text-white font-medium">
                        {activeImageIndex + 1} / {extendedEvent.images.length}
                      </div>

                      {/* Thumbnail dots / previews */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                        {extendedEvent.images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            className={`h-2 rounded-full transition-all ${
                              activeImageIndex === idx ? "w-6 bg-white" : "w-2 bg-white/50"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Extended Details Content */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Header Meta */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="rounded-full bg-sky-100 text-sky-800 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
                      {extendedEvent.eventType}
                    </span>
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        extendedEvent.status === "UPCOMING"
                          ? "bg-amber-100 text-amber-800"
                          : extendedEvent.status === "ONGOING"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {extendedEvent.status}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                    {extendedEvent.title}
                  </h2>
                </div>

                {/* Key Parameter Info Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-gray-200">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 shrink-0 mt-0.5">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-zinc-500 uppercase">
                        Event Date
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-zinc-900 break-words leading-snug">
                        {formatEventDate(extendedEvent.eventDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shrink-0 mt-0.5">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-zinc-500 uppercase">
                        Timing
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-zinc-900 break-words leading-snug">
                        {extendedEvent.startTime || "Scheduled"}{" "}
                        {extendedEvent.endTime ? `- ${extendedEvent.endTime}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0 mt-0.5">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-zinc-500 uppercase">
                        Venue / Location
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-zinc-900 break-words leading-snug">
                        {extendedEvent.location}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full Description */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-2">
                    About this initiative
                  </h3>
                  <p className="text-sm sm:text-base text-zinc-700 leading-relaxed whitespace-pre-line">
                    {extendedEvent.description}
                  </p>
                </div>

                {/* Extended Participants Roster */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-500" />
                      <span>Volunteers & Participants Roster</span>
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {extendedEvent.participantIds?.length || 0} Registered
                    </span>
                  </div>

                  {extendedEvent.participants && extendedEvent.participants.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {extendedEvent.participants.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 bg-white"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs">
                            {(p.username || "Member").charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-zinc-900 truncate">
                              {p.username}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">Volunteer</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-zinc-400">
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
