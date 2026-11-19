import type { Session } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { profileUpdateSchema } from "@/lib/validations/profile";

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
      sid: true,
      phone: true,
      dateOfBirth: true,
      residence: true,
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

type UpdateResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; status: number; error: string; fieldErrors?: Record<string, string[] | undefined> };

/**
 * Validates and applies a profile details update (SID, phone, DOB, residence).
 * Fields left out of `body` are untouched; empty strings clear a field.
 */
export async function updateUserProfile(userId: string, body: unknown): Promise<UpdateResult> {
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { sid, phone, dateOfBirth, residence } = parsed.data;
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        sid,
        phone,
        residence,
        dateOfBirth: dateOfBirth === undefined ? undefined : dateOfBirth === null ? null : new Date(dateOfBirth),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { ok: false, status: 409, error: "This SID is already linked to another account.", fieldErrors: { sid: ["SID already in use"] } };
      }
      if (error.code === "P2025") {
        return { ok: false, status: 404, error: "User not found" };
      }
    }
    throw error;
  }

  const profile = await getUserProfile(userId);
  if (!profile) return { ok: false, status: 404, error: "User not found" };
  return { ok: true, profile };
}
