import { db } from "@/lib/db";
import { RESIDENCE_LABELS } from "@/lib/validations/profile";

/**
 * Flat, analysis-ready rows for the admin analytics page. Column names are
 * human-readable because Perspective shows them directly. Contact details
 * (email, phone) and exact dates of birth are deliberately left out.
 */

const month = (d: Date) => d.toISOString().slice(0, 7); // "2026-09"
const day = (d: Date) => d.toISOString().slice(0, 10); // "2026-09-15"

function ageFrom(dob: Date | null, now: Date) {
  if (!dob) return null;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** PEC SIDs start with the two-digit admission year, e.g. 23104012 -> 2023. */
const batchFromSid = (sid: string | null) => (sid && /^\d{8}$/.test(sid) ? `20${sid.slice(0, 2)}` : "Unknown");

export async function getAnalytics() {
  const now = new Date();

  const [users, events, transactions] = await Promise.all([
    db.user.findMany({
      where: { status: { not: "UNVERIFIED" } },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        points: true,
        createdAt: true,
        sid: true,
        phone: true,
        dateOfBirth: true,
        residence: true,
      },
    }),
    db.event.findMany({
      select: {
        id: true,
        title: true,
        eventType: true,
        status: true,
        eventDate: true,
        participantIds: true,
        requestedParticipantIds: true,
        attendanceMarked: true,
      },
    }),
    db.pointTransaction.findMany({
      select: {
        amount: true,
        reason: true,
        createdAt: true,
        user: { select: { username: true } },
        event: { select: { eventType: true } },
      },
    }),
  ]);

  const attendance = new Map<string, number>();
  for (const event of events) {
    for (const userId of event.participantIds) {
      attendance.set(userId, (attendance.get(userId) ?? 0) + 1);
    }
  }

  const members = users.map((u) => ({
    Member: u.username,
    Role: u.role,
    Status: u.status,
    Residence: u.residence ? RESIDENCE_LABELS[u.residence] : "Not provided",
    Batch: batchFromSid(u.sid),
    Age: ageFrom(u.dateOfBirth, now),
    Points: u.points,
    "Events Attended": attendance.get(u.id) ?? 0,
    Joined: day(u.createdAt),
    "Joined Month": month(u.createdAt),
    Count: 1,
  }));

  const eventRows = events.map((e) => ({
    Event: e.title,
    Type: e.eventType,
    Status: e.status,
    Date: day(e.eventDate),
    Month: month(e.eventDate),
    Participants: e.participantIds.length,
    "Pending Requests": e.requestedParticipantIds.length,
    "Attendance Marked": e.attendanceMarked ? "Yes" : "No",
    Count: 1,
  }));

  const ledger = transactions.map((t) => ({
    Member: t.user.username,
    Amount: t.amount,
    Kind: t.amount >= 0 ? "Awarded" : "Deducted",
    Reason: t.reason,
    "Event Type": t.event?.eventType ?? "Manual",
    Date: day(t.createdAt),
    Month: month(t.createdAt),
    Count: 1,
  }));

  const approved = users.filter((u) => u.status === "APPROVED");
  const completeProfiles = approved.filter((u) => u.sid && u.phone && u.dateOfBirth && u.residence).length;
  const pointsAwarded = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

  const residence = { DAY_SCHOLAR: 0, HOSTELLER: 0, NOT_PROVIDED: 0 };
  for (const u of approved) residence[u.residence ?? "NOT_PROVIDED"] += 1;

  return {
    generatedAt: now.toISOString(),
    summary: {
      approvedMembers: approved.length,
      admins: approved.filter((u) => u.role === "ADMIN").length,
      pendingApprovals: users.filter((u) => u.status === "PENDING").length,
      totalEvents: events.length,
      upcomingEvents: events.filter((e) => e.status === "UPCOMING").length,
      pointsAwarded,
      avgPointsPerMember: approved.length ? Math.round(approved.reduce((s, u) => s + u.points, 0) / approved.length) : 0,
      profileCompletion: approved.length ? Math.round((completeProfiles / approved.length) * 100) : 0,
      residence,
    },
    tables: { members, events: eventRows, ledger },
  };
}

export type AnalyticsPayload = Awaited<ReturnType<typeof getAnalytics>>;
