import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const images = await db.mediaImage.findMany({
      where: category && category !== "ALL" ? { category } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Failed to fetch images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images from database", images: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const hasCredentials =
      Boolean(process.env.CLOUDINARY_URL) ||
      Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      );

    if (!hasCredentials) {
      return NextResponse.json(
        {
          error:
            "Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env.local file.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string)?.trim() || "Untitled Image";
    const category = (formData.get("category") as string)?.trim().toUpperCase() || "GENERAL";

    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported types: JPG, PNG, WEBP, GIF, SVG." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 10MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(buffer, {
      folder: "ngo_images",
      tags: [category.toLowerCase(), "ngo"],
    });

    // Save metadata to Prisma database (with fallback for testing before DB is provisioned)
    let savedImage;
    try {
      savedImage = await db.mediaImage.create({
        data: {
          title,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          category,
          format: uploadResult.format,
          bytes: uploadResult.bytes,
          width: uploadResult.width,
          height: uploadResult.height,
        },
      });
    } catch (dbErr) {
      console.warn("Database save skipped or failed (DATABASE_URL may not be active yet):", dbErr);
      savedImage = {
        id: "temp-" + Date.now(),
        title,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        category,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
        createdAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({ success: true, image: savedImage }, { status: 201 });
  } catch (error) {
    console.error("Upload handler error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
