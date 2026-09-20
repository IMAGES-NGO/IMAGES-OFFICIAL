"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  UploadCloud,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  ExternalLink,
  Lock,
  Sparkles,
  RefreshCw,
  Star,
} from "lucide-react";

interface ParticipantUser {
  id: string;
  username: string;
  email: string;
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
  isFromDatabase?: boolean;
}

const EVENT_TYPES = [
  "ALL",
  "COMMUNITY",
  "EDUCATION",
  "HEALTHCARE",
  "ENVIRONMENT",
  "GBM",
  "VISIT",
];

const EVENT_STATUSES = ["ALL", "UPCOMING", "ONGOING", "COMPLETED"];

export default function AdminDashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // Data states
  const [events, setEvents] = useState<EventItem[]>([]);
  const [users, setUsers] = useState<ParticipantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"DETAILS" | "MEDIA" | "PARTICIPANTS">("DETAILS");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEventType, setFormEventType] = useState("COMMUNITY");
  const [formStatus, setFormStatus] = useState("UPCOMING");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formParticipantIds, setFormParticipantIds] = useState<string[]>([]);

  // User search within participant modal
  const [userSearch, setUserSearch] = useState("");

  // Image Upload states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session) {
      router.push("/login?callbackUrl=/admin/dashboard");
      return;
    }
    if (session.user?.role !== "ADMIN") {
      router.push("/");
      return;
    }
  }, [authStatus, session, router]);

  // Fetch Events
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      if (res.ok && data.events) {
        setEvents(data.events);
        if (typeof data.databaseConnected === "boolean") {
          setIsDbConnected(data.databaseConnected);
        }
      }
    } catch (err) {
      console.error("Failed to load events", err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [eventsRes, usersRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/admin/users"),
        ]);

        const eventsData = await eventsRes.json();
        const usersData = await usersRes.json();

        if (!ignore) {
          if (eventsRes.ok && eventsData.events) {
            setEvents(eventsData.events);
            if (typeof eventsData.databaseConnected === "boolean") {
              setIsDbConnected(eventsData.databaseConnected);
            }
          }
          if (usersRes.ok && usersData.users) {
            setUsers(usersData.users);
          }
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (session?.user?.role === "ADMIN") {
      loadData();
    }
    return () => {
      ignore = true;
    };
  }, [session]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingEventId(null);
    setActiveModalTab("DETAILS");
    setFormTitle("");
    setFormDescription("");
    setFormEventType("COMMUNITY");
    setFormStatus("UPCOMING");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStartTime("");
    setFormEndTime("");
    setFormLocation("");
    setFormImages([]);
    setFormParticipantIds([]);
    setFormError(null);
    setFormSuccess(null);
    setImageUploadError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (event: EventItem) => {
    setEditingEventId(event.id);
    setActiveModalTab("DETAILS");
    setFormTitle(event.title);
    setFormDescription(event.description);
    setFormEventType(event.eventType || "COMMUNITY");
    setFormStatus(event.status || "UPCOMING");

    // Format date string to YYYY-MM-DD for date input
    const d = new Date(event.eventDate);
    const dateStr = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
    setFormDate(dateStr);

    setFormStartTime(event.startTime || "");
    setFormEndTime(event.endTime || "");
    setFormLocation(event.location);
    setFormImages(event.images || []);
    setFormParticipantIds(event.participantIds || []);
    setFormError(null);
    setFormSuccess(null);
    setImageUploadError(null);
    setIsModalOpen(true);
  };

  // Handle Image Upload via API
  const handleImageFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingImage(true);
    setImageUploadError(null);

    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name}: Not a supported image format`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: Exceeds 10MB limit`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", formTitle || file.name);
        formData.append("category", "EVENTS");

        const res = await fetch("/api/admin/images", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to upload image.");
        }

        if (data.image?.url) {
          // Incrementally append each uploaded photo
          setFormImages((prev) => [...prev, data.image.url]);
        }
      } catch (err: unknown) {
        console.error(`Upload error for ${file.name}:`, err);
        errors.push(`${file.name}: ${err instanceof Error ? err.message : "Upload failed"}`);
      }
    }

    if (errors.length > 0) {
      setImageUploadError(errors.join("; "));
    }
    setIsUploadingImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Add Image via manual URL with validation
  const handleAddManualImage = () => {
    const trimmed = manualImageUrl.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setImageUploadError("Please enter a valid HTTP or HTTPS image URL.");
        return;
      }
      setFormImages((prev) => [...prev, trimmed]);
      setManualImageUrl("");
      setImageUploadError(null);
    } catch {
      setImageUploadError("Please enter a valid URL (e.g. https://example.com/photo.jpg).");
    }
  };

  // Set Cover Image (Moves selected image to index 0)
  const handleSetCoverImage = (indexToCover: number) => {
    if (indexToCover === 0) return;
    setFormImages((prev) => {
      const next = [...prev];
      const [selected] = next.splice(indexToCover, 1);
      return [selected, ...next];
    });
  };

  // Remove Image
  const handleRemoveImage = (indexToRemove: number) => {
    setFormImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Toggle Participant Checkbox
  const handleToggleParticipant = (userId: string) => {
    setFormParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Filtered Users in Modal
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Select / Deselect All Participants
  const handleSelectAllParticipants = () => {
    const visibleUserIds = filteredUsers.map((u) => u.id);
    if (visibleUserIds.length === 0) return;
    const allSelected = visibleUserIds.every((id) => formParticipantIds.includes(id));

    if (allSelected) {
      setFormParticipantIds((prev) => prev.filter((id) => !visibleUserIds.includes(id)));
    } else {
      setFormParticipantIds((prev) => Array.from(new Set([...prev, ...visibleUserIds])));
    }
  };

  // Submit Event Form (Create or Edit)
  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formTitle.trim()) {
      setFormError("Event title is required.");
      setActiveModalTab("DETAILS");
      return;
    }
    if (!formDescription.trim()) {
      setFormError("Event description is required.");
      setActiveModalTab("DETAILS");
      return;
    }
    if (!formDate) {
      setFormError("Event date is required.");
      setActiveModalTab("DETAILS");
      return;
    }
    if (!formLocation.trim()) {
      setFormError("Event location is required.");
      setActiveModalTab("DETAILS");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        eventType: formEventType,
        status: formStatus,
        eventDate: new Date(formDate).toISOString(),
        startTime: formStartTime.trim() || null,
        endTime: formEndTime.trim() || null,
        location: formLocation.trim(),
        images: formImages,
        participantIds: formParticipantIds,
      };

      const url = editingEventId ? `/api/events/${editingEventId}` : "/api/events";
      const method = editingEventId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save event.");
      }

      setFormSuccess(editingEventId ? "Event updated successfully!" : "Event created successfully!");
      fetchEvents();

      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete event "${title}"?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete event.");
      }
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete event.");
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Events
  const filteredEvents = events.filter((e) => {
    const matchesType = selectedType === "ALL" || e.eventType.toUpperCase() === selectedType;
    const matchesStatus =
      selectedStatus === "ALL" || e.status.toUpperCase() === selectedStatus;
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  // Metrics
  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => e.status.toUpperCase() === "UPCOMING").length;
  const completedEvents = events.filter((e) => e.status.toUpperCase() === "COMPLETED").length;
  const uniqueParticipantsCount = new Set(events.flatMap((e) => e.participantIds || [])).size;

  // Auth Loading Screen
  if (authStatus === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <p className="text-sm font-medium text-zinc-500">Checking administrator authorization...</p>
        </div>
      </div>
    );
  }

  // Access Denied Screen
  const isUnauthorized = !session || session.user?.role !== "ADMIN";
  if (isUnauthorized) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50/50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Admin Access Required</h2>
          <p className="mt-2 text-sm text-zinc-500">
            You must be logged in as an Administrator to access the IMAGES Admin Dashboard.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/login?callbackUrl=/admin/dashboard"
              className="w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 shadow-sm"
            >
              Sign in as Admin
            </Link>
            <Link
              href="/"
              className="w-full rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 pb-24">
      {/* Main Container - Padded top so content sits comfortably below floating Navbar */}
      <main className="mx-auto max-w-7xl px-4 pt-16 sm:pt-20 sm:px-8">
        {/* Title & Action Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-semibold">
                <Sparkles className="h-3 w-3 text-sky-600" />
                <span>NGO Operations</span>
              </div>

              {isDbConnected === true && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>DB Synced</span>
                </span>
              )}

              {isDbConnected === false && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>Local Storage</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
              Admin Events & Drives
            </h1>
            <p className="mt-1 text-sm text-zinc-500 max-w-2xl">
              Publish NGO initiatives, assign member participants, and upload high-resolution event galleries with cover photo controls.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/events"
              target="_blank"
              className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 px-3.5 py-2.5 rounded-xl border border-sky-200/80 bg-sky-50/70 hover:bg-sky-50 transition shadow-xs"
            >
              <span>View Public Events</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-zinc-800 transition active:scale-[0.99]"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Create New Event</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Total Events
              </span>
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-zinc-900">{totalEvents}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Upcoming
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-zinc-900">{upcomingEvents}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Completed
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-zinc-900">{completedEvents}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Active Members
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-zinc-900">{uniqueParticipantsCount}</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs mb-8">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events by title, description, or location..."
                className="w-full rounded-xl border border-zinc-200 pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black bg-zinc-50/50"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs font-semibold outline-none text-zinc-700 hover:bg-zinc-100 transition"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    Type: {t}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs font-semibold outline-none text-zinc-700 hover:bg-zinc-100 transition"
              >
                {EVENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    Status: {s}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchEvents}
                title="Refresh events"
                className="p-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-50 transition"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div>
          {loading && events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-sky-500" />
              <p className="text-sm font-medium">Loading events catalog...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 py-20 text-center bg-white shadow-xs">
              <Calendar className="h-12 w-12 text-zinc-300 mb-2" />
              <p className="text-base font-bold text-zinc-800">
                No events match your criteria
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                Try modifying your search or click &ldquo;Create New Event&rdquo; to publish your first initiative.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="group flex flex-col rounded-3xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  {/* Event Banner */}
                  <div className="relative aspect-[16/10] w-full bg-zinc-100 overflow-hidden">
                    {evt.images && evt.images.length > 0 ? (
                      <Image
                        src={evt.images[0]}
                        alt={evt.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <Layers className="h-8 w-8" />
                      </div>
                    )}

                    {/* Badges Overlay */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        {evt.eventType}
                      </span>
                      <span
                        className={`rounded-full backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          evt.status === "UPCOMING"
                            ? "bg-amber-500 text-white"
                            : evt.status === "ONGOING"
                            ? "bg-sky-500 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>

                    {evt.images && evt.images.length > 1 && (
                      <span className="absolute bottom-3 right-3 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium text-white">
                        📷 {evt.images.length} photos
                      </span>
                    )}

                    {/* Cover badge */}
                    {evt.images && evt.images.length > 0 && (
                      <span className="absolute bottom-3 left-3 rounded-full bg-amber-500/95 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1 shadow-xs">
                        <Star className="h-3 w-3 fill-current" />
                        <span>Cover</span>
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <h3
                        className="text-base font-bold text-zinc-900 line-clamp-1 group-hover:text-sky-600 transition-colors"
                        title={evt.title}
                      >
                        {evt.title}
                      </h3>

                      <p className="mt-2 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>

                      <div className="mt-4 space-y-1.5 text-xs text-zinc-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span>
                            {new Date(evt.eventDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{evt.location}</span>
                        </div>

                        {(evt.startTime || evt.endTime) && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span>
                              {evt.startTime || "TBD"} {evt.endTime ? `- ${evt.endTime}` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Participants preview & Actions Footer */}
                    <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Users className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="font-semibold text-zinc-700">
                          {evt.participantIds?.length || 0}
                        </span>
                        <span>members</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(evt)}
                          title="Edit event"
                          className="p-2 rounded-xl text-zinc-600 hover:text-black hover:bg-zinc-100 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(evt.id, evt.title)}
                          disabled={deletingId === evt.id}
                          title="Delete event"
                          className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          {deletingId === evt.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* CREATE / EDIT EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 pb-3 border-b border-zinc-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">
                    {editingEventId ? "Edit Event" : "Create New Event"}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Configure details, upload photos, set cover image, and assign participants.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-black hover:bg-zinc-200/60 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Segmented Step Tabs */}
              <div className="flex items-center gap-1.5 mt-3 p-1 rounded-xl bg-zinc-100 border border-zinc-200/60">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("DETAILS")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
                    activeModalTab === "DETAILS"
                      ? "bg-white text-zinc-900 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  1. Details & Venue
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("MEDIA")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    activeModalTab === "MEDIA"
                      ? "bg-white text-zinc-900 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>2. Photos</span>
                  {formImages.length > 0 && (
                    <span className="rounded-full bg-sky-500 text-white text-[10px] px-1.5 py-0.2">
                      {formImages.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("PARTICIPANTS")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    activeModalTab === "PARTICIPANTS"
                      ? "bg-white text-zinc-900 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>3. Participants</span>
                  {formParticipantIds.length > 0 && (
                    <span className="rounded-full bg-indigo-500 text-white text-[10px] px-1.5 py-0.2">
                      {formParticipantIds.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Form Body */}
            <form
              onSubmit={handleSubmitEvent}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
                  e.preventDefault();
                }
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {/* Feedback Alerts */}
                {formError && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* TAB 1: DETAILS & SCHEDULE */}
                {activeModalTab === "DETAILS" && (
                  <div className="space-y-3.5 animate-fade-in">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Asra Orphanage Educational Workshop"
                        className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm outline-none transition focus:border-black bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Category / Type
                        </label>
                        <select
                          value={formEventType}
                          onChange={(e) => setFormEventType(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs outline-none transition focus:border-black bg-white"
                        >
                          <option value="COMMUNITY">Community Drive</option>
                          <option value="EDUCATION">Education & Literacy</option>
                          <option value="HEALTHCARE">Healthcare & Wellness</option>
                          <option value="ENVIRONMENT">Environment & Plantation</option>
                          <option value="GBM">General Body Meeting (GBM)</option>
                          <option value="VISIT">Orphanage / Home Visit</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Lifecycle Status
                        </label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs outline-none transition focus:border-black bg-white"
                        >
                          <option value="UPCOMING">Upcoming</option>
                          <option value="ONGOING">Ongoing</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Event Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-xs outline-none transition focus:border-black bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Start Time (Optional)
                        </label>
                        <input
                          type="text"
                          value={formStartTime}
                          onChange={(e) => setFormStartTime(e.target.value)}
                          placeholder="e.g. 10:00 AM"
                          className="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-xs outline-none transition focus:border-black bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          End Time (Optional)
                        </label>
                        <input
                          type="text"
                          value={formEndTime}
                          onChange={(e) => setFormEndTime(e.target.value)}
                          placeholder="e.g. 02:00 PM"
                          className="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-xs outline-none transition focus:border-black bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Venue / Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        placeholder="e.g. Institute for the Blind, Sector 26, Chandigarh"
                        className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-xs outline-none transition focus:border-black bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Detailed summary of the initiative, goals, impact, and activities..."
                        className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-xs outline-none transition focus:border-black resize-y bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: PHOTOS / MEDIA */}
                {activeModalTab === "MEDIA" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-zinc-800">
                          Upload Event Images
                        </span>
                        <p className="text-[11px] text-zinc-500">
                          The first photo is the <strong>Cover Image</strong> displayed on cards. Click &ldquo;Set as Cover&rdquo; on any photo to choose it.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                        {formImages.length} {formImages.length === 1 ? "image" : "images"}
                      </span>
                    </div>

                    {imageUploadError && (
                      <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                        <span>{imageUploadError}</span>
                      </div>
                    )}

                    {/* Upload Dropzone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 hover:border-zinc-400 p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                        className="hidden"
                        onChange={(e) => handleImageFileChange(e.target.files)}
                      />
                      <div className="rounded-full bg-sky-50 border border-sky-100 p-3 text-sky-600 group-hover:scale-105 transition-transform mb-2">
                        {isUploadingImage ? (
                          <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
                        ) : (
                          <UploadCloud className="h-6 w-6 text-sky-600" />
                        )}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-zinc-800">
                        {isUploadingImage ? "Uploading image..." : "Click to select or drag event photos"}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Supports JPG, PNG, WebP (up to 10MB each)
                      </p>
                    </div>

                    {/* Manual URL Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={manualImageUrl}
                        onChange={(e) => setManualImageUrl(e.target.value)}
                        placeholder="Or paste an image URL directly..."
                        className="flex-1 rounded-xl border border-zinc-300 px-3 py-1.5 text-xs outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddManualImage}
                        className="rounded-xl border border-zinc-300 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition"
                      >
                        Add URL
                      </button>
                    </div>

                    {/* Thumbnails with Cover Image Selector */}
                    {formImages.length > 0 ? (
                      <div>
                        <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                          Attached Photos ({formImages.length})
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {formImages.map((imgUrl, index) => {
                            const isCover = index === 0;
                            return (
                              <div
                                key={index}
                                className={`group relative rounded-2xl overflow-hidden border transition-all ${
                                  isCover
                                    ? "border-amber-400 ring-2 ring-amber-400/30 shadow-md"
                                    : "border-zinc-200 hover:border-zinc-300 bg-zinc-50"
                                }`}
                              >
                                <div className="aspect-[16/10] w-full relative bg-zinc-100">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={imgUrl}
                                    alt={`Event image ${index + 1}`}
                                    className="h-full w-full object-cover"
                                  />

                                  {/* Cover Badge or Set as Cover Button */}
                                  {isCover ? (
                                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                      <Star className="h-3 w-3 fill-current" />
                                      <span>Cover Image</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSetCoverImage(index)}
                                      title="Set as event cover image"
                                      className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/75 hover:bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md transition shadow-sm"
                                    >
                                      <Star className="h-3 w-3" />
                                      <span>Set as Cover</span>
                                    </button>
                                  )}

                                  {/* Remove Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    title="Remove photo"
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/75 text-white hover:bg-red-600 transition shadow-sm"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-xs text-zinc-400 py-3 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                        No photos added yet. Upload at least 1 image to showcase this event.
                      </p>
                    )}
                  </div>
                )}

                {/* TAB 3: PARTICIPANTS ROSTER */}
                {activeModalTab === "PARTICIPANTS" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-zinc-800">
                          Assign Members to Event Roster
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Select which NGO members contributed or attended this event.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-0.5 text-[11px] font-bold">
                          {formParticipantIds.length} Selected
                        </span>

                        {/* Prominent Select All Button */}
                        <button
                          type="button"
                          onClick={handleSelectAllParticipants}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-black transition shadow-xs"
                        >
                          <div
                            className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border transition ${
                              filteredUsers.length > 0 &&
                              filteredUsers.every((u) => formParticipantIds.includes(u.id))
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "border-zinc-400 bg-white"
                            }`}
                          >
                            {filteredUsers.length > 0 &&
                              filteredUsers.every((u) => formParticipantIds.includes(u.id)) && (
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              )}
                          </div>
                          <span>
                            {filteredUsers.length > 0 &&
                            filteredUsers.every((u) => formParticipantIds.includes(u.id))
                              ? "Deselect All"
                              : "Select All"}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-normal">
                            ({filteredUsers.length})
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search members by name or email..."
                        className="w-full rounded-xl border border-zinc-200 pl-8 pr-4 py-2 text-xs outline-none bg-zinc-50/50 focus:border-black"
                      />
                    </div>

                    {/* Checkbox User List Container */}
                    <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-2xl border border-zinc-200 p-2 bg-slate-50/50">
                      {filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-zinc-500">
                          No members found matching &ldquo;{userSearch}&rdquo;.
                        </div>
                      ) : (
                        filteredUsers.map((user) => {
                          const isSelected = formParticipantIds.includes(user.id);
                          return (
                            <div
                              key={user.id}
                              onClick={() => handleToggleParticipant(user.id)}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition select-none ${
                                isSelected
                                  ? "bg-indigo-50/80 border border-indigo-200/90 shadow-xs"
                                  : "bg-white hover:bg-zinc-100/70 border border-zinc-100"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-4 w-4 items-center justify-center rounded-md border transition ${
                                    isSelected
                                      ? "bg-indigo-600 border-indigo-600 text-white"
                                      : "border-zinc-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>

                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700">
                                  {user.username.charAt(0).toUpperCase()}
                                </div>

                                <div>
                                  <div className="text-xs font-bold text-zinc-900">
                                    {user.username}
                                  </div>
                                  <div className="text-[10px] text-zinc-500">
                                    {user.email}
                                  </div>
                                </div>
                              </div>

                              {user.role === "ADMIN" && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  ADMIN
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Modal Footer */}
              <div className="p-4 border-t border-zinc-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {activeModalTab !== "DETAILS" && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveModalTab(activeModalTab === "PARTICIPANTS" ? "MEDIA" : "DETAILS")
                      }
                      className="rounded-xl border border-zinc-300 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition"
                    >
                      &larr; Back
                    </button>
                  )}

                  {activeModalTab !== "PARTICIPANTS" && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveModalTab(activeModalTab === "DETAILS" ? "MEDIA" : "PARTICIPANTS")
                      }
                      className="rounded-xl border border-zinc-300 px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 transition"
                    >
                      {activeModalTab === "DETAILS" ? "Next: Photos →" : "Next: Participants →"}
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || isUploadingImage}
                    className="flex items-center gap-2 rounded-xl bg-black px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{editingEventId ? "Update Event" : "Publish Event"}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
