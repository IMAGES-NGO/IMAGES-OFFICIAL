import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UUID_REGEX } from "@/lib/profile";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.string().regex(UUID_REGEX, "Invalid user id"),
  role: z.enum(["ADMIN", "MEMBER"]),
});

/** Promote a member to admin or demote an admin to member. Admin only. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Administrator access required." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { userId, role } = parsed.data;

  // Prevents an admin locking themselves (and possibly everyone) out.
  if (userId === session.user.id) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }

  try {
    const target = await db.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (role === "ADMIN" && target.status !== "APPROVED") {
      return NextResponse.json({ error: "Only approved members can be made admins." }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, username: true, role: true },
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to change user role:", error);
    return NextResponse.json({ error: "Failed to change role" }, { status: 500 });
  }
}
