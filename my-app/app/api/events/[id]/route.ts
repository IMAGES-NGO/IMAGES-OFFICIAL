import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { devEventsStore } from "@/lib/events-store";
import { devFallbacksEnabled } from "@/lib/dev-fallback";

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
      console.warn("Database event query failed:", error);
      if (!devFallbacksEnabled) {
        return NextResponse.json({ error: "Failed to load the event. Please try again." }, { status: 500 });
      }
    }
  }

  if (!devFallbacksEnabled) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
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
    const MAX_IMAGE_STRING_LEN = 1024 * 1024; // 1MB string size guard
    if (coverImage !== undefined) {
      if (typeof coverImage === "string" && coverImage.length > MAX_IMAGE_STRING_LEN) {
        return NextResponse.json(
          { error: "Cover image exceeds maximum allowed data size limit." },
          { status: 413 }
        );
      }
      dataToUpdate.coverImage = coverImage;
    }

    if (images !== undefined) {
      if (
        Array.isArray(images) &&
        images.some((img) => typeof img === "string" && img.length > MAX_IMAGE_STRING_LEN)
      ) {
        return NextResponse.json(
          { error: "One or more gallery images exceed maximum allowed data size limit." },
          { status: 413 }
        );
      }
      dataToUpdate.images = images;
    }
    // Dedupe and keep only real user ids: a duplicate would award points twice in the
    // ledger while the user total only goes up once.
    let nextParticipantIds: string[] | undefined;
    if (participantIds !== undefined) {
      if (!Array.isArray(participantIds) || participantIds.some((pid) => typeof pid !== "string")) {
        return NextResponse.json({ error: "participantIds must be an array of user ids." }, { status: 400 });
      }
      nextParticipantIds = Array.from(new Set(participantIds as string[])).filter((pid) => UUID_REGEX.test(pid));
      dataToUpdate.participantIds = nextParticipantIds;
    }
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

        // Event update and point changes commit together, so a failure can't leave
        // participants and point totals out of sync.
        const updatedEvent = await db.$transaction(async (tx) => {
          const updated = await tx.event.update({
            where: { id },
            data: dataToUpdate,
          });

          if (nextParticipantIds !== undefined) {
            const oldIds = existingEvent.participantIds || [];
            const newIds = nextParticipantIds.filter((pid) => !oldIds.includes(pid));
            const removedIds = oldIds.filter((pid) => !nextParticipantIds.includes(pid) && UUID_REGEX.test(pid));

            if (newIds.length > 0) {
              const eventTypeObj = await tx.eventType.findFirst({
                where: { name: { equals: updated.eventType, mode: "insensitive" } },
              });
              const pointsPerUser = eventTypeObj?.points ?? 0;
              if (pointsPerUser > 0) {
                await tx.pointTransaction.createMany({
                  data: newIds.map((userId) => ({
                    userId,
                    amount: pointsPerUser,
                    reason: `Attended Event: ${updated.title}`,
                    eventId: id,
                  })),
                });
                await tx.user.updateMany({
                  where: { id: { in: newIds } },
                  data: { points: { increment: pointsPerUser } },
                });
              }
            }

            if (removedIds.length > 0) {
              // Reverse exactly what the ledger says was awarded for this event, not the
              // event type's current value (which may have changed or been deleted since).
              const awarded = await tx.pointTransaction.groupBy({
                by: ["userId"],
                where: { eventId: id, userId: { in: removedIds } },
                _sum: { amount: true },
              });
              await tx.pointTransaction.deleteMany({
                where: { eventId: id, userId: { in: removedIds } },
              });
              for (const row of awarded) {
                const total = row._sum.amount ?? 0;
                if (total !== 0) {
                  await tx.user.update({
                    where: { id: row.userId },
                    data: { points: { decrement: total } },
                  });
                }
              }
            }
          }

          return updated;
        });

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
        console.warn("Database update event failed:", dbErr);
        // Previously this fell through to the dev store and answered "Event not found",
        // hiding the real failure from the admin.
        if (!devFallbacksEnabled) {
          return NextResponse.json({ error: "Failed to save the event. Please try again." }, { status: 500 });
        }
      }
    }

    if (!devFallbacksEnabled) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
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
        if (dbErr instanceof Prisma.PrismaClientKnownRequestError && dbErr.code === "P2025") {
          // Not in the database; may still be a dev-store event below.
        } else {
          console.warn("Database delete event failed:", dbErr);
          if (!devFallbacksEnabled) {
            return NextResponse.json({ error: "Failed to delete the event. Please try again." }, { status: 500 });
          }
        }
      }
    }

    if (!devFallbacksEnabled && !deleted) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
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
