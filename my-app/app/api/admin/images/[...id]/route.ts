import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string | string[] }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in to delete images." },
      { status: 401 }
    );
  }

  if (session.user?.role !== "ADMIN") {
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

    // If it's a local file asset, delete from public/uploads
    if (publicId.startsWith("local_")) {
      try {
        const fileName = publicId.replace("local_", "");
        const filePath = path.join(process.cwd(), "public", "uploads", fileName);
        await fs.unlink(filePath);
      } catch (fsErr) {
        console.warn("Could not delete local file:", fsErr);
      }
    } else if (!publicId.startsWith("data_")) {
      // Cloudinary deletion
      try {
        await deleteFromCloudinary(publicId);
      } catch (cloudinaryError) {
        console.warn("Cloudinary delete warning:", cloudinaryError);
      }
    }

    return NextResponse.json({ success: true, message: "Image deleted successfully." });
  } catch (error) {
    console.error("Failed to delete image:", error);
    const message = error instanceof Error ? error.message : "Failed to delete image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
