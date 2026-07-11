import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { COURSE_IMAGE_ROOT, IMAGE_MIME, isValidCourseImageName } from "@/lib/media";

// Course images are shown on the public catalog, so no auth is required —
// filenames are unguessable UUIDs and the pattern check blocks traversal.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ file: string }> }
) {
  const { file } = await ctx.params;
  const name = decodeURIComponent(file);
  if (!isValidCourseImageName(name)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const filePath = path.join(COURSE_IMAGE_ROOT, name);
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(new Uint8Array(fs.readFileSync(filePath)), {
    headers: {
      "Content-Type": IMAGE_MIME[path.extname(name).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
