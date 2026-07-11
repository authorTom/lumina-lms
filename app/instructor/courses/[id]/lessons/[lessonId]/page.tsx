import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLesson, getCourseInstructorId } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { updateLesson } from "@/lib/actions";
import { ContentEditor } from "@/components/content-editor";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId: lessonIdParam } = await params;
  const courseId = Number(id);
  const lessonId = Number(lessonIdParam);
  const user = await requireUser("instructor", "admin");

  if (user.role !== "admin" && getCourseInstructorId(courseId) !== user.id) {
    redirect("/instructor");
  }

  const lesson = getLesson(lessonId);
  if (!lesson || lesson.course_id !== courseId) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/instructor/courses/${courseId}`}
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
      >
        ← Back to course
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">Edit lesson</h1>
      <p className="mt-1 text-sm text-zinc-500">{lesson.module_title}</p>

      <form action={updateLesson.bind(null, lessonId, courseId)} className="card mt-6 space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
          <div>
            <label htmlFor="title" className="label">Title</label>
            <input id="title" name="title" required defaultValue={lesson.title} className="input" />
          </div>
          <div>
            <label htmlFor="duration_minutes" className="label">Minutes</label>
            <input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min={1}
              defaultValue={lesson.duration_minutes}
              className="input"
            />
          </div>
        </div>
        <div>
          <label htmlFor="video_url" className="label">Video URL (optional)</label>
          <input
            id="video_url"
            name="video_url"
            type="url"
            defaultValue={lesson.video_url ?? ""}
            placeholder="YouTube or Vimeo link"
            className="input"
          />
        </div>
        <div>
          <span className="label">Content</span>
          <ContentEditor name="content" defaultValue={lesson.content} rows={18} />
          <p className="mt-1 text-xs text-zinc-500">
            Use the toolbar or type markdown directly; the Preview tab shows the lesson
            exactly as students will see it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary">Save lesson</button>
          <Link href={`/instructor/courses/${courseId}`} className="btn-secondary">
            Cancel
          </Link>
          <Link
            href={`/learn/${courseId}/${lessonId}`}
            className="ml-auto text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            View in lesson player →
          </Link>
        </div>
      </form>
    </div>
  );
}
