"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import {
  UploadCloud,
  ImageIcon,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Shield,
  Layers,
  Search,
  RefreshCw,
  Database,
} from "lucide-react";

interface MediaItem {
  id: string;
  title: string;
  url: string;
  publicId: string;
  category: string;
  format: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  isFromDatabase?: boolean;
}

const CATEGORIES = ["ALL", "GENERAL", "HIGHLIGHTS", "EVENTS", "ABOUT"];

export default function AdminPage() {
  const { data: session, status } = useSession();

  // Media & Upload States
  const [images, setImages] = useState<MediaItem[]>([]);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload Form States
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Interaction States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshImages = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        selectedCategory && selectedCategory !== "ALL"
          ? `/api/admin/images?category=${selectedCategory}`
          : "/api/admin/images";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.images) {
        setImages(data.images);
        if (typeof data.databaseConnected === "boolean") {
          setIsDbConnected(data.databaseConnected);
        }
      }
    } catch (err) {
      console.error("Failed to load images", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const url =
          selectedCategory && selectedCategory !== "ALL"
            ? `/api/admin/images?category=${selectedCategory}`
            : "/api/admin/images";
        const res = await fetch(url);
        const data = await res.json();
        if (!ignore && res.ok && data.images) {
          setImages(data.images);
          if (typeof data.databaseConnected === "boolean") {
            setIsDbConnected(data.databaseConnected);
          }
        }
      } catch (err) {
        console.error("Failed to load images", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [selectedCategory]);

  // Handle file selection
  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (JPG, PNG, WebP, GIF, SVG).");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError("Image size must be under 10MB.");
      return;
    }

    setUploadError(null);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    if (!title) {
      // Auto-populate title from filename without extension
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const clearFileSelection = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError("Please select an image file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || "Untitled Image");
      formData.append("category", category);

      const res = await fetch("/api/admin/images", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed. Please try again.");
      }

      setUploadSuccess("Image uploaded and hosted successfully!");
      clearFileSelection();
      setTitle("");
      
      // Instantly show the uploaded image in the gallery
      if (data.image) {
        setImages((prev) => [data.image, ...prev.filter((item) => item.id !== data.image.id)]);
      }
      
      refreshImages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this image?")) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/admin/images/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete image.");
      }

      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting image.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredImages = images.filter((img) => {
    const matchesCategory =
      selectedCategory === "ALL" || img.category.toUpperCase() === selectedCategory;
    const matchesSearch =
      img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Site</span>
            </Link>
            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs">
                NGO
              </span>
              <h1 className="font-semibold text-base sm:text-lg">Media & Image Hub</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status === "authenticated" ? (
              <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span className="hidden sm:inline">Admin:</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {session.user?.name || session.user?.email}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Dev / Guest Mode</span>
                <Link
                  href="/login?callbackUrl=/admin"
                  className="font-semibold underline hover:text-amber-800 dark:hover:text-amber-300 ml-1"
                >
                  Log in
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-8">
        {/* Header Hero */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Centralized Image Upload & CDN
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Upload and optimize NGO assets via Cloudinary. Uploaded images are securely stored,
            globally served, and ready to be embedded anywhere on the website.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload Box */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-sky-500" />
                  Upload New Image
                </h3>
              </div>

              {uploadError && (
                <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>{uploadError}</div>
                </div>
              )}

              {uploadSuccess && (
                <div className="mb-4 flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>{uploadSuccess}</div>
                </div>
              )}

              <form onSubmit={handleUpload} className="space-y-4">
                {/* Drag and Drop Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? "border-sky-500 bg-sky-50 dark:bg-sky-950/20"
                      : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-950/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />

                  {previewUrl ? (
                    <div className="w-full">
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Upload Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="truncate max-w-[200px]">{file?.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearFileSelection();
                          }}
                          className="text-red-500 hover:underline font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <div className="rounded-full bg-zinc-200 dark:bg-zinc-800 p-3 text-zinc-600 dark:text-zinc-300 group-hover:scale-105 transition-transform">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Click or drag image here
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        JPG, PNG, WebP, GIF, or SVG (Max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Title Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Image Title / Caption
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Asra Orphanage Visit"
                    className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
                  />
                </div>

                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Category Tag
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
                  >
                    <option value="GENERAL">General Media</option>
                    <option value="HIGHLIGHTS">Highlights Carousel</option>
                    <option value="EVENTS">Events & Drives</option>
                    <option value="ABOUT">About Us</option>
                  </select>
                </div>

                {/* Upload Button */}
                <button
                  type="submit"
                  disabled={!file || isUploading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-black py-2.5 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading to Cloudinary...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      <span>Upload Image</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Centralized Gallery */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              {/* Gallery Filter & Search Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Layers className="h-5 w-5 text-sky-500" />
                    Centralized Gallery
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {filteredImages.length} {filteredImages.length === 1 ? "image" : "images"} available
                    </p>
                    {isDbConnected === false && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                        • <Database className="h-3 w-3" /> Cloudinary storage mode (DB unconfigured)
                      </span>
                    )}
                    {isDbConnected === true && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        • <Database className="h-3 w-3" /> PostgreSQL synced
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-950">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                          selectedCategory === cat
                            ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={refreshImages}
                    title="Refresh list"
                    className="p-2 rounded-xl border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-white transition"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search uploaded images by title or URL..."
                  className="w-full rounded-xl border border-zinc-200 pl-9 pr-4 py-1.5 text-xs outline-none transition focus:border-black dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
                />
              </div>

              {/* Gallery Grid */}
              <div className="pt-6">
                {loading && images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-3 text-sky-500" />
                    <p className="text-sm">Loading media library...</p>
                  </div>
                ) : filteredImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 py-16 text-center">
                    <ImageIcon className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      No images found
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                      Upload your first image using the upload form on the left.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredImages.map((img) => (
                      <div
                        key={img.id}
                        className="group overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col transition hover:shadow-md"
                      >
                        {/* Image Preview Container */}
                        <div className="relative aspect-video w-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                          <Image
                            src={img.url}
                            alt={img.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 350px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                              {img.category}
                            </span>
                            {img.isFromDatabase === false ? (
                              <span
                                title="Stored on Cloudinary (PostgreSQL not connected)"
                                className="rounded-md bg-amber-500/80 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-medium text-black flex items-center gap-1"
                              >
                                Cloudinary Only
                              </span>
                            ) : (
                              <span
                                title="Synced with Database & Cloudinary"
                                className="rounded-md bg-emerald-500/80 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-medium text-white flex items-center gap-1"
                              >
                                DB Synced
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Details */}
                        <div className="p-3.5 flex flex-col justify-between flex-1">
                          <div>
                            <h4 className="font-medium text-sm truncate text-zinc-900 dark:text-white" title={img.title}>
                              {img.title}
                            </h4>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                              {img.width && img.height && (
                                <span>{img.width}x{img.height}</span>
                              )}
                              {img.bytes && <span>• {formatBytes(img.bytes)}</span>}
                              {img.format && <span className="uppercase">• {img.format}</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                            {/* Copy URL Button */}
                            <button
                              type="button"
                              onClick={() => handleCopyUrl(img.id, img.url)}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
                                copiedId === img.id
                                  ? "bg-emerald-500 text-white"
                                  : "bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-zinc-400"
                              }`}
                            >
                              {copiedId === img.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Copied URL!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Copy URL</span>
                                </>
                              )}
                            </button>

                            {/* View Full in new tab */}
                            <a
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open original"
                              className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDelete(img.id)}
                              disabled={deletingId === img.id}
                              title="Delete image"
                              className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition disabled:opacity-50"
                            >
                              {deletingId === img.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
