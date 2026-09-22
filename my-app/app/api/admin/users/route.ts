import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in to view users." },
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
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
      throw new Error("DATABASE_URL is not configured.");
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        username: "asc",
      },
    });

    return NextResponse.json({ users, databaseConnected: true });
  } catch (error) {
    console.warn("Database user query failed:", error);

    // Development fallback mock users if database is not yet provisioned
    const fallbackUsers = [
      {
        id: "usr-dev-1",
        username: "aryan_vasudev",
        email: "aryan@imagesngo.org",
        role: "ADMIN",
        status: "APPROVED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "usr-dev-2",
        username: "priya_sharma",
        email: "priya@imagesngo.org",
        role: "MEMBER",
        status: "APPROVED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "usr-dev-3",
        username: "rohit_verma",
        email: "rohit@imagesngo.org",
        role: "MEMBER",
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
      {
        id: "usr-dev-4",
        username: "ananya_singh",
        email: "ananya@imagesngo.org",
        role: "MEMBER",
        createdAt: new Date().toISOString(),
      },
      {
        id: "usr-dev-5",
        username: "karan_malhotra",
        email: "karan@imagesngo.org",
        role: "MEMBER",
        createdAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      users: fallbackUsers,
      databaseConnected: false,
      notice: "Serving mock users in development mode because database is offline.",
    });
  }
}
