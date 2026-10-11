import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { status: "REJECTED" as any },
    });

    // Explicitly do NOT send any email when rejecting a request
    return NextResponse.json({ message: "User request rejected successfully", user });
  } catch (error) {
    console.error("Failed to reject user:", error);
    return NextResponse.json({ error: "Failed to reject user" }, { status: 500 });
  }
}
