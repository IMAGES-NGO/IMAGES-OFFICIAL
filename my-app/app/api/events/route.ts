import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

import { devEventsStore } from "@/lib/events-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase();

  try {
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
      throw new Error("DATABASE_URL is not configured.");
    }

    const whereClause: {
      eventType?: string;
      status?: string;
      OR?: Array<{ title?: { contains: string; mode: "insensitive" }; description?: { contains: string; mode: "insensitive" }; location?: { contains: string; mode: "insensitive" } }>;
    } = {};

    if (type && type !== "ALL") {
      whereClause.eventType = type.toUpperCase();
    }

    if (status && status !== "ALL") {
      whereClause.status = status.toUpperCase();
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const events = await db.event.findMany({
      where: whereClause,
      orderBy: { eventDate: "desc" },
    });

    // Collect all participant IDs to resolve user details in one batch
    const allParticipantIds = Array.from(
      new Set(events.flatMap((e) => e.participantIds || []))
    );

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUuids = allParticipantIds.filter((id) => UUID_REGEX.test(id));

    let usersMap = new Map<string, { id: string; username: string }>();
    if (validUuids.length > 0) {
      try {
        const users = await db.user.findMany({
          where: { id: { in: validUuids } },
          select: { id: true, username: true },
        });
        usersMap = new Map(users.map((u) => [u.id, u]));
      } catch (err) {
        console.warn("Failed to batch resolve participants from users table:", err);
      }
    }

    const enrichedEvents = events.map((event) => ({
      ...event,
      participants: (event.participantIds || []).map(
        (id) => usersMap.get(id) || { id, username: "Member" }
      ),
      isFromDatabase: true,
    }));

    return NextResponse.json({ events: enrichedEvents, databaseConnected: true });
  } catch (dbErr) {
    console.warn("Database events query failed (using dev storage):", dbErr);

    let filtered = [...devEventsStore];

    if (type && type !== "ALL") {
      filtered = filtered.filter(
        (e) => e.eventType.toUpperCase() === type.toUpperCase()
      );
    }

    if (status && status !== "ALL") {
      filtered = filtered.filter(
        (e) => e.status.toUpperCase() === status.toUpperCase()
      );
    }

    if (search) {
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(search) ||
          e.description.toLowerCase().includes(search) ||
          e.location.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      events: filtered.map((e) => ({
        ...e,
        participants: (e.participants || []).map((p) => ({ id: p.id, username: p.username })),
        isFromDatabase: false,
      })),
      databaseConnected: false,
    });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in as an administrator to create events." },
      { status: 401 }
    );
  }

  if (session.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Administrator access required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      eventType = "COMMUNITY",
      images = [],
      participantIds = [],
      eventDate,
      location,
      startTime,
      endTime,
      status = "UPCOMING",
    } = body;

    // Validate required fields according to Issue #6
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Event title is required." }, { status: 400 });
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Event description is required." }, { status: 400 });
    }

    if (!eventDate) {
      return NextResponse.json({ error: "Event date is required." }, { status: 400 });
    }

    if (!location || typeof location !== "string" || !location.trim()) {
      return NextResponse.json({ error: "Event location is required." }, { status: 400 });
    }

    const cleanImages = Array.isArray(images)
      ? images.filter((img) => typeof img === "string" && img.trim().length > 0)
      : [];

    const cleanParticipantIds = Array.isArray(participantIds)
      ? participantIds.filter((id) => typeof id === "string" && id.trim().length > 0)
      : [];

    const parsedDate = new Date(eventDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid event date format." }, { status: 400 });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    try {
      if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
        throw new Error("DATABASE_URL is not configured.");
      }

      const createdEvent = await db.event.create({
        data: {
          title: title.trim(),
          description: description.trim(),
          eventType: eventType.trim().toUpperCase(),
          images: cleanImages,
          participantIds: cleanParticipantIds,
          eventDate: parsedDate,
          location: location.trim(),
          startTime: startTime?.trim() || null,
          endTime: endTime?.trim() || null,
          status: status.trim().toUpperCase(),
        },
      });

      // Resolve participants for the response
      let participants: Array<{ id: string; username: string }> = [];
      if (cleanParticipantIds.length > 0) {
        try {
          const validUuids = cleanParticipantIds.filter((id) => UUID_REGEX.test(id));
          const dbUsers =
            validUuids.length > 0
              ? await db.user.findMany({
                  where: { id: { in: validUuids } },
                  select: { id: true, username: true },
                })
              : [];
          const usersMap = new Map(dbUsers.map((u) => [u.id, u]));
          participants = cleanParticipantIds.map(
            (id) => usersMap.get(id) || { id, username: "Member" }
          );
        } catch {
          participants = cleanParticipantIds.map((id) => ({ id, username: "Member" }));
        }
      }

      return NextResponse.json(
        {
          success: true,
          event: { ...createdEvent, participants, isFromDatabase: true },
          databaseConnected: true,
        },
        { status: 201 }
      );
    } catch (dbErr) {
      console.warn("Database create event failed (using dev in-memory fallback):", dbErr);

      const newDevEvent = {
        id: "evt-local-" + Date.now(),
        title: title.trim(),
        description: description.trim(),
        eventType: eventType.trim().toUpperCase(),
        images: cleanImages,
        participantIds: cleanParticipantIds,
        participants: cleanParticipantIds.map((id) => ({
          id,
          username: id.startsWith("usr-") ? id.replace("usr-dev-", "User ") : "Member",
        })),
        eventDate: parsedDate.toISOString(),
        location: location.trim(),
        startTime: startTime?.trim() || null,
        endTime: endTime?.trim() || null,
        status: status.trim().toUpperCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFromDatabase: false,
      };

      devEventsStore.unshift(newDevEvent);

      return NextResponse.json(
        {
          success: true,
          event: newDevEvent,
          databaseConnected: false,
        },
        { status: 201 }
      );
    }
  } catch (error: unknown) {
    console.error("Create event handler error:", error);
    const message = error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
