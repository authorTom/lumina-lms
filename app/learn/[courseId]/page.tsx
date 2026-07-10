import { notFound, redirect } from "next/navigation";
import { getCourseOutline, completedLessonIds } from "@/lib/data";
import { requireUser } from "@/lib/auth";

// Entry point for a course: jump to the first incomplete lesson.
export default async function LearnIndex({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId: courseIdParam } = await params;
  const courseId = Number(courseIdParam);
  const user = await requireUser();

  const lessons = getCourseOutline(courseId).flatMap((m) => m.lessons);
  if (lessons.length === 0) notFound();

  const done = completedLessonIds(user.id, courseId);
  const next = lessons.find((l) => !done.has(l.id)) ?? lessons[0];
  redirect(`/learn/${courseId}/${next.id}`);
}
