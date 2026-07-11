import crypto from "crypto";
import fs from "fs";
import path from "path";

export const COURSE_IMAGE_ROOT = path.join(process.cwd(), "data", "uploads", "courses");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

const FILENAME_PATTERN = /^[0-9a-f-]{36}\.(png|jpe?g|webp|gif|avif)$/i;

export function isValidCourseImageName(name: string): boolean {
  return FILENAME_PATTERN.test(name);
}

// Saves an uploaded image and returns its generated filename, or an error string.
export async function saveCourseImage(file: File): Promise<{ name: string } | { error: string }> {
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Images must be 5 MB or smaller." };
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!IMAGE_MIME[ext] || !file.type.startsWith("image/")) {
    return { error: "Please upload a PNG, JPEG, WebP, GIF, or AVIF image." };
  }
  const name = `${crypto.randomUUID()}${ext}`;
  fs.mkdirSync(COURSE_IMAGE_ROOT, { recursive: true });
  fs.writeFileSync(path.join(COURSE_IMAGE_ROOT, name), Buffer.from(await file.arrayBuffer()));
  return { name };
}

export function deleteCourseImage(name: string | null | undefined) {
  if (!name || !isValidCourseImageName(name)) return;
  fs.rmSync(path.join(COURSE_IMAGE_ROOT, name), { force: true });
}
