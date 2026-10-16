/**
 * Client-side image validation, compression, and error formatting utilities.
 */

export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate image file type and maximum size.
 */
export function validateImageFile(
  file: File,
  maxSizeMb = MAX_IMAGE_SIZE_MB
): ImageValidationResult {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  const isImageMime =
    ALLOWED_IMAGE_TYPES.includes(file.type) || file.type.startsWith("image/");
  if (!isImageMime) {
    return {
      valid: false,
      error: `"${file.name}" is not a supported image format. Supported formats: JPG, PNG, WebP, GIF, SVG.`,
    };
  }

  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" is too large (${sizeMb}MB). Maximum allowed size is ${maxSizeMb}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Automatically compress and downscale high-resolution images client-side before upload.
 * Reduces 5MB-15MB phone camera photos to ~300KB-800KB web-ready JPGs.
 * Preserves SVG and animated GIF files.
 */
export async function compressImageIfNeeded(
  file: File,
  maxDimension = 1920,
  maxTargetBytes = 2 * 1024 * 1024,
  quality = 0.82
): Promise<File> {
  // Only compress in browser environment
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  // Preserve vector and animation formats
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return file;
  }

  // If already under 1MB, no need to downscale/compress
  if (file.size <= 1024 * 1024) {
    return file;
  }

  return new Promise<File>((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;

            // If already within dimension limits and under target size, retain original
            if (
              width <= maxDimension &&
              height <= maxDimension &&
              file.size <= maxTargetBytes
            ) {
              resolve(file);
              return;
            }

            // Downscale dimensions while maintaining aspect ratio
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(file);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            const outputMime =
              file.type === "image/png" ? "image/jpeg" : file.type;
            canvas.toBlob(
              (blob) => {
                if (!blob || blob.size >= file.size) {
                  // If compressed version is not smaller, keep original
                  resolve(file);
                } else {
                  const baseName = file.name.replace(/\.[^.]+$/, "");
                  const ext = outputMime === "image/jpeg" ? "jpg" : "webp";
                  const compressedFile = new File(
                    [blob],
                    `${baseName}.${ext}`,
                    {
                      type: outputMime,
                      lastModified: Date.now(),
                    }
                  );
                  resolve(compressedFile);
                }
              },
              outputMime,
              quality
            );
          } catch {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch {
      resolve(file);
    }
  });
}

/**
 * Safely parse HTTP response errors, handling 413 (Content Too Large / Request Entity Too Large)
 * and plain text / HTML responses from reverse proxies without throwing JSON SyntaxError.
 */
export async function parseUploadResponseError(
  res: Response,
  fileName?: string
): Promise<string> {
  const prefix = fileName ? `"${fileName}": ` : "";

  if (res.status === 413) {
    return `${prefix}Image is too large for the server. Maximum allowed size is ${MAX_IMAGE_SIZE_MB}MB.`;
  }

  if (res.status === 401) {
    return `${prefix}Unauthorized. Please log in as an administrator.`;
  }

  if (res.status === 403) {
    return `${prefix}Access forbidden. Administrator privileges required.`;
  }

  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (data?.error) return `${prefix}${data.error}`;
      if (data?.message) return `${prefix}${data.message}`;
    } else {
      const text = await res.text();
      if (
        text &&
        text.length < 150 &&
        !text.includes("<html") &&
        !text.includes("<!DOCTYPE")
      ) {
        return `${prefix}${text.trim()}`;
      }
    }
  } catch {
    // Suppress parse failures and return generic status
  }

  return `${prefix}Upload failed (Status ${res.status}).`;
}
