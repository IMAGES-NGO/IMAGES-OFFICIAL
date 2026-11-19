import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendApprovalEmail } from "@/lib/email";
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

    const existing = await db.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    // Only users who verified their email (PENDING) can be approved.
    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: `Only pending requests can be approved (this user is ${existing.status}).` }, { status: 400 });
    }

    // Approval always grants MEMBER. Older signups could request ADMIN; that request
    // is ignored here. Promote deliberately via /api/admin/set-role instead.
    const user = await db.user.update({
      where: { id: userId },
      data: { status: "APPROVED", role: "MEMBER" },
      select: PUBLIC_USER_FIELDS,
    });

    try {
      await sendApprovalEmail(user.email, user.username);
    } catch (emailError) {
      // Approval still stands; the email is a courtesy.
      console.error("Failed to send approval email:", emailError);
    }

    return NextResponse.json({ message: "User approved successfully", user });
  } catch (error) {
    console.error("Failed to approve user:", error);
    return NextResponse.json({ error: "Failed to approve user" }, { status: 500 });
  }
}
