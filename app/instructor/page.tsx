import Link from "next/link";
import type { Metadata } from "next";
import { coursesByInstructor } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { badgeClass } from "@/lib/colors";

export const metadata: Metadata = { title: "Instructor studio" };

export default async function InstructorPage() {
  const user = await requireUser("instructor", "admin");
  const courses = coursesByInstructor(user.id);

  const totalStudents = courses.reduce((s, c) => s + c.student_count, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Instructor studio</h1>
          <p className="mt-1 text-zinc-500">
            {courses.length} course{courses.length === 1 ? "" : "s"} · {totalStudents} enrolled
            student{totalStudents === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/instructor/courses/new" className="btn-primary">
          + New course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-zinc-600">You haven&apos;t created any courses yet.</p>
          <Link href="/instructor/courses/new" className="btn-primary mt-4">
            Create your first course
          </Link>
        </div>
      ) : (
        <div className="card mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Lessons</th>
                <th className="px-5 py-3 font-medium">Students</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-900">{course.title}</p>
                    <p className="text-xs text-zinc-500">
                      <span className={`badge mr-1 ${badgeClass(course.color)}`}>{course.level}</span>
                      {course.category}
                    </p>
                  </td>
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
                    <Link
                      href={`/instructor/courses/${course.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
