import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import {
  overviewStats,
  dailySeries,
  viewsPerCourse,
  accessByHour,
  courseEngagement,
} from "@/lib/analytics";
import { LineChart, HBarChart, ColumnChart, ChartLegend, SERIES } from "@/components/charts";
import { ProgressBar } from "@/components/progress-bar";

export const metadata: Metadata = { title: "Analytics & reports" };

const REPORTS: { key: string; label: string; description: string }[] = [
  { key: "users", label: "Users", description: "Every account with role, groups, enrollment and completion counts, and last activity." },
  { key: "enrollments", label: "Enrollments", description: "Who is enrolled in what, with enrollment date, progress, and completion date." },
  { key: "completions", label: "Completions", description: "The full training record: every course completion with its date." },
  { key: "quiz_attempts", label: "Quiz attempts", description: "Every attempt with learner, quiz, course, score, and pass/fail." },
  { key: "activity", label: "Activity log (90 days)", description: "Raw events: logins, course views, and lesson views with timestamps." },
  { key: "engagement", label: "Course engagement", description: "Per-course summary: enrollments, views, average progress, quiz pass rate, completions." },
];

function shortDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function AnalyticsPage() {
  await requireUser("admin");

  const stats = overviewStats();
  const daily = dailySeries(30);
  const topCourses = viewsPerCourse(30, 10);
  const hours = accessByHour(30);
  const engagement = courseEngagement();
  const labels = daily.map((p) => shortDay(p.day));

  const tiles = [
    { label: "Total users", value: stats.totalUsers },
    { label: "Active users (7 days)", value: stats.activeUsers7d },
    { label: "Logins (30 days)", value: stats.logins30d },
    { label: "Lesson views (30 days)", value: stats.lessonViews30d },
    { label: "Enrollments (30 days)", value: stats.enrollments30d },
    { label: "Completions (30 days)", value: stats.completions30d },
    { label: "Quiz attempts (30 days)", value: stats.quizAttempts30d },
    {
      label: "Quiz pass rate (30 days)",
      value: stats.quizPassRate30d === null ? "—" : `${stats.quizPassRate30d}%`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/admin" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
        ← Admin
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        Analytics &amp; reports
      </h1>
      <p className="mt-1 text-zinc-500">
        Platform activity, engagement, and downloadable reports. Activity tracking began
        when this dashboard was installed, so trend charts fill up from today onward.
      </p>

      {/* KPI tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="card p-4">
            <p className="text-2xl font-bold tabular-nums text-zinc-900">{tile.value}</p>
            <p className="text-xs text-zinc-500">{tile.label}</p>
          </div>
        ))}
      </div>

      {/* Trends */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold text-zinc-900">Learning activity — last 30 days</h2>
            <ChartLegend
              series={[
                { name: "Lesson views", color: SERIES[0] },
                { name: "Logins", color: SERIES[1] },
              ]}
            />
          </div>
          <div className="mt-3">
            <LineChart
              labels={labels}
              series={[
                { name: "Views", color: SERIES[0], values: daily.map((p) => p.views) },
                { name: "Logins", color: SERIES[1], values: daily.map((p) => p.logins) },
              ]}
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold text-zinc-900">Enrollments &amp; completions — last 30 days</h2>
            <ChartLegend
              series={[
                { name: "Enrollments", color: SERIES[0] },
                { name: "Completions", color: SERIES[1] },
              ]}
            />
          </div>
          <div className="mt-3">
            <LineChart
              labels={labels}
              series={[
                { name: "Enrolled", color: SERIES[0], values: daily.map((p) => p.enrollments) },
                { name: "Completed", color: SERIES[1], values: daily.map((p) => p.completions) },
              ]}
            />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-zinc-900">Views per course — last 30 days</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Course page and lesson views, top 10.</p>
          <div className="mt-3">
            {topCourses.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                No course views recorded yet.
              </p>
            ) : (
              <HBarChart items={topCourses.map((c) => ({ label: c.title, value: c.views }))} />
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-zinc-900">Time of access — last 30 days</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            All activity by hour of day (UTC). Reveals when your learners actually study.
          </p>
          <div className="mt-3">
            <ColumnChart
              items={hours.map((h) => ({ label: String(h.hour), value: h.count }))}
              formatLabel={(l) => `${l.padStart(2, "0")}:00`}
            />
          </div>
        </div>
      </div>

      {/* Course engagement table */}
      <h2 className="mt-10 text-xl font-semibold tracking-tight text-zinc-900">
        Course engagement
      </h2>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-500 uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Course</th>
              <th className="px-5 py-3 font-medium">Enrolled</th>
              <th className="px-5 py-3 font-medium">Views</th>
              <th className="px-5 py-3 font-medium">Avg progress</th>
              <th className="px-5 py-3 font-medium">Quiz attempts</th>
              <th className="px-5 py-3 font-medium">Pass rate</th>
              <th className="px-5 py-3 font-medium">Completions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {engagement.map((course) => (
              <tr key={course.id} className="hover:bg-zinc-50">
                <td className="px-5 py-3 font-medium text-zinc-900">
                  <Link href={`/instructor/courses/${course.id}`} className="hover:text-indigo-700">
                    {course.title}
                  </Link>
                </td>
                <td className="px-5 py-3 tabular-nums text-zinc-600">{course.enrollments}</td>
                <td className="px-5 py-3 tabular-nums text-zinc-600">{course.views}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={course.avg_progress} className="w-24" />
                    <span className="text-xs tabular-nums text-zinc-600">
                      {course.avg_progress}%
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 tabular-nums text-zinc-600">{course.quiz_attempts}</td>
                <td className="px-5 py-3 tabular-nums text-zinc-600">
                  {course.pass_rate === null ? "—" : `${course.pass_rate}%`}
                </td>
                <td className="px-5 py-3 tabular-nums text-zinc-600">{course.completions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reports */}
      <h2 className="mt-10 text-xl font-semibold tracking-tight text-zinc-900">
        Download reports
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        CSV files, ready for Excel or Google Sheets.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <div key={report.key} className="card flex flex-col p-5">
            <h3 className="font-medium text-zinc-900">{report.label}</h3>
            <p className="mt-1 flex-1 text-sm text-zinc-500">{report.description}</p>
            <a
              href={`/admin/analytics/export?report=${report.key}`}
              className="btn-secondary mt-4 self-start"
              download
            >
              ⬇ Download CSV
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
