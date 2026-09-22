import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendApprovalEmail } from "@/lib/email";

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

    // @ts-ignore - status is added in schema
    const user = await db.user.update({
      where: { id: userId },
      data: { status: "APPROVED" },
    });

    try {
      await sendApprovalEmail(user.email, user.username);
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
      // We still return success but maybe log a warning
    }

    return NextResponse.json({ message: "User approved successfully", user });
  } catch (error) {
    console.error("Failed to approve user:", error);
    return NextResponse.json({ error: "Failed to approve user" }, { status: 500 });
  }
}
