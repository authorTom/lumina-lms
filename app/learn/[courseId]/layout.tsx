import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCourse, getCourseOutline, completedLessonIds, bestAttempts, isEnrolled } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { ProgressBar } from "@/components/progress-bar";

export default async function LearnLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId: courseIdParam } = await params;
  const courseId = Number(courseIdParam);
  const user = await requireUser();

  const course = getCourse(courseId);
  if (!course) notFound();
  if (!isEnrolled(user.id, courseId)) redirect(`/courses/${courseId}`);

  const outline = getCourseOutline(courseId);
  const done = completedLessonIds(user.id, courseId);
  const quizScores = bestAttempts(user.id, courseId);
  const progressPct =
    course.lesson_count > 0 ? (done.size / course.lesson_count) * 100 : 0;

  const sidebar = (
    <nav aria-label="Course outline">
      <Link
        href={`/courses/${courseId}`}
        className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
      >
        ← Course overview
      </Link>
      <h2 className="mt-1 font-semibold text-zinc-900">{course.title}</h2>
      <div className="mt-2 flex items-center gap-2">
        <ProgressBar value={progressPct} className="flex-1" />
        <span className="text-xs font-medium text-zinc-600">{Math.round(progressPct)}%</span>
      </div>

      <div className="mt-4 space-y-4">
        {outline.map((mod, mi) => (
          <div key={mod.id}>
            <p className="px-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Module {mi + 1} · {mod.title}
            </p>
            <ul className="mt-1 space-y-0.5">
              {mod.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/learn/${courseId}/${lesson.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
                  >
                    <span
                      className={`grid size-4 shrink-0 place-items-center rounded-full text-[10px] ${
                        done.has(lesson.id)
                          ? "bg-emerald-500 text-white"
                          : "ring-1 ring-zinc-300"
                      }`}
                    >
                      {done.has(lesson.id) ? "✓" : ""}
                    </span>
                    <span className="truncate">{lesson.title}</span>
                  </Link>
                </li>
              ))}
              {mod.quiz && (
                <li>
                  <Link
                    href={`/learn/${courseId}/quiz/${mod.quiz.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
                  >
                    <span
                      className={`grid size-4 shrink-0 place-items-center rounded-full text-[10px] ${
                        quizScores.get(mod.quiz.id)?.passed
                          ? "bg-emerald-500 text-white"
                          : "ring-1 ring-violet-300"
                      }`}
                    >
                      {quizScores.get(mod.quiz.id)?.passed ? "✓" : "?"}
                    </span>
                    <span className="truncate">{mod.quiz.title}</span>
                    {quizScores.has(mod.quiz.id) && (
                      <span className="ml-auto text-xs text-zinc-400">
                        {quizScores.get(mod.quiz.id)!.score_pct}%
                      </span>
                    )}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          {sidebar}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <details className="card mb-4 p-4 lg:hidden">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700">
            Course outline · {Math.round(progressPct)}% complete
          </summary>
          <div className="mt-3">{sidebar}</div>
        </details>
        {children}
      </div>
    </div>
  );
}
