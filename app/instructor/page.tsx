import Link from "next/link";
import type { Metadata } from "next";
import { listAllCourses, listDeletedCourses } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { restoreCourse, purgeCourse } from "@/lib/actions";
import { badgeClass } from "@/lib/colors";
import { ConfirmButton } from "@/components/confirm-button";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesAdminPage() {
  const user = await requireUser("instructor", "admin");
  const courses = listAllCourses();
  const deleted = listDeletedCourses(user.id, user.role === "admin");
  const mine = courses.filter((c) => c.instructor_id === user.id).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Courses</h1>
          <p className="mt-1 text-zinc-500">
            {courses.length} course{courses.length === 1 ? "" : "s"} on the platform
            {user.role === "instructor" ? ` · ${mine} taught by you` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/instructor/scorm" className="btn-secondary">
            SCORM library
          </Link>
          <Link href="/instructor/courses/new" className="btn-primary">
            + New course
          </Link>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-zinc-600">No courses yet.</p>
          <Link href="/instructor/courses/new" className="btn-primary mt-4">
            Create the first course
          </Link>
        </div>
      ) : (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">Instructor</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Lessons</th>
                <th className="px-5 py-3 font-medium">Students</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {courses.map((course) => {
                const canManage =
                  user.role === "admin" || course.instructor_id === user.id;
                return (
                  <tr key={course.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-900">{course.title}</p>
                      <p className="text-xs text-zinc-500">
                        <span className={`badge mr-1 ${badgeClass(course.color)}`}>
                          {course.category}
                        </span>
                      </p>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{course.instructor_name}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`badge ${
                          course.published
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {course.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{course.lesson_count}</td>
                    <td className="px-5 py-3 text-zinc-600">{course.student_count}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="flex items-center justify-end gap-3">
                        <Link
                          href={`/learn/${course.id}`}
                          className="text-zinc-500 hover:text-zinc-800"
                        >
                          View
                        </Link>
                        {canManage && (
                          <Link
                            href={`/instructor/courses/${course.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            Manage →
                          </Link>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleted.length > 0 && (
        <details className="card mt-10 overflow-hidden">
          <summary className="cursor-pointer px-6 py-4 font-medium text-zinc-900 hover:bg-zinc-50">
            🗑 Recycle bin ({deleted.length})
          </summary>
          <div className="border-t border-zinc-100">
            <p className="px-6 pt-4 text-sm text-zinc-500">
              Deleted courses keep all their content and student progress until removed
              forever. Restoring puts a course back exactly as it was.
            </p>
            <ul className="divide-y divide-zinc-100 px-6 py-2">
              {deleted.map((course) => (
                <li key={course.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">{course.title}</p>
                    <p className="text-xs text-zinc-500">
                      {course.instructor_name} · {course.lesson_count} lessons ·{" "}
                      {course.student_count} students · deleted {course.deleted_at?.slice(0, 16)}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <form action={restoreCourse.bind(null, course.id)}>
                      <button className="btn-secondary">Restore</button>
                    </form>
                    <ConfirmButton
                      action={purgeCourse.bind(null, course.id)}
                      message={`Permanently delete “${course.title}”? All modules, lessons, quizzes, enrollments, and student progress will be gone for good. This cannot be undone.`}
                    >
                      Delete forever
                    </ConfirmButton>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
