import Link from "next/link";
import type { CourseSummary } from "@/lib/data";
import { bannerClass, badgeClass } from "@/lib/colors";
import { ProgressBar } from "./progress-bar";

export function CourseCard({
  course,
  progressPct,
  href,
}: {
  course: CourseSummary;
  progressPct?: number;
  href?: string;
}) {
  const hours = Math.round((course.total_minutes / 60) * 10) / 10;
  return (
    <Link
      href={href ?? `/courses/${course.id}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md"
    >
      <div
        className={`relative flex h-28 items-end p-4 ${
          course.image ? "bg-zinc-200" : bannerClass(course.color)
        }`}
      >
        {course.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/media/courses/${course.image}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <span
          className={`relative rounded-full px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur ${
            course.image ? "bg-black/45" : "bg-white/20"
          }`}
        >
          {course.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-700">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-sm text-zinc-500">{course.description}</p>
        <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-zinc-500">
          <span className={`badge ${badgeClass(course.color)}`}>
            {course.lesson_count} lesson{course.lesson_count === 1 ? "" : "s"}
          </span>
          <span>{hours}h</span>
          <span className="ml-auto">{course.instructor_name}</span>
        </div>
        {progressPct !== undefined && (
          <div className="flex items-center gap-2 pt-1">
            <ProgressBar value={progressPct} className="flex-1" />
            <span className="text-xs font-medium text-zinc-600">{Math.round(progressPct)}%</span>
          </div>
        )}
      </div>
    </Link>
  );
}
