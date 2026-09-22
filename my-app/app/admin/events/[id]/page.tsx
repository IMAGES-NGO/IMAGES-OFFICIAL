"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar, Clock, MapPin, Users, Edit2, Trash2, Save,
  UploadCloud, Check, X, AlertCircle, CheckCircle2,
  Loader2, Star, ArrowLeft, ExternalLink,
  Image as ImageIcon
} from "lucide-react";

interface ParticipantUser {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

interface EventType {
  id: string;
  name: string;
  points: number;
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  eventType: string;
  coverImage?: string | null;
  images: string[];
  participantIds: string[];
  requestedParticipantIds: string[];
  participants?: ParticipantUser[];
  requestedParticipants?: ParticipantUser[];
  eventDate: string;
  location: string;
  startTime?: string | null;
  endTime?: string | null;
  status: string;
}

export default function AdminManageEventPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [allUsers, setAllUsers] = useState<ParticipantUser[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<EventItem>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Participant selection state
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false);

  // Image upload state
  const [isUploading, setIsUploading] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

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
      const [eventRes, usersRes, eventTypesRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/admin/users`),
        fetch(`/api/admin/event-types`)
      ]);

      if (eventRes.ok && usersRes.ok) {
        const eventData = await eventRes.json();
        const usersData = await usersRes.json();
        const eventTypesData = eventTypesRes.ok ? await eventTypesRes.json() : [];
        
        // Handle potentially different response structures
        const fetchedEvent = eventData.event || eventData;
        const fetchedUsers = usersData.users || usersData || [];
        const fetchedEventTypes = Array.isArray(eventTypesData) ? eventTypesData : eventTypesData.eventTypes || [];
        
        setEvent(fetchedEvent);
        setAllUsers(fetchedUsers);
        setEventTypes(fetchedEventTypes);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === "authenticated" && session?.user?.role === "ADMIN") {
      fetchData();
    }
  }, [authStatus, session, eventId]);

  // Sync selected participants when event data loads
  useEffect(() => {
    if (event && event.participantIds) {
      setSelectedParticipants(new Set(event.participantIds));
    }
  }, [event]);

  if (authStatus === "loading" || isLoading || !event) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <p className="text-sm font-medium text-zinc-500 animate-pulse">Loading event details...</p>
        </div>
      </div>
    );
  }

  // Map requested participants from user list if not already populated
  const requestedUsers = event.requestedParticipants || event.requestedParticipantIds?.map(id => {
    const user = allUsers.find(u => u.id === id);
    return user || { id, username: `User ${id.substring(0,6)}` };
  }) || [];

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const startEditing = () => {
    setEditForm({
      title: event.title,
      eventType: event.eventType,
      status: event.status,
      eventDate: event.eventDate,
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      location: event.location,
      description: event.description
    });
    setIsEditing(true);
  };

  const saveEdits = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        await fetchData();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update event:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (confirm("Are you sure you want to delete this event? This cannot be undone.")) {
      try {
        const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
        if (res.ok) {
          router.push("/admin/dashboard");
        }
      } catch (error) {
        console.error("Failed to delete event:", error);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", `${event.title} ${isCover ? 'Cover' : 'Gallery'}`);
      formData.append("category", "EVENTS");

      const uploadRes = await fetch("/api/admin/images", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.image.url;

      // Update event with new image
      const updateData = isCover 
        ? { coverImage: imageUrl }
        : { images: [...(event.images || []), imageUrl] };

      const updateRes = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (updateRes.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Image upload error:", error);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const removeGalleryImage = async (imgUrl: string) => {
    if (!confirm("Remove this image?")) return;
    try {
      const newImages = (event.images || []).filter(url => url !== imgUrl);
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: newImages }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to remove image:", error);
    }
  };

  const toggleParticipant = (id: string) => {
    const newSet = new Set(selectedParticipants);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedParticipants(newSet);
  };

  const selectAllParticipants = () => {
    if (selectedParticipants.size === requestedUsers.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(requestedUsers.map(u => u.id)));
    }
  };

  const confirmAttendance = async () => {
    try {
      setIsConfirmingAttendance(true);
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: Array.from(selectedParticipants) }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to confirm attendance:", error);
    } finally {
      setIsConfirmingAttendance(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link href="/admin/dashboard" className="text-sm text-zinc-500 hover:text-zinc-800 flex items-center gap-1 mb-2 font-medium transition-colors w-fit">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-2">
              Manage Event
            </h1>
          </div>
          <button 
            onClick={deleteEvent}
            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Event
          </button>
        </div>

        {/* Section 1: Event Details */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/60">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-900">Event Details</h2>
            {!isEditing ? (
              <button 
                onClick={startEditing}
                className="px-4 py-2 text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Details
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveEdits}
                  disabled={isSaving}
                  className="px-4 py-2 text-white bg-sky-500 hover:bg-sky-600 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Title</div>
                  <div className="text-lg font-semibold text-zinc-900">{event.title}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Status & Type</div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-semibold">
                      {event.eventType}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      event.status === 'UPCOMING' ? 'bg-sky-100 text-sky-700' :
                      event.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-zinc-100 text-zinc-700'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Description</div>
                  <div className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{event.description}</div>
                </div>
              </div>
              
              <div className="space-y-6 md:border-l border-zinc-100 md:pl-8">
                <div>
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Date & Time</div>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5 text-sm text-zinc-800 font-medium bg-zinc-50 w-fit px-3 py-1.5 rounded-lg border border-zinc-100">
                      <Calendar className="w-4 h-4 text-sky-500" />
                      {new Date(event.eventDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    {(event.startTime || event.endTime) && (
                      <div className="flex items-center gap-2.5 text-sm text-zinc-600 bg-zinc-50 w-fit px-3 py-1.5 rounded-lg border border-zinc-100">
                        <Clock className="w-4 h-4 text-sky-500" />
                        {event.startTime || '?'} - {event.endTime || '?'}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Location</div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-800 font-medium bg-zinc-50 w-fit px-3 py-1.5 rounded-lg border border-zinc-100">
                    <MapPin className="w-4 h-4 text-sky-500" />
                    {event.location}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/50 p-5 rounded-2xl border border-zinc-100">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Title</label>
                  <input type="text" name="title" value={editForm.title || ""} onChange={handleEditChange} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Event Type</label>
                    <select name="eventType" value={editForm.eventType || ""} onChange={handleEditChange} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white">
                      {eventTypes.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                      {eventTypes.length === 0 && (
                        <option value="COMMUNITY">Community Drive</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Status</label>
                    <select name="status" value={editForm.status || ""} onChange={handleEditChange} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white">
                      <option value="UPCOMING">Upcoming</option>
                      <option value="ONGOING">Ongoing</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Description</label>
                  <textarea name="description" value={editForm.description || ""} onChange={handleEditChange} rows={4} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white resize-none" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Date</label>
                  <input type="date" name="eventDate" value={editForm.eventDate?.split('T')[0] || ""} onChange={handleEditChange} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Start Time</label>
                    <input type="time" name="startTime" value={editForm.startTime || ""} onChange={handleEditChange} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">End Time</label>
                    <input type="time" name="endTime" value={editForm.endTime || ""} onChange={handleEditChange} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Location</label>
                  <input type="text" name="location" value={editForm.location || ""} onChange={handleEditChange} className="w-full px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-white" />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Event Photos */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/60">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-900">Event Photos</h2>
            {isUploading && (
              <span className="flex items-center gap-2 text-sm text-sky-600 font-semibold bg-sky-50 px-3 py-1.5 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
              </span>
            )}
          </div>
          
          <div className="space-y-8">
            {/* Cover Photo */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-bold text-amber-700">Cover Photo</span>
                </div>
                <button 
                  onClick={() => coverFileInputRef.current?.click()}
                  className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3.5 py-2 rounded-xl transition-colors"
                >
                  {event.coverImage ? 'Change Cover' : 'Upload Cover'}
                </button>
                <input 
                  type="file" ref={coverFileInputRef} onChange={(e) => handleImageUpload(e, true)}
                  className="hidden" accept="image/*"
                />
              </div>
              
              {event.coverImage ? (
                <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden border border-zinc-200 group shadow-sm">
                  <Image src={event.coverImage} alt="Cover" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <button onClick={() => coverFileInputRef.current?.click()} className="px-5 py-2.5 bg-white text-zinc-900 hover:bg-zinc-50 rounded-xl text-sm font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      Change Cover Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => coverFileInputRef.current?.click()} className="aspect-[21/9] w-full rounded-2xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-500 cursor-pointer hover:bg-zinc-50 hover:border-zinc-400 transition-all">
                  <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                    <ImageIcon className="w-6 h-6 text-zinc-400" />
                  </div>
                  <span className="text-sm font-semibold">Click to upload cover photo</span>
                </div>
              )}
            </div>

            <div className="h-px bg-zinc-100 w-full" />

            {/* Gallery */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-zinc-800">Additional Photos</span>
                <button 
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <UploadCloud className="w-4 h-4" /> Upload Photo
                </button>
                <input 
                  type="file" ref={galleryFileInputRef} onChange={(e) => handleImageUpload(e, false)}
                  className="hidden" accept="image/*" multiple={false}
                />
              </div>
              
              {event.images && event.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {event.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-200 group shadow-sm">
                      <Image src={img} alt={`Gallery ${idx}`} fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <button onClick={() => removeGalleryImage(img)} className="p-2.5 bg-white text-red-600 rounded-full hover:bg-red-50 shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-200">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 text-sm text-zinc-500 font-medium">
                  No gallery photos yet. Upload some memories!
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: Participants */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/60">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              Participation Requests
              <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 text-xs rounded-lg">
                {requestedUsers.length} total
              </span>
            </h2>
          </div>

          {!event.participantIds || event.participantIds.length === 0 ? (
            <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200/60 flex items-center gap-3 text-amber-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div className="text-sm font-semibold">
                Attendance pending for this event
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-200/60 flex items-center gap-3 text-emerald-700">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <div className="text-sm font-semibold">
                Attendance confirmed for {event.participantIds.length} members
              </div>
            </div>
          )}

          {requestedUsers.length > 0 ? (
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
                <button 
                  onClick={selectAllParticipants}
                  className="text-sm text-zinc-600 font-semibold hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg"
                >
                  {selectedParticipants.size === requestedUsers.length ? "Deselect All" : "Select All"}
                </button>
                <button 
                  onClick={confirmAttendance}
                  disabled={isConfirmingAttendance}
                  className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isConfirmingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Confirmations
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {requestedUsers.map((user) => (
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
                    <div>
                      <div className="text-sm font-bold text-zinc-900">{user.username}</div>
                      <div className="text-[11px] text-zinc-500 font-medium">ID: {user.id.substring(0, 8)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-50/50 rounded-3xl border border-dashed border-zinc-200">
              <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-zinc-100">
                <Users className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="text-zinc-800 font-bold text-sm mb-1">No requests yet</div>
              <div className="text-zinc-500 text-sm">Members haven't requested to join this event.</div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
