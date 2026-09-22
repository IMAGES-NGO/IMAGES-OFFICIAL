import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userIds, amount, reason } = body;

    if (!Array.isArray(userIds) || userIds.length === 0 || typeof amount !== "number") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Wrap in a transaction to ensure atomic updates
    await db.$transaction(async (tx) => {
      // 1. Create point transactions for each user
      const transactionsData = userIds.map((userId) => ({
        userId,
        amount,
        reason: reason || "Manual point adjustment",
      }));
      
      await tx.pointTransaction.createMany({
        data: transactionsData,
      });

      // 2. Update users' total points
      await tx.user.updateMany({
        where: { id: { in: userIds } },
        data: {
          points: { increment: amount },
        },
      });
    });

    return NextResponse.json({ message: `Successfully awarded ${amount} points to ${userIds.length} users.` });
  } catch (error) {
    console.error("Failed to give points:", error);
    return NextResponse.json({ error: "Failed to give points" }, { status: 500 });
  }
}
