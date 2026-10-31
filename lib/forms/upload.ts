/** Browser-side direct upload to Cloudinary with a server-issued signature. */

export interface ClientSignature {
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

export interface UploadedImage {
  publicId: string;
  url: string;
  width: number;
  height: number;
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return `${file.name}: please use JPG, PNG, WebP or AVIF.`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name}: images must be under 10 MB.`;
  return null;
}

export async function uploadImage(file: File, sig: ClientSignature): Promise<UploadedImage> {
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", sig.apiKey);
  body.append("timestamp", String(sig.timestamp));
  body.append("folder", sig.folder);
  body.append("signature", sig.signature);
  const res = await fetch(sig.uploadUrl, { method: "POST", body });
  if (!res.ok) throw new Error(`Upload failed for ${file.name}.`);
  const data = (await res.json()) as { public_id: string; secure_url: string; width: number; height: number };
  return { publicId: data.public_id, url: data.secure_url, width: data.width, height: data.height };
}
