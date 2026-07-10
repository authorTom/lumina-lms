import Link from "next/link";
import { notFound } from "next/navigation";
import { getLesson, getCourseOutline, completedLessonIds } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { Markdown } from "@/components/markdown";
import { CompleteButton } from "@/components/complete-button";

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.endsWith("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    if (u.hostname.endsWith("vimeo.com")) {
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

  const flat = getCourseOutline(courseId).flatMap((m) => m.lessons);
  const index = flat.findIndex((l) => l.id === lessonId);
  const prev = index > 0 ? flat[index - 1] : null;
  const next = index < flat.length - 1 ? flat[index + 1] : null;
  const done = completedLessonIds(user.id, courseId);

  const embedUrl = lesson.video_url ? toEmbedUrl(lesson.video_url) : null;

  return (
    <article>
      <p className="text-sm font-medium text-indigo-600">{lesson.module_title}</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {lesson.title}
        </h1>
        <CompleteButton
          lessonId={lesson.id}
          courseId={courseId}
          completed={done.has(lesson.id)}
        />
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Lesson {index + 1} of {flat.length} · {lesson.duration_minutes} min
      </p>

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
