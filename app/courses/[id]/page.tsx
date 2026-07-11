import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCourse,
  getCourseOutline,
  isEnrolled,
  countCompletedLessons,
  getCourseInstructorId,
} from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { enroll } from "@/lib/actions";
import { logActivity } from "@/lib/analytics";
import { bannerClass } from "@/lib/colors";
import { ProgressBar } from "@/components/progress-bar";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const courseId = Number(id);
  const course = getCourse(courseId);
  if (!course) notFound();

  const user = await getCurrentUser();
  const enrolled = user ? isEnrolled(user.id, courseId) : false;
  const isStaff = !!user && (user.role === "admin" || user.role === "instructor");
  const canManage =
    !!user && (user.role === "admin" || getCourseInstructorId(courseId) === user.id);
  // Drafts are visible to staff (who can view all content); hidden from everyone else.
  if (!course.published && !isStaff) notFound();

  logActivity("course_view", { userId: user?.id, courseId });
  const outline = getCourseOutline(courseId);
  const completed = user && enrolled ? countCompletedLessons(user.id, courseId) : 0;
  const progressPct = course.lesson_count > 0 ? (completed / course.lesson_count) * 100 : 0;
  const hours = Math.round((course.total_minutes / 60) * 10) / 10;

  const enrollWithId = enroll.bind(null, courseId);

  return (
    <div>
      <div
        className={`relative text-white ${
          course.image ? "bg-zinc-900" : bannerClass(course.color)
        }`}
      >
        {course.image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/courses/${course.image}`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/55" />
          </>
        )}
        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <p className="text-sm font-medium text-white/80">{course.category}</p>
          <h1 className="mt-1 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-3 max-w-2xl text-white/90">{course.description}</p>
          <p className="mt-4 text-sm text-white/80">
            Taught by <span className="font-medium text-white">{course.instructor_name}</span> ·{" "}
            {course.lesson_count} lessons · {hours} hours · {course.student_count} enrolled
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Course content</h2>
          <div className="mt-4 space-y-4">
            {outline.map((mod, mi) => (
              <div key={mod.id} className="card overflow-hidden">
                <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                  <h3 className="font-medium text-zinc-900">
                    Module {mi + 1}: {mod.title}
                  </h3>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {mod.lessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                      <span className="text-zinc-400">▶</span>
                      <span className="text-zinc-700">{lesson.title}</span>
                      <span className="ml-auto text-xs text-zinc-400">
                        {lesson.duration_minutes} min
                      </span>
                    </li>
                  ))}
                  {mod.quiz && (
                    <li className="flex items-center gap-3 px-5 py-3 text-sm">
                      <span className="text-zinc-400">✎</span>
                      <span className="text-zinc-700">{mod.quiz.title}</span>
                      <span className="badge ml-auto bg-violet-100 text-violet-800">Quiz</span>
                    </li>
                  )}
                </ul>
              </div>
            ))}
            {outline.length === 0 && (
              <p className="card p-6 text-sm text-zinc-500">
                The instructor hasn&apos;t added content yet.
              </p>
            )}
          </div>
        </section>

        <aside>
          <div className="card sticky top-20 p-6">
            {enrolled ? (
              <>
                <p className="text-sm font-medium text-zinc-700">Your progress</p>
                <div className="mt-2 flex items-center gap-3">
                  <ProgressBar value={progressPct} className="flex-1" />
                  <span className="text-sm font-medium text-zinc-700">
                    {Math.round(progressPct)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {completed} of {course.lesson_count} lessons completed
                </p>
                <Link href={`/learn/${course.id}`} className="btn-primary mt-4 w-full">
                  {completed > 0 ? "Continue learning" : "Start course"}
                </Link>
              </>
            ) : isStaff ? (
              <>
                <p className="text-sm font-medium text-zinc-700">Staff access</p>
                <p className="mt-1 text-sm text-zinc-500">
                  View all content without enrolling.
                </p>
                <Link href={`/learn/${course.id}`} className="btn-primary mt-4 w-full">
                  View content
                </Link>
                {canManage && (
                  <Link href={`/instructor/courses/${course.id}`} className="btn-secondary mt-2 w-full">
                    Manage course
                  </Link>
                )}
              </>
            ) : course.enrollment_policy === "assigned" ? (
              <>
                <p className="text-sm font-medium text-zinc-700">Enrollment by allocation</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Access to this course is assigned by an instructor or administrator.
                  {user
                    ? " If you think you should have access, contact your instructor."
                    : " Log in to check whether it has been assigned to you."}
                </p>
                {!user && (
                  <Link href="/login" className="btn-secondary mt-4 w-full">
                    Log in
                  </Link>
                )}
              </>
            ) : user ? (
              <>
                <p className="text-2xl font-bold text-zinc-900">Free</p>
                <p className="mt-1 text-sm text-zinc-500">Full access to all lessons and quizzes.</p>
                <form action={enrollWithId}>
                  <button type="submit" className="btn-primary mt-4 w-full">
                    Enroll now
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-zinc-900">Free</p>
                <p className="mt-1 text-sm text-zinc-500">Create an account to enroll.</p>
                <Link href="/register" className="btn-primary mt-4 w-full">
                  Sign up to enroll
                </Link>
                <Link href="/login" className="btn-secondary mt-2 w-full">
                  Log in
                </Link>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
