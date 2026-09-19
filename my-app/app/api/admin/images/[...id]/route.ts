import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFromCloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string | string[] }> }
) {
  // Authentication & Authorization check:
  // In production (or whenever a database is connected), strictly require role === "ADMIN".
  // Allow unauthenticated local preview only during development before the database is provisioned.
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";
  const isDevWithoutDb = process.env.NODE_ENV === "development" && !process.env.DATABASE_URL;

  if (!isAdmin && !isDevWithoutDb) {
    return NextResponse.json(
      { error: "Unauthorized. Administrator access required." },
      { status: 401 }
    );
  }

  if (session && session.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Administrator access required." },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const fullId = Array.isArray(id) ? id.join("/") : id;
    let publicId = fullId;

    // Check if database has record (if fullId is a UUID from DB)
    try {
      const existingImage = await db.mediaImage.findUnique({
        where: { id: fullId },
      });
      if (existingImage) {
        publicId = existingImage.publicId;
        await db.mediaImage.delete({ where: { id: fullId } });
      }
    } catch (dbErr) {
      console.warn("Database lookup skipped or failed:", dbErr);
    }

    // Always delete asset from Cloudinary
    try {
      await deleteFromCloudinary(publicId);
    } catch (cloudinaryError) {
      console.warn("Cloudinary delete warning:", cloudinaryError);
    }

    return NextResponse.json({ success: true, message: "Image deleted successfully." });
  } catch (error) {
    console.error("Failed to delete image:", error);
    const message = error instanceof Error ? error.message : "Failed to delete image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
