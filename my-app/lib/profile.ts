import type { Session } from "next-auth";
import { db } from "@/lib/db";

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A profile is visible only to its owner and to admins. */
export function canViewProfile(session: Session | null, userId: string) {
  if (!session?.user) return false;
  return session.user.role === "ADMIN" || session.user.id === userId;
}

export async function getUserProfile(userId: string) {
  if (!UUID_REGEX.test(userId)) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      points: true,
      verifiedAt: true,
      createdAt: true,
      pointTransactions: {
        orderBy: { createdAt: "desc" },
        select: { id: true, amount: true, reason: true, eventId: true, createdAt: true },
      },
    },
  });
  if (!user) return null;

  const events = await db.event.findMany({
    where: { participantIds: { has: userId } },
    orderBy: { eventDate: "desc" },
    select: { id: true, title: true, eventType: true, eventDate: true, location: true, status: true },
  });

  const { pointTransactions, ...profile } = user;
  return {
    ...profile,
    history: pointTransactions,
    events,
    stats: {
      eventsAttended: events.length,
      totalEarned: pointTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
      totalDeducted: pointTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0),
    },
  };
}

export type UserProfile = NonNullable<Awaited<ReturnType<typeof getUserProfile>>>;
