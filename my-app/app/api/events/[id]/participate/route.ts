import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { devEventsStore } from "@/lib/events-store";
import { devFallbacksEnabled } from "@/lib/dev-fallback";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  try {
    if (UUID_REGEX.test(id) && process.env.DATABASE_URL?.trim()) {
      const event = await db.event.findUnique({
        where: { id },
      });
      if (!event) {
        return NextResponse.json({ error: "Event not found." }, { status: 404 });
      }

      // Single atomic UPDATE: appending in SQL (instead of read-modify-write in JS)
      // means two members joining at the same moment can't overwrite each other.
      // The WHERE clause also refuses duplicates and people already participating.
      const appended = await db.$executeRaw`
        UPDATE events
        SET requested_participant_ids = array_append(requested_participant_ids, ${userId}),
            updated_at = NOW()
        WHERE id = ${id}::uuid
          AND NOT (${userId} = ANY(requested_participant_ids))
          AND NOT (${userId} = ANY(participant_ids))`;

      if (appended === 0) {
        const alreadyIn = (event.participantIds || []).includes(userId);
        return NextResponse.json(
          { error: alreadyIn ? "You are already a participant in this event" : "You have already registered for this event" },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: `Your name has been sent to admin for ${event.title} event` });
    }

    if (!devFallbacksEnabled) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const devIndex = devEventsStore.findIndex((e) => e.id === id);
    if (devIndex !== -1) {
      const event = devEventsStore[devIndex];
      const requestedParticipants = (event as any).requestedParticipantIds || [];
      
      if (requestedParticipants.includes(userId)) {
        return NextResponse.json({ error: "You have already registered for this event" }, { status: 400 });
      }

      devEventsStore[devIndex] = {
        ...event,
        requestedParticipantIds: [...requestedParticipants, userId],
      } as any;

      return NextResponse.json({ message: `Your name has been sent to admin for ${event.title} event` });
    }

    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  } catch (error: unknown) {
    console.error("Participate event error:", error);
    return NextResponse.json({ error: "Failed to process participation" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id } = await params;

  try {
    if (UUID_REGEX.test(id) && process.env.DATABASE_URL?.trim()) {
      const event = await db.event.findUnique({
        where: { id },
      });
      if (!event) {
        return NextResponse.json({ error: "Event not found." }, { status: 404 });
      }

      // Atomic removal in SQL, so it can't overwrite someone else's concurrent request.
      await db.$executeRaw`
        UPDATE events
        SET requested_participant_ids = array_remove(requested_participant_ids, ${userId}),
            updated_at = NOW()
        WHERE id = ${id}::uuid`;

      return NextResponse.json({ message: `You have withdrawn from ${event.title} event` });
    }

    if (!devFallbacksEnabled) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const devIndex = devEventsStore.findIndex((e) => e.id === id);
    if (devIndex !== -1) {
      const event = devEventsStore[devIndex];
      const requestedParticipants = (event as any).requestedParticipantIds || [];
      
      devEventsStore[devIndex] = {
        ...event,
        requestedParticipantIds: requestedParticipants.filter((pId: string) => pId !== userId),
      } as any;

      return NextResponse.json({ message: `You have withdrawn from ${event.title} event` });
    }

    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  } catch (error: unknown) {
    console.error("Withdraw event error:", error);
    return NextResponse.json({ error: "Failed to process withdrawal" }, { status: 500 });
  }
}
