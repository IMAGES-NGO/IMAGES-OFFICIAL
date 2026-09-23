import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadToCloudinary } from "@/lib/cloudinary";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in to access media." },
      { status: 401 }
    );
  }

  if (session.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Administrator access required." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
      throw new Error("DATABASE_URL is not configured.");
    }

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
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in to upload images." },
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

    const hasCredentials =
      Boolean(process.env.CLOUDINARY_URL) ||
      Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      );

    let uploadResult: {
      secure_url: string;
      public_id: string;
      format: string;
      bytes: number;
      width: number;
      height: number;
    } | null = null;

    // 1. Primary: Upload to Cloudinary if credentials are configured
    if (hasCredentials) {
      try {
        uploadResult = await uploadToCloudinary(buffer, {
          folder: "ngo_images",
          tags: [category.toLowerCase(), "ngo"],
          context: { category, title: encodeURIComponent(title) },
          mimeType: file.type,
        });
      } catch (cloudErr) {
        console.warn("Cloudinary upload rejected or failed, engaging local storage fallback:", cloudErr);
      }
    }

    // 2. Resilient Fallback: If Cloudinary fails (e.g. 403 Forbidden, expired account, network block),
    // save locally or as a data URI so admin operations never crash or block
    if (!uploadResult) {
      const parts = file.name.split(".");
      const ext = parts.length > 1 ? parts.pop() : "png";
      const baseName = parts.join(".");
      const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `${Date.now()}-${safeBaseName}.${ext}`;

      try {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, buffer);

        uploadResult = {
          secure_url: `/uploads/${fileName}`,
          public_id: `local_${fileName}`,
          format: ext,
          bytes: file.size,
          width: 1200,
          height: 800,
        };
      } catch (fsErr) {
        console.warn("Filesystem write fallback failed, generating base64 Data URI:", fsErr);
        uploadResult = {
          secure_url: `data:${file.type};base64,${buffer.toString("base64")}`,
          public_id: `data_${Date.now()}`,
          format: ext,
          bytes: file.size,
          width: 1200,
          height: 800,
        };
      }
    }

    // Save metadata to Prisma database (with fallback for testing before DB is provisioned)
    let savedImage;
    let isFromDatabase = false;
    try {
      if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
        throw new Error("DATABASE_URL is not configured.");
      }

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
