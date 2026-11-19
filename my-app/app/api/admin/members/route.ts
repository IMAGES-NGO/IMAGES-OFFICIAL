import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMembers } from "@/lib/members";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden. Administrator access required." }, { status: 403 });
  }

  try {
    return NextResponse.json({ members: await getMembers() });
  } catch (error) {
    console.error("Failed to load members:", error);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}
