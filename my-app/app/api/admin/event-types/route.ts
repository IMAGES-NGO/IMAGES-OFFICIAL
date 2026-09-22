import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const eventTypes = await db.eventType.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(eventTypes);
  } catch (error) {
    console.error("Failed to fetch event types:", error);
    return NextResponse.json({ error: "Failed to fetch event types" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, points } = body;

    if (!name || typeof points !== "number") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const eventType = await db.eventType.create({
      data: { name, points },
    });

    return NextResponse.json(eventType, { status: 201 });
  } catch (error) {
    console.error("Failed to create event type:", error);
    return NextResponse.json({ error: "Failed to create event type" }, { status: 500 });
  }
}
