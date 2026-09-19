import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteFromCloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let publicId = id;

    // Check if database has record
    try {
      const existingImage = await db.mediaImage.findUnique({
        where: { id },
      });
      if (existingImage) {
        publicId = existingImage.publicId;
        await db.mediaImage.delete({ where: { id } });
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
