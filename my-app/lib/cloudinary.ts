import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

/**
 * Ensures Cloudinary is configured with latest environment variables
 */
export function configureCloudinary() {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
      secure: true,
    });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  return cloudinary;
}

// Initial configuration
configureCloudinary();

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

/**
 * Upload an image buffer directly to Cloudinary using base64 data URI
 * to ensure reliable execution in Next.js Server Components and Route Handlers.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options?: {
    folder?: string;
    publicId?: string;
    tags?: string[];
    context?: Record<string, string>;
    mimeType?: string;
  }
): Promise<CloudinaryUploadResult> {
  configureCloudinary();

  const cloudInstance = cloudinary;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || (process.env.CLOUDINARY_URL ? "URL" : null);

  if (!cloudName || cloudName === "your_cloud_name") {
    throw new Error(
      "Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env.local file."
    );
  }

  const mimeType = options?.mimeType || "image/jpeg";
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

  try {
    const result: UploadApiResponse = await cloudInstance.uploader.upload(dataUri, {
      folder: options?.folder || "ngo_images",
      public_id: options?.publicId,
      tags: options?.tags,
      context: options?.context,
      resource_type: "image",
    });

    if (!result || !result.secure_url) {
      throw new Error("Failed to receive secure URL from Cloudinary");
    }

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  } catch (error: unknown) {
    console.error("Cloudinary upload error details:", error);
    const errObj = error as { message?: string; error?: { message?: string } };
    const specificMessage =
      errObj?.error?.message || errObj?.message || "Failed to upload image to Cloudinary";
    throw new Error(specificMessage);
  }
}

/**
 * Delete an image from Cloudinary by its public ID
 */
export async function deleteFromCloudinary(publicId: string) {
  configureCloudinary();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });
}

export default cloudinary;

