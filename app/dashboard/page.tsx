import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getEnrolledCourses } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { unenroll } from "@/lib/actions";
import { CourseCard } from "@/components/course-card";
import { ConfirmButton } from "@/components/confirm-button";

export const metadata: Metadata = { title: "My learning" };

export default async function DashboardPage() {
  const user = await requireUser();
  // Staff don't enroll; their home is the courses section.
  if (user.role !== "student") redirect("/instructor");
  const courses = getEnrolledCourses(user.id);

  const totalLessons = courses.reduce((s, c) => s + c.lesson_count, 0);
  const totalDone = courses.reduce((s, c) => s + c.completed_count, 0);
  const finished = courses.filter(
    (c) => c.lesson_count > 0 && c.completed_count >= c.lesson_count
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
        Welcome back, {user.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-zinc-500">Pick up where you left off.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Courses in progress", value: courses.length - finished },
          { label: "Courses completed", value: finished },
          { label: "Lessons completed", value: totalDone },
          { label: "Lessons remaining", value: Math.max(0, totalLessons - totalDone) },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">My courses</h2>
        <Link href="/courses" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          Browse catalog →
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-zinc-600">You haven&apos;t enrolled in any courses yet.</p>
          <Link href="/courses" className="btn-primary mt-4">
            Explore the catalog
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const pct =
              course.lesson_count > 0
                ? (course.completed_count / course.lesson_count) * 100
                : 0;
            return (
              <div key={course.id} className="flex flex-col gap-2">
                <CourseCard
                  course={course}
                  progressPct={pct}
                  href={`/learn/${course.id}`}
                />
                <ConfirmButton
                  action={unenroll.bind(null, course.id)}
                  message={
                    course.enrollment_policy === "assigned"
                      ? `Unenroll from “${course.title}”? This course is assigned by staff, so you won't be able to re-enroll yourself — you'd need an instructor or admin to add you back. Your progress is kept.`
                      : `Unenroll from “${course.title}”? Your progress will be kept.`
                  }
                  className="self-end text-xs text-zinc-400 hover:text-red-600 cursor-pointer"
                >
                  Unenroll
                </ConfirmButton>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
