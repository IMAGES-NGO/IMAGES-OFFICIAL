import { db } from "@/lib/db";

/**
 * Full member roster for admins: identity, profile details, points and
 * attendance. Never includes password or OTP hashes. Unverified sign-ups
 * (never finished email OTP) are excluded.
 */
export async function getMembers() {
  const [users, events] = await Promise.all([
    db.user.findMany({
      where: { status: { not: "UNVERIFIED" } },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        sid: true,
        phone: true,
        dateOfBirth: true,
        residence: true,
        points: true,
        createdAt: true,
      },
      // Admins first, then alphabetical.
      orderBy: [{ role: "asc" }, { username: "asc" }],
    }),
    db.event.findMany({ select: { participantIds: true } }),
  ]);

  const attendance = new Map<string, number>();
  for (const event of events) {
    for (const id of event.participantIds) attendance.set(id, (attendance.get(id) ?? 0) + 1);
  }

  return users.map((u) => ({ ...u, eventsAttended: attendance.get(u.id) ?? 0 }));
}

export type Member = Awaited<ReturnType<typeof getMembers>>[number];
