import Link from "next/link";
import { redirect } from "next/navigation";
import { getCourseOutline, completedLessonIds, getCourseInstructorId } from "@/lib/data";
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

  if (lessons.length === 0) {
    // The course exists (the layout already checked) but has no content yet.
    const canManage =
      user.role === "admin" || getCourseInstructorId(courseId) === user.id;
    return (
      <div className="card p-10 text-center">
        <p className="text-lg font-medium text-zinc-900">No content yet</p>
        <p className="mt-1 text-sm text-zinc-500">
          This course doesn&apos;t have any lessons yet.
          {canManage
            ? " Add a module and some lessons to get started."
            : " Check back once the instructor has added lessons."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {canManage && (
            <Link href={`/instructor/courses/${courseId}`} className="btn-primary">
              Manage course
            </Link>
          )}
          <Link
            href={user.role === "student" ? "/dashboard" : "/instructor"}
            className="btn-secondary"
          >
            Back to courses
          </Link>
        </div>
      </div>
    );
  }

  const done = completedLessonIds(user.id, courseId);
  const next = lessons.find((l) => !done.has(l.id)) ?? lessons[0];
  redirect(`/learn/${courseId}/${next.id}`);
}
