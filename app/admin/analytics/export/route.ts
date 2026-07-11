import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { courseEngagement } from "@/lib/analytics";

const REPORT_HEADERS: Record<string, string[]> = {
  users: ["name", "email", "role", "status", "groups", "joined", "enrollments", "completions", "last_activity"],
  enrollments: ["name", "email", "course", "enrolled_at", "lessons_completed", "lessons_total", "completed_at"],
  completions: ["name", "email", "course", "completed_at"],
  quiz_attempts: ["name", "email", "quiz", "course", "score_pct", "result", "created_at"],
  activity: ["name", "email", "type", "course", "lesson", "created_at"],
  engagement: ["course", "enrollments", "views", "avg_progress_pct", "quiz_attempts", "quiz_pass_rate_pct", "completions"],
};

function csv(rows: Record<string, unknown>[], fallbackHeaders: string[]): string {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : fallbackHeaders;
  const escape = (value: unknown): string => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\r\n");
}

function report(name: string): Record<string, unknown>[] {
  const db = getDb();
  switch (name) {
    case "users":
      return db
        .prepare(
          `SELECT u.name, u.email, u.role,
                  CASE u.disabled WHEN 1 THEN 'disabled' ELSE 'active' END AS status,
                  (SELECT GROUP_CONCAT(g.name, '; ') FROM user_group_members m
                   JOIN account_groups g ON g.id = m.group_id WHERE m.user_id = u.id) AS groups,
                  u.created_at AS joined,
                  (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS enrollments,
                  (SELECT COUNT(*) FROM course_completions x WHERE x.user_id = u.id) AS completions,
                  (SELECT MAX(a.created_at) FROM activity_log a WHERE a.user_id = u.id) AS last_activity
           FROM users u ORDER BY u.name`
        )
        .all() as Record<string, unknown>[];
    case "enrollments":
      return db
        .prepare(
          `SELECT u.name, u.email, c.title AS course, e.enrolled_at,
                  (SELECT COUNT(*) FROM lesson_progress p
                   JOIN lessons l ON l.id = p.lesson_id
                   JOIN modules m ON m.id = l.module_id
                   WHERE p.user_id = u.id AND m.course_id = c.id) AS lessons_completed,
                  (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id
                   WHERE m.course_id = c.id) AS lessons_total,
                  (SELECT x.completed_at FROM course_completions x
                   WHERE x.user_id = u.id AND x.course_id = c.id) AS completed_at
           FROM enrollments e
           JOIN users u ON u.id = e.user_id
           JOIN courses c ON c.id = e.course_id
           WHERE c.deleted_at IS NULL
           ORDER BY c.title, u.name`
        )
        .all() as Record<string, unknown>[];
    case "completions":
      return db
        .prepare(
          `SELECT u.name, u.email, x.course_title AS course, x.completed_at
           FROM course_completions x
           JOIN users u ON u.id = x.user_id
           ORDER BY x.completed_at DESC`
        )
        .all() as Record<string, unknown>[];
    case "quiz_attempts":
      return db
        .prepare(
          `SELECT u.name, u.email, q.title AS quiz, c.title AS course,
                  a.score_pct, CASE a.passed WHEN 1 THEN 'passed' ELSE 'failed' END AS result,
                  a.created_at
           FROM quiz_attempts a
           JOIN users u ON u.id = a.user_id
           JOIN quizzes q ON q.id = a.quiz_id
           JOIN modules m ON m.id = q.module_id
           JOIN courses c ON c.id = m.course_id
           ORDER BY a.created_at DESC`
        )
        .all() as Record<string, unknown>[];
    case "activity":
      return db
        .prepare(
          `SELECT COALESCE(u.name, '(anonymous or deleted)') AS name, u.email, a.type,
                  c.title AS course, l.title AS lesson, a.created_at
           FROM activity_log a
           LEFT JOIN users u ON u.id = a.user_id
           LEFT JOIN courses c ON c.id = a.course_id
           LEFT JOIN lessons l ON l.id = a.lesson_id
           WHERE a.created_at >= datetime('now', '-90 days')
           ORDER BY a.created_at DESC`
        )
        .all() as Record<string, unknown>[];
    case "engagement":
      return courseEngagement().map((c) => ({
        course: c.title,
        enrollments: c.enrollments,
        views: c.views,
        avg_progress_pct: c.avg_progress,
        quiz_attempts: c.quiz_attempts,
        quiz_pass_rate_pct: c.pass_rate ?? "",
        completions: c.completions,
      }));
    default:
      throw new Error("unknown report");
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const name = req.nextUrl.searchParams.get("report") ?? "";
  let rows: Record<string, unknown>[];
  try {
    rows = report(name);
  } catch {
    return new NextResponse("Unknown report", { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv(rows, REPORT_HEADERS[name] ?? []), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lumina-${name}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
