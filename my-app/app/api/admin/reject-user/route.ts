import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UUID_REGEX } from "@/lib/profile";

/** Fields safe to send back to the browser; never the password or OTP hashes. */
const PUBLIC_USER_FIELDS = { id: true, username: true, email: true, role: true, status: true } as const;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = (await request.json().catch(() => ({}))) as { userId?: unknown };
    if (typeof userId !== "string" || !UUID_REGEX.test(userId)) {
      return NextResponse.json({ error: "A valid user ID is required" }, { status: 400 });
    }
    if (userId === session.user.id) {
      return NextResponse.json({ error: "You cannot reject your own account." }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { status: "REJECTED" },
      select: PUBLIC_USER_FIELDS,
    });

    // Explicitly do NOT send any email when rejecting a request
    return NextResponse.json({ message: "User request rejected successfully", user });
  } catch (error) {
    console.error("Failed to reject user:", error);
    return NextResponse.json({ error: "Failed to reject user" }, { status: 500 });
  }
}
