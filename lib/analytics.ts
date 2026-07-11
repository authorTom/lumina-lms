import { getDb } from "./db";

export type ActivityType = "login" | "course_view" | "lesson_view";

export function logActivity(
  type: ActivityType,
  ids: { userId?: number | null; courseId?: number; lessonId?: number } = {}
) {
  try {
    getDb()
      .prepare(
        "INSERT INTO activity_log (user_id, type, course_id, lesson_id) VALUES (?, ?, ?, ?)"
      )
      .run(ids.userId ?? null, type, ids.courseId ?? null, ids.lessonId ?? null);
  } catch {
    // Analytics must never break the page that triggered it.
  }
}

// --- Dashboard queries (admin) ---

export interface OverviewStats {
  totalUsers: number;
  activeUsers7d: number;
  logins30d: number;
  lessonViews30d: number;
  enrollments30d: number;
  completions30d: number;
  quizAttempts30d: number;
  quizPassRate30d: number | null; // percent, null when no attempts
}

const since = (days: number) => `datetime('now', '-${days} days')`;

export function overviewStats(): OverviewStats {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  const attempts = one(
    `SELECT COUNT(*) AS n FROM quiz_attempts WHERE created_at >= ${since(30)}`
  );
  const passed = one(
    `SELECT COUNT(*) AS n FROM quiz_attempts WHERE passed = 1 AND created_at >= ${since(30)}`
  );
  return {
    totalUsers: one("SELECT COUNT(*) AS n FROM users"),
    activeUsers7d: one(
      `SELECT COUNT(DISTINCT user_id) AS n FROM activity_log
       WHERE user_id IS NOT NULL AND created_at >= ${since(7)}`
    ),
    logins30d: one(
      `SELECT COUNT(*) AS n FROM activity_log WHERE type = 'login' AND created_at >= ${since(30)}`
    ),
    lessonViews30d: one(
      `SELECT COUNT(*) AS n FROM activity_log WHERE type = 'lesson_view' AND created_at >= ${since(30)}`
    ),
    enrollments30d: one(
      `SELECT COUNT(*) AS n FROM enrollments WHERE enrolled_at >= ${since(30)}`
    ),
    completions30d: one(
      `SELECT COUNT(*) AS n FROM course_completions WHERE completed_at >= ${since(30)}`
    ),
    quizAttempts30d: attempts,
    quizPassRate30d: attempts === 0 ? null : Math.round((passed / attempts) * 100),
  };
}

export interface DailyPoint {
  day: string; // YYYY-MM-DD
  views: number;
  logins: number;
  enrollments: number;
  completions: number;
}

export function dailySeries(days = 30): DailyPoint[] {
  const db = getDb();
  const bucket = (sql: string) => {
    const map = new Map<string, number>();
    for (const row of db.prepare(sql).all() as { d: string; n: number }[]) {
      map.set(row.d, row.n);
    }
    return map;
  };
  const views = bucket(
    `SELECT date(created_at) AS d, COUNT(*) AS n FROM activity_log
     WHERE type = 'lesson_view' AND created_at >= ${since(days)} GROUP BY d`
  );
  const logins = bucket(
    `SELECT date(created_at) AS d, COUNT(*) AS n FROM activity_log
     WHERE type = 'login' AND created_at >= ${since(days)} GROUP BY d`
  );
  const enrollments = bucket(
    `SELECT date(enrolled_at) AS d, COUNT(*) AS n FROM enrollments
     WHERE enrolled_at >= ${since(days)} GROUP BY d`
  );
  const completions = bucket(
    `SELECT date(completed_at) AS d, COUNT(*) AS n FROM course_completions
     WHERE completed_at >= ${since(days)} GROUP BY d`
  );

  const points: DailyPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 86400000);
    const day = date.toISOString().slice(0, 10);
    points.push({
      day,
      views: views.get(day) ?? 0,
      logins: logins.get(day) ?? 0,
      enrollments: enrollments.get(day) ?? 0,
      completions: completions.get(day) ?? 0,
    });
  }
  return points;
}

export interface CourseViews {
  title: string;
  views: number;
}

export function viewsPerCourse(days = 30, limit = 10): CourseViews[] {
  return getDb()
    .prepare(
      `SELECT COALESCE(c.title, 'Deleted course') AS title, COUNT(*) AS views
       FROM activity_log a
       LEFT JOIN courses c ON c.id = a.course_id
       WHERE a.course_id IS NOT NULL AND a.created_at >= ${since(days)}
       GROUP BY a.course_id ORDER BY views DESC LIMIT ?`
    )
    .all(limit) as CourseViews[];
}

export function accessByHour(days = 30): { hour: number; count: number }[] {
  const rows = getDb()
    .prepare(
      `SELECT CAST(strftime('%H', created_at) AS INTEGER) AS hour, COUNT(*) AS count
       FROM activity_log WHERE created_at >= ${since(days)} GROUP BY hour`
    )
    .all() as { hour: number; count: number }[];
  const byHour = new Map(rows.map((r) => [r.hour, r.count]));
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: byHour.get(hour) ?? 0,
  }));
}

export interface CourseEngagement {
  id: number;
  title: string;
  enrollments: number;
  views: number;
  avg_progress: number; // percent
  quiz_attempts: number;
  pass_rate: number | null;
  completions: number;
}

export function courseEngagement(): CourseEngagement[] {
  const db = getDb();
  const courses = db
    .prepare(
      `SELECT c.id, c.title,
              (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollments,
              (SELECT COUNT(*) FROM activity_log a WHERE a.course_id = c.id) AS views,
              (SELECT COUNT(*) FROM course_completions x WHERE x.course_id = c.id) AS completions,
              (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS lesson_count
       FROM courses c WHERE c.deleted_at IS NULL ORDER BY enrollments DESC, views DESC`
    )
    .all() as (CourseEngagement & { lesson_count: number })[];

  const progressStmt = db.prepare(
    `SELECT COUNT(*) AS n FROM lesson_progress p
     JOIN lessons l ON l.id = p.lesson_id
     JOIN modules m ON m.id = l.module_id
     JOIN enrollments e ON e.user_id = p.user_id AND e.course_id = m.course_id
     WHERE m.course_id = ?`
  );
  const quizStmt = db.prepare(
    `SELECT COUNT(*) AS attempts, COALESCE(SUM(a.passed), 0) AS passed
     FROM quiz_attempts a
     JOIN quizzes q ON q.id = a.quiz_id
     JOIN modules m ON m.id = q.module_id
     WHERE m.course_id = ?`
  );

  return courses.map((c) => {
    const done = (progressStmt.get(c.id) as { n: number }).n;
    const possible = c.lesson_count * c.enrollments;
    const quiz = quizStmt.get(c.id) as { attempts: number; passed: number };
    return {
      id: c.id,
      title: c.title,
      enrollments: c.enrollments,
      views: c.views,
      avg_progress: possible === 0 ? 0 : Math.round((done / possible) * 100),
      quiz_attempts: quiz.attempts,
      pass_rate: quiz.attempts === 0 ? null : Math.round((quiz.passed / quiz.attempts) * 100),
      completions: c.completions,
    };
  });
}
