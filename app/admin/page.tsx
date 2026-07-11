import Link from "next/link";
import type { Metadata } from "next";
import { listAllCourses, listUsers, platformStats } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { deleteCourse, deleteUser } from "@/lib/actions";
import { badgeClass } from "@/lib/colors";
import { ConfirmButton } from "@/components/confirm-button";
import { RoleSelect } from "@/components/role-select";

export const metadata: Metadata = { title: "Admin" };

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-rose-100 text-rose-800",
  instructor: "bg-violet-100 text-violet-800",
  student: "bg-sky-100 text-sky-800",
};

export default async function AdminPage() {
  const admin = await requireUser("admin");
  const users = listUsers();
  const courses = listAllCourses();
  const stats = platformStats();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Admin</h1>
      <p className="mt-1 text-zinc-500">Platform overview and user management.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Users", value: stats.users },
          { label: "Published courses", value: stats.courses },
          { label: "Enrollments", value: stats.enrollments },
          { label: "Lessons completed", value: stats.lessonsCompleted },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-zinc-900">
        Courses ({courses.length})
      </h2>
      <div className="card mt-4 overflow-x-auto">
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
            {courses.map((course) => (
              <tr key={course.id} className="hover:bg-zinc-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-zinc-900">{course.title}</p>
                  <p className="text-xs text-zinc-500">
                    <span className={`badge mr-1 ${badgeClass(course.color)}`}>{course.level}</span>
                    {course.category}
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
                      href={`/instructor/courses/${course.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Manage
                    </Link>
                    <ConfirmButton
                      action={deleteCourse.bind(null, course.id, "/admin")}
                      message={`Permanently delete “${course.title}” by ${course.instructor_name}? All modules, lessons, quizzes, and enrollments will be removed.`}
                      className="text-xs text-zinc-400 hover:text-red-600 cursor-pointer"
                    >
                      Delete
                    </ConfirmButton>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-zinc-900">
        Users ({users.length})
      </h2>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-500 uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Enrollments</th>
              <th className="px-5 py-3 font-medium">Courses taught</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-zinc-900">
                    {u.name}
                    {u.id === admin.id && <span className="ml-2 text-xs text-zinc-400">(you)</span>}
                  </p>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                </td>
                <td className="px-5 py-3">
                  {u.id === admin.id ? (
                    <span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                  ) : (
                    <RoleSelect userId={u.id} role={u.role} />
                  )}
                </td>
                <td className="px-5 py-3 text-zinc-600">{u.enrollment_count}</td>
                <td className="px-5 py-3 text-zinc-600">{u.course_count}</td>
                <td className="px-5 py-3 text-zinc-600">{u.created_at.slice(0, 10)}</td>
                <td className="px-5 py-3 text-right">
                  {u.id !== admin.id && (
                    <ConfirmButton
                      action={deleteUser.bind(null, u.id)}
                      message={`Delete ${u.name}? Their enrollments, progress, and any courses they teach will be removed.`}
                      className="text-xs text-zinc-400 hover:text-red-600 cursor-pointer"
                    >
                      Delete
                    </ConfirmButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
