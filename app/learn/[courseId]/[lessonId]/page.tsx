import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLesson,
  getCourseOutline,
  completedLessonIds,
  isEnrolled,
  getScormPackage,
  getScormData,
} from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { logActivity, isPrefetchRequest } from "@/lib/analytics";
import { Markdown } from "@/components/markdown";
import { CompleteButton } from "@/components/complete-button";
import { ScormPlayer } from "@/components/scorm-player";

function hostIs(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (hostIs(u.hostname, "youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) {
        return `https://www.youtube.com${u.pathname}${u.search}`;
      }
    }
    if (hostIs(u.hostname, "vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId: courseIdParam, lessonId: lessonIdParam } = await params;
  const courseId = Number(courseIdParam);
  const lessonId = Number(lessonIdParam);
  const user = await requireUser();

  const lesson = getLesson(lessonId);
  if (!lesson || lesson.course_id !== courseId) notFound();

  if (!(await isPrefetchRequest())) {
    logActivity("lesson_view", { userId: user.id, courseId, lessonId });
  }

  const flat = getCourseOutline(courseId).flatMap((m) => m.lessons);
  const index = flat.findIndex((l) => l.id === lessonId);
  const prev = index > 0 ? flat[index - 1] : null;
  const next = index < flat.length - 1 ? flat[index + 1] : null;
  const done = completedLessonIds(user.id, courseId);

  const embedUrl = lesson.video_url ? toEmbedUrl(lesson.video_url) : null;

  const scormPackage = lesson.scorm_package_id
    ? getScormPackage(lesson.scorm_package_id)
    : undefined;
  let initialCmi: Record<string, string> = {};
  if (scormPackage) {
    const saved = getScormData(user.id, lessonId);
    if (saved) {
      try {
        initialCmi = JSON.parse(saved.cmi);
      } catch {
        initialCmi = {};
      }
    }
  }

  return (
    <article>
      <p className="text-sm font-medium text-indigo-600">{lesson.module_title}</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {lesson.title}
        </h1>
        {isEnrolled(user.id, courseId) ? (
          <CompleteButton
            lessonId={lesson.id}
            courseId={courseId}
            completed={done.has(lesson.id)}
          />
        ) : (
          <span className="badge bg-amber-100 text-amber-800">Previewing</span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Lesson {index + 1} of {flat.length} · {lesson.duration_minutes} min
      </p>

      {scormPackage ? (
        <div className="mt-6">
          <ScormPlayer
            lessonId={lesson.id}
            version={scormPackage.version}
            launchUrl={`/scorm-content/${scormPackage.dir}/${scormPackage.launch_href}`}
            initialCmi={initialCmi}
            learnerId={String(user.id)}
            learnerName={user.name}
          />
        </div>
      ) : (
        <>
          {embedUrl && (
            <div className="card mt-6 aspect-video overflow-hidden">
              <iframe
                src={embedUrl}
                title={lesson.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <div className="card mt-6 p-6 sm:p-8">
            <Markdown content={lesson.content} />
          </div>
        </>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {prev ? (
          <Link href={`/learn/${courseId}/${prev.id}`} className="btn-secondary max-w-[45%]">
            ← <span className="truncate">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/learn/${courseId}/${next.id}`} className="btn-primary max-w-[45%]">
            <span className="truncate">{next.title}</span> →
          </Link>
        ) : (
          <Link href="/dashboard" className="btn-primary">
            Finish · back to dashboard
          </Link>
        )}
      </div>
    </article>
  );
}
