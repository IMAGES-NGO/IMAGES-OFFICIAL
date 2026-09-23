import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { devEventsStore } from "@/lib/events-store";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (UUID_REGEX.test(id) && process.env.DATABASE_URL?.trim()) {
    try {
      const event = await db.event.findUnique({
        where: { id },
      });

      if (event) {
        let participants: Array<{ id: string; username: string }> = [];
        let requestedParticipants: Array<{ id: string; username: string }> = [];
        const allIds = [...(event.participantIds || []), ...(event.requestedParticipantIds || [])];
        if (allIds.length > 0) {
          const validUuids = allIds.filter((pid) => UUID_REGEX.test(pid));
          let usersMap = new Map();
          if (validUuids.length > 0) {
            try {
              const users = await db.user.findMany({
                where: { id: { in: validUuids } },
                select: { id: true, username: true },
              });
              usersMap = new Map(users.map((u) => [u.id, u]));
            } catch (err) {
              console.warn("Failed to resolve participants:", err);
            }
          }
          participants = (event.participantIds || []).map(
            (pid) => usersMap.get(pid) || { id: pid, username: "Member" }
          );
          requestedParticipants = (event.requestedParticipantIds || []).map(
            (pid) => usersMap.get(pid) || { id: pid, username: "Member" }
          );
        }

        return NextResponse.json({
          event: { ...event, participants, requestedParticipants, isFromDatabase: true },
        });
      }
    } catch (error) {
      console.warn("Database event query failed (falling back to dev store):", error);
    }
  }

  // Development fallback store check
  const devEvent = devEventsStore.find((e) => e.id === id);
  if (devEvent) {
    return NextResponse.json({
      event: { ...devEvent, isFromDatabase: false },
    });
  }

  return NextResponse.json({ error: "Event not found." }, { status: 404 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in as an administrator to update events." },
      { status: 401 }
    );
  }

  if (session.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Administrator access required." },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      title,
      description,
      eventType,
      images,
      coverImage,
      participantIds,
      requestedParticipantIds,
      eventDate,
      location,
      startTime,
      endTime,
      status,
      attendanceMarked,
    } = body;

    const dataToUpdate: Record<string, unknown> = {};

    if (title !== undefined) dataToUpdate.title = title.trim();
    if (description !== undefined) dataToUpdate.description = description.trim();
    if (eventType !== undefined) dataToUpdate.eventType = eventType.trim().toUpperCase();
    if (images !== undefined) dataToUpdate.images = images;
    if (coverImage !== undefined) dataToUpdate.coverImage = coverImage;
    if (participantIds !== undefined) dataToUpdate.participantIds = participantIds;
    if (requestedParticipantIds !== undefined) dataToUpdate.requestedParticipantIds = requestedParticipantIds;
    if (location !== undefined) dataToUpdate.location = location.trim();
    if (startTime !== undefined) dataToUpdate.startTime = startTime ? startTime.trim() : null;
    if (endTime !== undefined) dataToUpdate.endTime = endTime ? endTime.trim() : null;
    if (status !== undefined) dataToUpdate.status = status.trim().toUpperCase();
    if (attendanceMarked !== undefined) dataToUpdate.attendanceMarked = attendanceMarked;

    if (eventDate !== undefined) {
      const parsed = new Date(eventDate);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
      }
      dataToUpdate.eventDate = parsed;
    }

    if (UUID_REGEX.test(id) && process.env.DATABASE_URL?.trim()) {
      try {
        const existingEvent = await db.event.findUnique({ where: { id } });
        if (!existingEvent) {
          return NextResponse.json({ error: "Event not found in DB." }, { status: 404 });
        }

        const updatedEvent = await db.event.update({
          where: { id },
          data: dataToUpdate,
        });

        if (participantIds !== undefined) {
          const oldIds = existingEvent.participantIds || [];
          const newIds = (participantIds as string[]).filter((pid) => !oldIds.includes(pid) && UUID_REGEX.test(pid));
          const removedIds = oldIds.filter((pid) => !(participantIds as string[]).includes(pid) && UUID_REGEX.test(pid));
          
          const eventTypeObj = await db.eventType.findFirst({
            where: { 
              name: {
                equals: updatedEvent.eventType,
                mode: 'insensitive'
              }
            }
          });
          const pointsPerUser = eventTypeObj ? eventTypeObj.points : 0;
            
          if (pointsPerUser > 0 && (newIds.length > 0 || removedIds.length > 0)) {
            await db.$transaction(async (tx) => {
              if (newIds.length > 0) {
                const transactionsData = newIds.map((userId) => ({
                  userId,
                  amount: pointsPerUser,
                  reason: `Attended Event: ${updatedEvent.title}`,
                  eventId: id
                }));
                await tx.pointTransaction.createMany({ data: transactionsData });
                await tx.user.updateMany({
                  where: { id: { in: newIds } },
                  data: { points: { increment: pointsPerUser } }
                });
              }
              if (removedIds.length > 0) {
                await tx.pointTransaction.deleteMany({
                  where: { eventId: id, userId: { in: removedIds } }
                });
                await tx.user.updateMany({
                  where: { id: { in: removedIds } },
                  data: { points: { decrement: pointsPerUser } }
                });
              }
            });
          }
        }

        let participants: Array<{ id: string; username: string }> = [];
        let requestedParticipants: Array<{ id: string; username: string }> = [];
        const allUpdatedIds = [...(updatedEvent.participantIds || []), ...(updatedEvent.requestedParticipantIds || [])];
        if (allUpdatedIds.length > 0) {
          const validUuids = allUpdatedIds.filter((pid) => UUID_REGEX.test(pid));
          let usersMap = new Map();
          if (validUuids.length > 0) {
            try {
              const users = await db.user.findMany({
                where: { id: { in: validUuids } },
                select: { id: true, username: true },
              });
              usersMap = new Map(users.map((u) => [u.id, u]));
            } catch (err) {
              console.warn("Failed to resolve participants:", err);
            }
          }
          participants = (updatedEvent.participantIds || []).map(
            (pid) => usersMap.get(pid) || { id: pid, username: "Member" }
          );
          requestedParticipants = (updatedEvent.requestedParticipantIds || []).map(
            (pid) => usersMap.get(pid) || { id: pid, username: "Member" }
          );
        }

        return NextResponse.json({
          success: true,
          event: { ...updatedEvent, participants, requestedParticipants, isFromDatabase: true },
        });
      } catch (dbErr) {
        console.warn("Database update event failed (updating in dev store):", dbErr);
      }
    }

    const devIndex = devEventsStore.findIndex((e) => e.id === id);
    if (devIndex !== -1) {
      devEventsStore[devIndex] = {
        ...devEventsStore[devIndex],
        ...dataToUpdate,
        eventDate: dataToUpdate.eventDate
          ? (dataToUpdate.eventDate as Date).toISOString()
          : devEventsStore[devIndex].eventDate,
        updatedAt: new Date().toISOString(),
      } as unknown as typeof devEventsStore[0];

      return NextResponse.json({
        success: true,
        event: { ...devEventsStore[devIndex], isFromDatabase: false },
      });
    }

    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  } catch (error: unknown) {
    console.error("Update event error:", error);
    const message = error instanceof Error ? error.message : "Failed to update event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in as an administrator to delete events." },
      { status: 401 }
    );
  }

  if (session.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Administrator access required." },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    let deleted = false;

    if (UUID_REGEX.test(id) && process.env.DATABASE_URL?.trim()) {
      try {
        await db.event.delete({
          where: { id },
        });
        deleted = true;
      } catch (dbErr) {
        console.warn("Database delete event failed (or record not in DB):", dbErr);
      }
    }

    const devIndex = devEventsStore.findIndex((e) => e.id === id);
    if (devIndex !== -1) {
      devEventsStore.splice(devIndex, 1);
      deleted = true;
    }

    if (!deleted) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Event deleted successfully." });
  } catch (error: unknown) {
    console.error("Delete event error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
