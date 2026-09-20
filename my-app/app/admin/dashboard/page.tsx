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
  ArrowLeft,
  Shield,
  Layers,
  ExternalLink,
  Lock,
  Sparkles,
  RefreshCw,
  Eye,
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
  const isDev = process.env.NODE_ENV === "development";

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
    if (session && session.user?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    if (!isDev && !session) {
      router.push("/login?callbackUrl=/admin/dashboard");
    }
  }, [authStatus, session, isDev, router]);

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
        console.error("Failed to load dashboard data", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingEventId(null);
    setActiveModalTab("DETAILS");
    setFormTitle("");
    setFormDescription("");
    setFormEventType("COMMUNITY");
    setFormStatus("UPCOMING");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStartTime("10:00 AM");
    setFormEndTime("02:00 PM");
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

  // Handle Image Upload via Cloudinary API
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
          // Incrementally append each uploaded photo so earlier uploads aren't lost
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

  // Select / Deselect All Participants
  const handleSelectAllParticipants = () => {
    const visibleUserIds = filteredUsers.map((u) => u.id);
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
        location: formLocation.trim(),
        startTime: formStartTime.trim() || null,
        endTime: formEndTime.trim() || null,
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
      }, 1200);
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

  // Filtered Users in Modal
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Metrics
  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => e.status.toUpperCase() === "UPCOMING").length;
  const completedEvents = events.filter((e) => e.status.toUpperCase() === "COMPLETED").length;
  const uniqueParticipantsCount = new Set(events.flatMap((e) => e.participantIds || [])).size;

  // Auth Loading Screen
  if (authStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <p className="text-sm text-zinc-500">Checking administrator authorization...</p>
        </div>
      </div>
    );
  }

  // Access Denied Screen
  const isUnauthorized = (session && session.user?.role !== "ADMIN") || (!isDev && !session);
  if (isUnauthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Admin Access Required</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            You must be logged in as an Administrator to access the IMAGES Admin Dashboard.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/login?callbackUrl=/admin/dashboard"
              className="w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Sign in as Admin
            </Link>
            <Link
              href="/"
              className="w-full rounded-xl border border-zinc-200 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Site</span>
            </Link>
            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs">
                NGO
              </span>
              <h1 className="font-semibold text-base sm:text-lg">Admin Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isDbConnected === true && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>DB Synced</span>
              </span>
            )}
            {isDbConnected === false && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Dev Storage</span>
              </span>
            )}

            <Link
              href="/events"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline px-2.5 py-1.5 rounded-lg border border-sky-500/20 bg-sky-50 dark:bg-sky-950/30"
            >
              <span>View Public Events</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            {session?.user?.role === "ADMIN" ? (
              <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span className="hidden sm:inline">Admin:</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {session.user?.name || session.user?.email}
                </span>
                <span className="rounded-full px-2 py-0.5 font-semibold text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ADMIN
                </span>
              </div>
            ) : isDev ? (
              <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-full border border-sky-500/20">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Dev Mode Preview</span>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-8">
        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Events & Operations</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
              Create, curate, and manage NGO drives and community initiatives. Assign member participants
              and upload high-definition event galleries directly through Cloudinary.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Event</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Total Events
              </span>
              <Calendar className="h-4 w-4 text-sky-500" />
            </div>
            <div className="mt-3 text-2xl font-bold">{totalEvents}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Upcoming
              </span>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-3 text-2xl font-bold">{upcomingEvents}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Completed
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3 text-2xl font-bold">{completedEvents}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Active Participants
              </span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-3 text-2xl font-bold">{uniqueParticipantsCount}</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 mb-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events by title, description, or location..."
                className="w-full rounded-xl border border-zinc-200 pl-9 pr-4 py-2 text-xs sm:text-sm outline-none transition focus:border-black dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium outline-none dark:border-zinc-800 dark:bg-zinc-950"
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
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium outline-none dark:border-zinc-800 dark:bg-zinc-950"
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
                className="p-2 rounded-xl border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white transition"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div>
          {loading && events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-sky-500" />
              <p className="text-sm">Loading events catalog...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 py-20 text-center bg-white dark:bg-zinc-900">
              <Calendar className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                No events match your criteria
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                Try modifying your search or click &ldquo;Create New Event&rdquo; to publish your first initiative.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="group flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs hover:shadow-md transition"
                >
                  {/* Event Banner */}
                  <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    {evt.images && evt.images.length > 0 ? (
                      <Image
                        src={evt.images[0]}
                        alt={evt.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <Layers className="h-8 w-8" />
                      </div>
                    )}

                    {/* Badges Overlay */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                        {evt.eventType}
                      </span>
                      <span
                        className={`rounded-md backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          evt.status === "UPCOMING"
                            ? "bg-amber-500/80 text-white"
                            : evt.status === "ONGOING"
                            ? "bg-sky-500/80 text-white"
                            : "bg-emerald-500/80 text-white"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>

                    {evt.images && evt.images.length > 1 && (
                      <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white">
                        📷 {evt.images.length} photos
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <h3
                        className="text-base font-bold text-zinc-900 dark:text-white line-clamp-1"
                        title={evt.title}
                      >
                        {evt.title}
                      </h3>

                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {evt.description}
                      </p>

                      <div className="mt-4 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
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

                        {(evt.startTime || evt.endTime) && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span>
                              {evt.startTime || "Start"} {evt.endTime ? `- ${evt.endTime}` : ""}
                            </span>
                          </div>
                        )}

                        <div className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 break-words leading-tight">{evt.location}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Users className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">
                            {evt.participantIds?.length || 0} Participants assigned
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <Link
                        href={`/events`}
                        target="_blank"
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview</span>
                      </Link>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(evt)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-black dark:hover:border-white transition"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteEvent(evt.id, evt.title)}
                          disabled={deletingId === evt.id}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition disabled:opacity-50"
                          title="Delete Event"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {editingEventId ? "Edit Event" : "Create New Event"}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Configure details, upload Cloudinary assets, and assign participants.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Segmented Step Tabs */}
              <div className="flex items-center gap-1.5 mt-3 p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("DETAILS")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
                    activeModalTab === "DETAILS"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  1. Details & Venue
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("MEDIA")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    activeModalTab === "MEDIA"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
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
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
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
                  <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* TAB 1: DETAILS & SCHEDULE */}
                {activeModalTab === "DETAILS" && (
                  <div className="space-y-3.5 animate-fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Asra Orphanage Educational Workshop"
                        className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Category / Type
                        </label>
                        <select
                          value={formEventType}
                          onChange={(e) => setFormEventType(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
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
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Status
                        </label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        >
                          <option value="UPCOMING">Upcoming</option>
                          <option value="ONGOING">Ongoing</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Event Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-xs outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          Start Time (Optional)
                        </label>
                        <input
                          type="text"
                          value={formStartTime}
                          onChange={(e) => setFormStartTime(e.target.value)}
                          placeholder="e.g. 10:00 AM"
                          className="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-xs outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          End Time (Optional)
                        </label>
                        <input
                          type="text"
                          value={formEndTime}
                          onChange={(e) => setFormEndTime(e.target.value)}
                          placeholder="e.g. 02:00 PM"
                          className="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-xs outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Venue / Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        placeholder="e.g. Institute for the Blind, Sector 26, Chandigarh"
                        className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-xs outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Description *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Detailed summary of the initiative, goals, impact, and activities..."
                        className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-xs outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white resize-y"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: PHOTOS / CLOUDINARY */}
                {activeModalTab === "MEDIA" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Upload Event Images to Cloudinary
                      </span>
                      <span className="text-xs text-zinc-500">
                        {formImages.length} {formImages.length === 1 ? "image" : "images"} attached
                      </span>
                    </div>

                    {imageUploadError && (
                      <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{imageUploadError}</span>
                      </div>
                    )}

                    {/* Upload Dropzone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 p-6 text-center cursor-pointer bg-zinc-50 dark:bg-zinc-950/40 transition group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                        className="hidden"
                        onChange={(e) => handleImageFileChange(e.target.files)}
                      />
                      <div className="rounded-full bg-zinc-200 dark:bg-zinc-800 p-2.5 text-zinc-600 dark:text-zinc-300 group-hover:scale-105 transition-transform mb-2">
                        {isUploadingImage ? (
                          <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                        ) : (
                          <UploadCloud className="h-5 w-5 text-sky-500" />
                        )}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {isUploadingImage ? "Uploading to Cloudinary..." : "Click to select or drag event images"}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
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
                        className="flex-1 rounded-xl border border-zinc-300 px-3 py-1.5 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddManualImage}
                        className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                      >
                        Add URL
                      </button>
                    </div>

                    {/* Thumbnails */}
                    {formImages.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1">
                        {formImages.map((imgUrl, index) => (
                          <div
                            key={index}
                            className="group relative aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgUrl}
                              alt={`Event image ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              title="Remove image"
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/75 text-white hover:bg-red-600 transition"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-zinc-400 py-3">
                        No photos added yet. Add at least 1 image before publishing.
                      </p>
                    )}
                  </div>
                )}

                {/* TAB 3: PARTICIPANTS ROSTER */}
                {activeModalTab === "PARTICIPANTS" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Assign Members to Event Roster
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold">
                          {formParticipantIds.length} Selected
                        </span>
                        <button
                          type="button"
                          onClick={handleSelectAllParticipants}
                          className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          {filteredUsers.every((u) => formParticipantIds.includes(u.id))
                            ? "Deselect All"
                            : "Select All"}
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
                        className="w-full rounded-xl border border-zinc-200 pl-8 pr-4 py-1.5 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                      />
                    </div>

                    {/* Checkbox User List Container */}
                    <div className="max-h-60 overflow-y-auto space-y-1 rounded-xl border border-zinc-200 dark:border-zinc-800 p-1.5 bg-zinc-50/50 dark:bg-zinc-950/50">
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
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none ${
                                isSelected
                                  ? "bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
                                  : "hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-4 w-4 items-center justify-center rounded-md border transition ${
                                    isSelected
                                      ? "bg-indigo-600 border-indigo-600 text-white"
                                      : "border-zinc-400 bg-white dark:bg-zinc-900"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>

                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-200">
                                  {user.username.charAt(0).toUpperCase()}
                                </div>

                                <div>
                                  <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                                    {user.username}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                    {user.email}
                                  </div>
                                </div>
                              </div>

                              {user.role === "ADMIN" && (
                                <span className="text-[9px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
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
                      className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
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
                      className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                    >
                      {activeModalTab === "DETAILS" ? "Next: Photos →" : "Next: Participants →"}
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || isUploadingImage}
                    className="flex items-center gap-2 rounded-xl bg-black px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition disabled:opacity-50"
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
