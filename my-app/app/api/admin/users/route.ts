import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";
  const isDevWithoutDb = process.env.NODE_ENV === "development" && !process.env.DATABASE_URL;

  if (!isAdmin && !isDevWithoutDb) {
    return NextResponse.json(
      { error: "Unauthorized. Administrator access required." },
      { status: 401 }
    );
  }

  if (session && session.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Administrator access required." },
      { status: 403 }
    );
  }

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
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
        createdAt: new Date().toISOString(),
      },
      {
        id: "usr-dev-2",
        username: "priya_sharma",
        email: "priya@imagesngo.org",
        role: "MEMBER",
        createdAt: new Date().toISOString(),
      },
      {
        id: "usr-dev-3",
        username: "rohit_verma",
        email: "rohit@imagesngo.org",
        role: "MEMBER",
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
