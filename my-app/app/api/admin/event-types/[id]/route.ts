import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Events reference their type by name (events.event_type), not by id, so a rename
 * must be carried over to those events, and a type still in use can't be deleted.
 * Otherwise new participants silently earn 0 points for those events.
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const { points } = body;

    if (points !== undefined && (typeof points !== "number" || !Number.isInteger(points) || points < 0)) {
      return NextResponse.json({ error: "Points must be a whole number of 0 or more." }, { status: 400 });
    }

    const eventType = await db.$transaction(async (tx) => {
      const existing = await tx.eventType.findUnique({ where: { id } });
      if (!existing) return null;

      const updated = await tx.eventType.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(typeof points === "number" && { points }),
        },
      });

      if (name && name.toUpperCase() !== existing.name.toUpperCase()) {
        await tx.event.updateMany({
          where: { eventType: { equals: existing.name, mode: "insensitive" } },
          data: { eventType: name.toUpperCase() },
        });
      }
      return updated;
    });

    if (!eventType) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 });
    }
    return NextResponse.json(eventType);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An event type with that name already exists." }, { status: 409 });
    }
    console.error("Failed to update event type:", error);
    return NextResponse.json({ error: "Failed to update event type" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await db.eventType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 });
    }

    const inUse = await db.event.count({
      where: { eventType: { equals: existing.name, mode: "insensitive" } },
    });
    if (inUse > 0) {
      return NextResponse.json(
        { error: `${inUse} event${inUse === 1 ? " uses" : "s use"} this type. Change their type before deleting it.` },
        { status: 409 }
      );
    }

    await db.eventType.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Failed to delete event type:", error);
    return NextResponse.json({ error: "Failed to delete event type" }, { status: 500 });
  }
}
