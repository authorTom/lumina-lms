import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { reviewDashboard, type ReviewStatus } from "@/lib/data";
import { markCourseReviewed } from "@/lib/actions";

export const metadata: Metadata = { title: "Course reviews" };

const STATUS_BADGE: Record<ReviewStatus, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-red-100 text-red-800" },
  "due-soon": { label: "Due soon", className: "bg-amber-100 text-amber-800" },
  ok: { label: "Up to date", className: "bg-emerald-100 text-emerald-800" },
  unscheduled: { label: "No schedule", className: "bg-zinc-100 text-zinc-600" },
};

function formatDate(value: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value.replace(" ", "T") + "Z") : value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function dueLabel(due: Date | null): string {
  if (!due) return "—";
  const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
  if (days < 0) return `${formatDate(due)} (${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue)`;
  if (days === 0) return `${formatDate(due)} (today)`;
  return `${formatDate(due)} (in ${days} day${days === 1 ? "" : "s"})`;
}

export default async function ReviewsPage() {
  const user = await requireUser("instructor", "admin");
  const reviews = reviewDashboard();

  const counts = {
    overdue: reviews.filter((r) => r.status === "overdue").length,
    dueSoon: reviews.filter((r) => r.status === "due-soon").length,
    ok: reviews.filter((r) => r.status === "ok").length,
    unscheduled: reviews.filter((r) => r.status === "unscheduled").length,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/instructor" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
        ← Courses
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">Course reviews</h1>
      <p className="mt-1 text-zinc-500">
        Keep content current: each course's review clock runs from its last review (or
        creation), using the review period set in its details.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Overdue", value: counts.overdue, tone: counts.overdue > 0 ? "text-red-700" : "text-zinc-900" },
          { label: "Due within 30 days", value: counts.dueSoon, tone: counts.dueSoon > 0 ? "text-amber-700" : "text-zinc-900" },
          { label: "Up to date", value: counts.ok, tone: "text-zinc-900" },
          { label: "No review schedule", value: counts.unscheduled, tone: "text-zinc-900" },
        ].map((tile) => (
          <div key={tile.label} className="card p-4">
            <p className={`text-2xl font-bold tabular-nums ${tile.tone}`}>{tile.value}</p>
            <p className="text-xs text-zinc-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="card mt-8 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-500 uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Course</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Review due</th>
              <th className="px-5 py-3 font-medium">Period</th>
              <th className="px-5 py-3 font-medium">Last reviewed</th>
              <th className="px-5 py-3 font-medium">Last updated</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {reviews.map((review) => {
              const canManage =
                user.role === "admin" || review.instructor_id === user.id;
              const badge = STATUS_BADGE[review.status];
              return (
                <tr key={review.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-900">{review.title}</p>
                    <p className="text-xs text-zinc-500">
                      {review.instructor_name}
                      {review.published ? "" : " · draft"}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge ${badge.className}`}>{badge.label}</span>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{dueLabel(review.due_at)}</td>
                  <td className="px-5 py-3 text-zinc-600">
                    {review.review_months ? `${review.review_months} months` : "—"}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {review.last_reviewed_at ? formatDate(review.last_reviewed_at) : "Never"}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {formatDate(review.updated_at ?? review.created_at)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canManage && (
                      <span className="flex items-center justify-end gap-3">
                        {review.review_months && (
                          <form action={markCourseReviewed}>
                            <input type="hidden" name="course_id" value={review.id} />
                            <button className="font-medium text-emerald-700 hover:text-emerald-900 cursor-pointer">
                              Mark reviewed
                            </button>
                          </form>
                        )}
                        <Link
                          href={`/instructor/courses/${review.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Manage
                        </Link>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-zinc-500">
        Set or change a course&apos;s review period in <em>Edit course details</em> on its
        manage page. &ldquo;Mark reviewed&rdquo; restarts the clock from today.
      </p>
    </div>
  );
}
