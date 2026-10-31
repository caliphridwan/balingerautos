import "server-only";
import { createHash } from "node:crypto";

/**
 * Cloudinary via its REST API (no SDK). Browsers upload directly with a
 * short-lived signature; the server then VERIFIES each uploaded asset via the
 * Admin API (format, size, folder) before storing its URL.
 */

export type UploadScope = "vehicles" | "content" | "trade-ins";

const ALLOWED_FORMATS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function config() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret, root: (process.env.CLOUDINARY_FOLDER || "balinger").replace(/[^a-z0-9_-]/gi, "") };
}

export function isCloudinaryConfigured(): boolean {
  return config() !== null;
}

function sign(params: Record<string, string | number>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + secret).digest("hex");
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

export function createUploadSignature(scope: UploadScope): UploadSignature | null {
  const c = config();
  if (!c) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `${c.root}/${scope}`;
  return {
    cloudName: c.cloudName,
    apiKey: c.apiKey,
    timestamp,
    folder,
    signature: sign({ folder, timestamp }, c.apiSecret),
    uploadUrl: `https://api.cloudinary.com/v1_1/${c.cloudName}/image/upload`,
  };
}

export interface VerifiedAsset {
  publicId: string;
  url: string;
  width: number;
  height: number;
}

/** Confirms an uploaded image exists in our account, in the expected folder, with an allowed format and size. */
export async function verifyAsset(publicId: string, scope: UploadScope): Promise<VerifiedAsset | null> {
  const c = config();
  if (!c) return null;
  if (!/^[\w\-/]+$/.test(publicId) || !publicId.startsWith(`${c.root}/${scope}/`)) return null;
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${c.cloudName}/resources/image/upload/${publicId.split("/").map(encodeURIComponent).join("/")}`,
    {
      headers: { Authorization: `Basic ${Buffer.from(`${c.apiKey}:${c.apiSecret}`).toString("base64")}` },
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { public_id: string; secure_url: string; format: string; bytes: number; width: number; height: number };
  if (!ALLOWED_FORMATS.has(data.format.toLowerCase()) || data.bytes > MAX_UPLOAD_BYTES) {
    await deleteAsset(data.public_id);
    return null;
  }
  return { publicId: data.public_id, url: data.secure_url, width: data.width, height: data.height };
}

export async function deleteAsset(publicId: string): Promise<void> {
  const c = config();
  if (!c) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: c.apiKey,
    signature: sign({ public_id: publicId, timestamp }, c.apiSecret),
  });
  try {
    await fetch(`https://api.cloudinary.com/v1_1/${c.cloudName}/image/destroy`, { method: "POST", body, cache: "no-store" });
  } catch (error) {
    console.error("[cloudinary] delete failed", publicId, error);
  }
}

/** True if a URL points at an image in this Cloudinary account. */
export function isOwnCloudinaryUrl(url: string): boolean {
  const c = config();
  if (!c) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "res.cloudinary.com" && u.pathname.startsWith(`/${c.cloudName}/image/upload/`);
  } catch {
    return false;
  }
}
