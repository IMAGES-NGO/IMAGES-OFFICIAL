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

    const existingImage = await db.mediaImage.findUnique({
      where: { id },
    });

    if (!existingImage) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }

    // Try deleting from Cloudinary if credentials exist
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        await deleteFromCloudinary(existingImage.publicId);
      } catch (cloudinaryError) {
        console.warn("Could not delete from Cloudinary (publicId may have changed or already deleted):", cloudinaryError);
      }
    }

    // Delete record from Prisma database
    await db.mediaImage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Image deleted successfully." });
  } catch (error) {
    console.error("Failed to delete image:", error);
    const message = error instanceof Error ? error.message : "Failed to delete image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
