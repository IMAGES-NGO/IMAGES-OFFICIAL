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
  Award,
  List,
  Gift
} from "lucide-react";

interface EventType {
  id: string;
  name: string;
  points: number;
}

interface ParticipantUser {
  id: string;
  username: string;
  email: string;
  role?: string;
  status?: string;
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  eventType: string;
  coverImage?: string | null;
  images: string[];
  participantIds: string[];
  requestedParticipantIds?: string[];
  participants?: ParticipantUser[];
  eventDate: string;
  location: string;
  startTime?: string | null;
  endTime?: string | null;
  status: string;
  createdAt?: string;
  isFromDatabase?: boolean;
}



const EVENT_STATUSES = ["ALL", "UPCOMING", "ONGOING", "COMPLETED"];

export default function AdminDashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // Data states
  const [events, setEvents] = useState<EventItem[]>([]);
  const [users, setUsers] = useState<ParticipantUser[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);

  const [activeDashboardTab, setActiveDashboardTab] = useState<"EVENTS" | "EVENT_TYPES" | "GIVE_POINTS">("EVENTS");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"DETAILS" | "MEDIA">("DETAILS");
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
  const [formCoverImage, setFormCoverImage] = useState<string | null>(null);

  // Image Upload states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Give Points State
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [pointsAmount, setPointsAmount] = useState<number | "">("");
  const [pointsReason, setPointsReason] = useState("");
  const [isGivingPoints, setIsGivingPoints] = useState(false);
  const [givePointsSuccess, setGivePointsSuccess] = useState<string | null>(null);

  const handleGivePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.size === 0 || !pointsAmount || !pointsReason) return;
    setIsGivingPoints(true);
    try {
      const res = await fetch("/api/admin/give-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          amount: Number(pointsAmount),
          reason: pointsReason
        })
      });
      if (!res.ok) throw new Error("Failed to give points");
      setGivePointsSuccess(`Successfully gave ${pointsAmount} points to ${selectedUsers.size} user(s).`);
      setSelectedUsers(new Set());
      setPointsAmount("");
      setPointsReason("");
      setTimeout(() => setGivePointsSuccess(null), 3000);
    } catch (err) {
      alert("Error giving points.");
    } finally {
      setIsGivingPoints(false);
    }
  };

  // Event Types State
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePoints, setNewTypePoints] = useState<number | "">("");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypePoints, setEditTypePoints] = useState<number | "">("");

  const loadEventTypes = async () => {
    const res = await fetch("/api/admin/event-types");
    const data = await res.json();
    if (res.ok) {
      setEventTypes(Array.isArray(data) ? data : data.eventTypes || []);
    }
  };

  const handleAddEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName || !newTypePoints) return;
    try {
      const res = await fetch("/api/admin/event-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTypeName, points: Number(newTypePoints) })
      });
      if (res.ok) {
        setNewTypeName("");
        setNewTypePoints("");
        loadEventTypes();
      }
    } catch (err) {
      alert("Error adding event type");
    }
  };

  const handleUpdateEventType = async (id: string) => {
    if (!editTypePoints) return;
    try {
      const res = await fetch(`/api/admin/event-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: Number(editTypePoints) })
      });
      if (res.ok) {
        setEditingTypeId(null);
        loadEventTypes();
      }
    } catch (err) {
      alert("Error updating event type");
    }
  };

  const handleDeleteEventType = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/admin/event-types/${id}`, { method: "DELETE" });
      if (res.ok) loadEventTypes();
    } catch (err) {
      alert("Error deleting event type");
    }
  };

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
        const [eventsRes, usersRes, eventTypesRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/admin/users"),
          fetch("/api/admin/event-types"),
        ]);

        const eventsData = await eventsRes.json();
        const usersData = await usersRes.json();
        const eventTypesData = await eventTypesRes.json();

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
          if (eventTypesRes.ok) {
            setEventTypes(Array.isArray(eventTypesData) ? eventTypesData : eventTypesData.eventTypes || []);
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
    setFormEventType(eventTypes.length > 0 ? eventTypes[0].name : "COMMUNITY");
    setFormStatus("UPCOMING");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStartTime("");
    setFormEndTime("");
    setFormLocation("");
    setFormImages([]);
    setFormCoverImage(null);
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
    setFormEventType(event.eventType || (eventTypes.length > 0 ? eventTypes[0].name : "COMMUNITY"));
    setFormStatus(event.status || "UPCOMING");

    // Format date string to YYYY-MM-DD for date input
    const d = new Date(event.eventDate);
    const dateStr = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
    setFormDate(dateStr);

    setFormStartTime(event.startTime || "");
    setFormEndTime(event.endTime || "");
    setFormLocation(event.location);
    setFormImages(event.images || []);
    setFormCoverImage(event.coverImage || null);
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

  // Cover image upload handler
  const handleCoverImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setImageUploadError("Cover photo must be an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageUploadError("Cover photo exceeds 10MB limit.");
      return;
    }
    setIsUploadingImage(true);
    setImageUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", formTitle || file.name);
      formData.append("category", "EVENTS");
      const res = await fetch("/api/admin/images", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload.");
      if (data.image?.url) setFormCoverImage(data.image.url);
    } catch (err: unknown) {
      setImageUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const coverInputRef = useRef<HTMLInputElement>(null);

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
        coverImage: formCoverImage,
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

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 mb-8 p-1 bg-zinc-200/50 rounded-2xl w-fit">
          <button
            onClick={() => setActiveDashboardTab("EVENTS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeDashboardTab === "EVENTS" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
            }`}
          >
            <Calendar className="h-4 w-4" /> Events
          </button>
          <button
            onClick={() => setActiveDashboardTab("EVENT_TYPES")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeDashboardTab === "EVENT_TYPES" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
            }`}
          >
            <List className="h-4 w-4" /> Event Types
          </button>
          <button
            onClick={() => setActiveDashboardTab("GIVE_POINTS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeDashboardTab === "GIVE_POINTS" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50"
            }`}
          >
            <Gift className="h-4 w-4" /> Give Points
          </button>
        </div>

        {activeDashboardTab === "EVENTS" && (
          <>
        {/* Pending Approvals Section */}
        {users.filter((u) => u.status === "PENDING").length > 0 && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Pending Approvals
                </h2>
                <p className="text-sm text-amber-700 mt-1">
                  The following users have requested to join. Approve them to grant access.
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              {users
                .filter((u) => u.status === "PENDING")
                .map((pendingUser) => (
                  <div key={pendingUser.id} className="flex items-center justify-between rounded-xl bg-white p-4 border border-amber-100 shadow-sm">
                    <div>
                      <p className="font-semibold text-zinc-900">{pendingUser.username}</p>
                      <p className="text-xs text-zinc-500">{pendingUser.email} &middot; {pendingUser.role}</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/admin/approve-user", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: pendingUser.id }),
                          });
                          if (!res.ok) throw new Error("Failed to approve");
                          setUsers(users.map(u => u.id === pendingUser.id ? { ...u, status: "APPROVED" } : u));
                        } catch (err) {
                          alert("Approval failed");
                        }
                      }}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      Approve
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

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
                {["ALL", ...eventTypes.map(t => t.name)].map((t) => (
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

                    {/* Footer with Manage Event link */}
                    <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Users className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="font-semibold text-zinc-700">
                          {evt.participantIds?.length || 0}
                        </span>
                        <span>confirmed</span>
                        {(evt.requestedParticipantIds?.length || 0) > 0 && (
                          <span className="text-amber-600 font-semibold ml-1">
                            · {evt.requestedParticipantIds!.length} pending
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/admin/events/${evt.id}`}
                        target="_blank"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-600 bg-sky-50 border border-sky-100 hover:bg-sky-100 transition"
                      >
                        <span>Manage Event</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}

        {activeDashboardTab === "EVENT_TYPES" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Manage Event Types</h2>
              
              <form onSubmit={handleAddEventType} className="flex flex-col sm:flex-row gap-4 mb-8 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Name</label>
                  <input type="text" required value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="e.g. BLOOD_DONATION" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-sky-500" />
                </div>
                <div className="w-full sm:w-32">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Points</label>
                  <input type="number" required value={newTypePoints} onChange={(e) => setNewTypePoints(e.target.value ? Number(e.target.value) : "")} placeholder="10" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-sky-500" />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 transition">
                    <Plus className="h-4 w-4" /> Add Type
                  </button>
                </div>
              </form>

              <div className="grid gap-3">
                {eventTypes.map(type => (
                  <div key={type.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 transition-colors">
                    <div>
                      <div className="font-bold text-zinc-900">{type.name}</div>
                      {editingTypeId === type.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input type="number" value={editTypePoints} onChange={(e) => setEditTypePoints(e.target.value ? Number(e.target.value) : "")} className="w-24 rounded-lg border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-sky-500" />
                          <button onClick={() => handleUpdateEventType(type.id)} className="text-xs bg-sky-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-sky-600 transition">Save</button>
                          <button onClick={() => setEditingTypeId(null)} className="text-xs bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-zinc-300 transition">Cancel</button>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-amber-600 flex items-center gap-1 mt-1">
                          <Award className="h-4 w-4" /> {type.points} points
                        </div>
                      )}
                    </div>
                    
                    {!editingTypeId && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingTypeId(type.id); setEditTypePoints(type.points); }} className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition" title="Edit points"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteEventType(type.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition" title="Delete type"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                ))}
                {eventTypes.length === 0 && (
                  <div className="text-center py-8 text-zinc-500 text-sm">No event types found. Add some above.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeDashboardTab === "GIVE_POINTS" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Give Points to Users</h2>
              
              {givePointsSuccess && (
                <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-700 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  {givePointsSuccess}
                </div>
              )}

              <form onSubmit={handleGivePoints} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Amount to Give</label>
                    <input type="number" required value={pointsAmount} onChange={(e) => setPointsAmount(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 50" className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Reason</label>
                    <input type="text" required value={pointsReason} onChange={(e) => setPointsReason(e.target.value)} placeholder="e.g. Excellent volunteering" className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 transition" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-bold text-zinc-700">Select Users ({selectedUsers.size} selected)</label>
                    <button type="button" onClick={() => {
                      if (selectedUsers.size === users.length) setSelectedUsers(new Set());
                      else setSelectedUsers(new Set(users.map(u => u.id)));
                    }} className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition">
                      {selectedUsers.size === users.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto p-1">
                    {users.map(user => (
                      <label key={user.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedUsers.has(user.id) ? "border-sky-500 bg-sky-50 shadow-sm" : "border-zinc-200 hover:border-zinc-300"}`}>
                        <input type="checkbox" className="mt-1 text-sky-500 focus:ring-sky-500 rounded" checked={selectedUsers.has(user.id)} onChange={(e) => {
                          const newSet = new Set(selectedUsers);
                          if (e.target.checked) newSet.add(user.id);
                          else newSet.delete(user.id);
                          setSelectedUsers(newSet);
                        }} />
                        <div>
                          <div className="font-bold text-zinc-900 text-sm">{user.username}</div>
                          <div className="text-xs text-zinc-500">{user.email}</div>
                        </div>
                      </label>
                    ))}
                    {users.length === 0 && (
                      <div className="col-span-full text-center py-8 text-zinc-500 text-sm">No users found.</div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex justify-end">
                  <button type="submit" disabled={isGivingPoints || selectedUsers.size === 0 || !pointsAmount || !pointsReason} className="flex items-center gap-2 rounded-xl bg-black px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 transition disabled:opacity-50">
                    {isGivingPoints ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                    Award Points
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                    Configure event details and upload photos.
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
                          {eventTypes.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                          {eventTypes.length === 0 && (
                            <option value="COMMUNITY">Community Drive</option>
                          )}
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
                  <div className="space-y-5 animate-fade-in">
                    {imageUploadError && (
                      <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                        <span>{imageUploadError}</span>
                      </div>
                    )}

                    {/* ── COVER PHOTO SECTION ── */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            Cover Photo
                          </span>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            This is the main photo displayed on event cards. Optional.
                          </p>
                        </div>
                        {formCoverImage && (
                          <button
                            type="button"
                            onClick={() => setFormCoverImage(null)}
                            className="text-[10px] font-semibold text-red-600 hover:text-red-700 transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {formCoverImage ? (
                        <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border-2 border-amber-300">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={formCoverImage} alt="Cover" className="h-full w-full object-cover" />
                          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                            <Star className="h-3 w-3 fill-current" />
                            <span>Cover</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => coverInputRef.current?.click()}
                          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 hover:border-amber-400 p-6 text-center cursor-pointer bg-white/60 hover:bg-white transition group"
                        >
                          <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => handleCoverImageUpload(e.target.files)}
                          />
                          <div className="rounded-full bg-amber-100 border border-amber-200 p-2.5 text-amber-600 group-hover:scale-105 transition-transform mb-2">
                            <UploadCloud className="h-5 w-5" />
                          </div>
                          <div className="text-xs font-bold text-amber-900">Click to upload cover photo</div>
                          <p className="text-[10px] text-amber-600 mt-0.5">JPG, PNG, WebP (up to 10MB)</p>
                        </div>
                      )}
                    </div>

                    {/* ── EVENT GALLERY SECTION ── */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-xs font-bold text-zinc-800">
                            Event Gallery
                          </span>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Upload additional photos from the event. Optional.
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                          {formImages.length} {formImages.length === 1 ? "photo" : "photos"}
                        </span>
                      </div>

                      {/* Upload Dropzone */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 hover:border-zinc-400 p-5 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition group"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                          className="hidden"
                          onChange={(e) => handleImageFileChange(e.target.files)}
                        />
                        <div className="rounded-full bg-sky-50 border border-sky-100 p-2.5 text-sky-600 group-hover:scale-105 transition-transform mb-2">
                          {isUploadingImage ? (
                            <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                          ) : (
                            <UploadCloud className="h-5 w-5 text-sky-600" />
                          )}
                        </div>
                        <div className="text-xs font-bold text-zinc-800">
                          {isUploadingImage ? "Uploading..." : "Click to add event photos"}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Supports JPG, PNG, WebP (up to 10MB each)
                        </p>
                      </div>

                      {/* Manual URL Input */}
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="url"
                          value={manualImageUrl}
                          onChange={(e) => setManualImageUrl(e.target.value)}
                          placeholder="Or paste an image URL..."
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

                      {/* Gallery Thumbnails */}
                      {formImages.length > 0 && (
                        <div className="mt-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {formImages.map((imgUrl, index) => (
                              <div key={index} className="group relative rounded-xl overflow-hidden border border-zinc-200 hover:border-zinc-300">
                                <div className="aspect-[16/10] w-full relative bg-zinc-100">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={imgUrl} alt={`Event image ${index + 1}`} className="h-full w-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    title="Remove photo"
                                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/75 text-white hover:bg-red-600 transition shadow-sm"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: PARTICIPANTS — REMOVED. Use Manage Event page instead. */}
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
                  {activeModalTab === "MEDIA" && (
                    <button
                      type="button"
                      onClick={() => setActiveModalTab("DETAILS")}
                      className="rounded-xl border border-zinc-300 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition"
                    >
                      &larr; Back
                    </button>
                  )}

                  {activeModalTab === "DETAILS" && (
                    <button
                      type="button"
                      onClick={() => setActiveModalTab("MEDIA")}
                      className="rounded-xl border border-zinc-300 px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 transition"
                    >
                      Next: Photos &rarr;
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
