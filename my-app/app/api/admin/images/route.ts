import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    const images = await db.mediaImage.findMany({
      where: category && category !== "ALL" ? { category } : undefined,
      orderBy: { createdAt: "desc" },
    });

    // Database query succeeded - return database records
    return NextResponse.json({
      images: images.map((img) => ({ ...img, isFromDatabase: true })),
      databaseConnected: true,
    });
  } catch (error) {
    console.warn("Database query failed (DATABASE_URL may not be configured yet):", error);
  }

  // Fallback: Query Cloudinary directly so uploaded images are visible even without DB
  try {
    const { v2: cloudinary } = await import("cloudinary");
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "ngo_images",
      tags: true,
      context: true,
      max_results: 50,
    });

    let fallbackImages = (result.resources || []).map((res: {
      public_id: string;
      secure_url: string;
      format: string;
      bytes: number;
      width: number;
      height: number;
      created_at: string;
      tags?: string[];
      context?: { custom?: { category?: string; title?: string } };
    }) => {
      const cleanTitle = res.context?.custom?.title
        ? decodeURIComponent(res.context.custom.title)
        : res.public_id.replace(/^ngo_images\//, "").replace(/[-_]/g, " ");

      const tagCategory = (res.tags || []).find((t: string) =>
        ["general", "highlights", "events", "about"].includes(t.toLowerCase())
      );
      const cat =
        res.context?.custom?.category || (tagCategory ? tagCategory.toUpperCase() : "GENERAL");

      return {
        id: res.public_id,
        title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
        url: res.secure_url,
        publicId: res.public_id,
        category: cat,
        format: res.format,
        bytes: res.bytes,
        width: res.width,
        height: res.height,
        createdAt: res.created_at,
        isFromDatabase: false,
      };
    });

    // Apply category filtering in fallback mode
    if (category && category !== "ALL") {
      fallbackImages = fallbackImages.filter(
        (img: { category: string }) => img.category.toUpperCase() === category.toUpperCase()
      );
    }

    return NextResponse.json({ images: fallbackImages, databaseConnected: false });
  } catch (cloudinaryErr) {
    console.warn("Cloudinary direct fetch error:", cloudinaryErr);
    return NextResponse.json({ images: [], databaseConnected: false });
  }
}

export async function POST(request: NextRequest) {
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
    const hasCredentials =
      Boolean(process.env.CLOUDINARY_URL) ||
      Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      );

    if (!hasCredentials) {
      return NextResponse.json(
        {
          error:
            "Cloudinary credentials are not configured or still set to placeholder values. Please set valid CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env.local file.",
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

    // Upload to Cloudinary with tags and context metadata
    const uploadResult = await uploadToCloudinary(buffer, {
      folder: "ngo_images",
      tags: [category.toLowerCase(), "ngo"],
      context: { category, title: encodeURIComponent(title) },
      mimeType: file.type,
    });

    // Save metadata to Prisma database (with fallback for testing before DB is provisioned)
    let savedImage;
    let isFromDatabase = false;
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
      isFromDatabase = true;
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
      isFromDatabase = false;
    }

    return NextResponse.json(
      {
        success: true,
        image: { ...savedImage, isFromDatabase },
        databaseConnected: isFromDatabase,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Upload handler error:", error);
    const errObj = error as { message?: string; error?: { message?: string } };
    const message =
      errObj?.error?.message ||
      errObj?.message ||
      (error instanceof Error ? error.message : "Failed to upload image");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
