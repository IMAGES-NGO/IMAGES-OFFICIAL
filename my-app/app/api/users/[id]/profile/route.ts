import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canViewProfile, getUserProfile, UUID_REGEX } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canViewProfile(session, id)) {
    return NextResponse.json({ error: "Forbidden. You can only view your own profile." }, { status: 403 });
  }
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    const profile = await getUserProfile(id);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
