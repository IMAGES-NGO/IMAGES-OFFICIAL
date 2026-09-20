import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

/**
 * Normalizes and configures Cloudinary credentials from environment variables
 */
export function configureCloudinary() {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim().replace(/^["']+|["']+$/g, "") || undefined;
  let apiKey = process.env.CLOUDINARY_API_KEY?.trim().replace(/^["']+|["']+$/g, "") || undefined;
  let apiSecret = process.env.CLOUDINARY_API_SECRET?.trim().replace(/^["']+|["']+$/g, "") || undefined;

  const rawUrl = process.env.CLOUDINARY_URL?.trim().replace(/^["']+|["']+$/g, "");
  if (rawUrl) {
    const match = rawUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      apiKey = apiKey || match[1];
      apiSecret = apiSecret || match[2];
      cloudName = cloudName || match[3].split(/[/?#]/)[0];
    }
    process.env.CLOUDINARY_URL = rawUrl;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return { cloudinary, cloudName, apiKey, apiSecret };
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
 * with automatic parameter fallback for strict account permission tiers.
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
  const { cloudName } = configureCloudinary();

  if (!cloudName || cloudName === "your_cloud_name") {
    throw new Error(
      "Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env.local file."
    );
  }

  const mimeType = options?.mimeType || "image/jpeg";
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(dataUri, {
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
    const errObj = error as { message?: string; error?: { message?: string }; http_code?: number };
    const errMsg = String(errObj?.error?.message || errObj?.message || error);

    // If Cloudinary rejected due to 403 Forbidden, permission, or metadata restrictions, retry with barebones parameters
    if (errMsg.includes("403") || errMsg.includes("Forbidden") || errMsg.includes("context") || errMsg.includes("folder")) {
      try {
        console.warn("Retrying Cloudinary upload with minimal parameters due to permission error:", errMsg);
        const retryResult: UploadApiResponse = await cloudinary.uploader.upload(dataUri, {
          resource_type: "image",
        });

        if (retryResult && retryResult.secure_url) {
          return {
            secure_url: retryResult.secure_url,
            public_id: retryResult.public_id,
            format: retryResult.format,
            bytes: retryResult.bytes,
            width: retryResult.width,
            height: retryResult.height,
          };
        }
      } catch (retryError) {
        console.warn("Cloudinary minimal retry also failed:", retryError);
      }
    }

    console.error("Cloudinary upload error details:", error);
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
