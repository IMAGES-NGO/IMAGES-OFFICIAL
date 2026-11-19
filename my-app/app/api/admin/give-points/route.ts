import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UUID_REGEX } from "@/lib/profile";

const MAX_ABS_AMOUNT = 10_000;

const bodySchema = z.object({
  userIds: z.array(z.string().regex(UUID_REGEX)).min(1).max(1000),
  amount: z
    .number()
    .int("Points must be a whole number")
    .refine((n) => n !== 0, "Points cannot be zero")
    .refine((n) => Math.abs(n) <= MAX_ABS_AMOUNT, `Points must be between -${MAX_ABS_AMOUNT} and ${MAX_ABS_AMOUNT}`),
  reason: z.string().trim().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  // A duplicated id would create two ledger rows but only one increment, so dedupe first.
  const userIds = Array.from(new Set(parsed.data.userIds));
  const { amount } = parsed.data;
  const reason = parsed.data.reason || "Manual point adjustment";

  try {
    const count = await db.$transaction(async (tx) => {
      // Only award to real, approved accounts; skip anything else rather than half-applying.
      const targets = await tx.user.findMany({
        where: { id: { in: userIds }, status: "APPROVED" },
        select: { id: true },
      });
      const ids = targets.map((t) => t.id);
      if (ids.length === 0) return 0;

      await tx.pointTransaction.createMany({
        data: ids.map((userId) => ({ userId, amount, reason })),
      });
      await tx.user.updateMany({
        where: { id: { in: ids } },
        data: { points: { increment: amount } },
      });
      return ids.length;
    });

    if (count === 0) {
      return NextResponse.json({ error: "None of the selected users are approved members." }, { status: 400 });
    }

    const skipped = userIds.length - count;
    return NextResponse.json({
      message: `Successfully awarded ${amount} points to ${count} user${count === 1 ? "" : "s"}.${skipped ? ` Skipped ${skipped} not-approved user${skipped === 1 ? "" : "s"}.` : ""}`,
    });
  } catch (error) {
    console.error("Failed to give points:", error);
    return NextResponse.json({ error: "Failed to give points" }, { status: 500 });
  }
}
