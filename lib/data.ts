import { getDb } from "./db";

export interface CourseSummary {
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  color: string;
  published: number;
  instructor_id: number;
  instructor_name: string;
  lesson_count: number;
  student_count: number;
  total_minutes: number;
}

export interface CourseWithProgress extends CourseSummary {
  completed_count: number;
}

export interface Module {
  id: number;
  course_id: number;
  title: string;
  position: number;
}

export interface Lesson {
  id: number;
  module_id: number;
  title: string;
  content: string;
  video_url: string | null;
  duration_minutes: number;
  position: number;
}

export interface Quiz {
  id: number;
  module_id: number;
  title: string;
  pass_pct: number;
}

export interface Question {
  id: number;
  quiz_id: number;
  text: string;
  position: number;
  choices: Choice[];
}

export interface Choice {
  id: number;
  question_id: number;
  text: string;
  is_correct: number;
  position: number;
}

export interface ModuleOutline extends Module {
  lessons: Lesson[];
  quiz: Quiz | null;
}

const COURSE_SUMMARY_SELECT = `
  SELECT c.id, c.title, c.description, c.category, c.level, c.color, c.published,
         c.instructor_id, u.name AS instructor_name,
         (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS lesson_count,
         (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count,
         (SELECT COALESCE(SUM(l.duration_minutes), 0) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS total_minutes
  FROM courses c
  JOIN users u ON u.id = c.instructor_id
`;

export function listPublishedCourses(search?: string, category?: string): CourseSummary[] {
  const clauses = ["c.published = 1"];
  const params: unknown[] = [];
  if (search) {
    clauses.push("(c.title LIKE ? OR c.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    clauses.push("c.category = ?");
    params.push(category);
  }
  return getDb()
    .prepare(`${COURSE_SUMMARY_SELECT} WHERE ${clauses.join(" AND ")} ORDER BY c.title`)
    .all(...params) as CourseSummary[];
}

export function listCategories(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT category FROM courses WHERE published = 1 ORDER BY category")
    .all() as { category: string }[];
  return rows.map((r) => r.category);
}

export function getCourse(id: number): CourseSummary | undefined {
  return getDb()
    .prepare(`${COURSE_SUMMARY_SELECT} WHERE c.id = ?`)
    .get(id) as CourseSummary | undefined;
}

export function getCourseInstructorId(courseId: number): number | undefined {
  const row = getDb()
    .prepare("SELECT instructor_id FROM courses WHERE id = ?")
    .get(courseId) as { instructor_id: number } | undefined;
  return row?.instructor_id;
}

export function getCourseOutline(courseId: number): ModuleOutline[] {
  const db = getDb();
  const modules = db
    .prepare("SELECT * FROM modules WHERE course_id = ? ORDER BY position, id")
    .all(courseId) as Module[];
  const lessonStmt = db.prepare(
    "SELECT * FROM lessons WHERE module_id = ? ORDER BY position, id"
  );
  const quizStmt = db.prepare("SELECT * FROM quizzes WHERE module_id = ?");
  return modules.map((m) => ({
    ...m,
    lessons: lessonStmt.all(m.id) as Lesson[],
    quiz: (quizStmt.get(m.id) as Quiz | undefined) ?? null,
  }));
}

export function isEnrolled(userId: number, courseId: number): boolean {
  return !!getDb()
    .prepare("SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?")
    .get(userId, courseId);
}

export function getEnrolledCourses(userId: number): CourseWithProgress[] {
  return getDb()
    .prepare(
      `${COURSE_SUMMARY_SELECT}
       JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
       ORDER BY e.enrolled_at DESC`
    )
    .all(userId)
    .map((course) => {
      const c = course as CourseSummary;
      return { ...c, completed_count: countCompletedLessons(userId, c.id) };
    });
}

export function countCompletedLessons(userId: number, courseId: number): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM lesson_progress p
       JOIN lessons l ON l.id = p.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE p.user_id = ? AND m.course_id = ?`
    )
    .get(userId, courseId) as { n: number };
  return row.n;
}

export function completedLessonIds(userId: number, courseId: number): Set<number> {
  const rows = getDb()
    .prepare(
      `SELECT p.lesson_id FROM lesson_progress p
       JOIN lessons l ON l.id = p.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE p.user_id = ? AND m.course_id = ?`
    )
    .all(userId, courseId) as { lesson_id: number }[];
  return new Set(rows.map((r) => r.lesson_id));
}

export function getLesson(lessonId: number):
  | (Lesson & { course_id: number; module_title: string })
  | undefined {
  return getDb()
    .prepare(
      `SELECT l.*, m.course_id, m.title AS module_title
       FROM lessons l JOIN modules m ON m.id = l.module_id
       WHERE l.id = ?`
    )
    .get(lessonId) as (Lesson & { course_id: number; module_title: string }) | undefined;
}

export function getQuiz(quizId: number):
  | (Quiz & { course_id: number; module_title: string; questions: Question[] })
  | undefined {
  const db = getDb();
  const quiz = db
    .prepare(
      `SELECT q.*, m.course_id, m.title AS module_title
       FROM quizzes q JOIN modules m ON m.id = q.module_id
       WHERE q.id = ?`
    )
    .get(quizId) as (Quiz & { course_id: number; module_title: string }) | undefined;
  if (!quiz) return undefined;
  const questions = db
    .prepare("SELECT * FROM questions WHERE quiz_id = ? ORDER BY position, id")
    .all(quizId) as Question[];
  const choiceStmt = db.prepare(
    "SELECT * FROM choices WHERE question_id = ? ORDER BY position, id"
  );
  for (const q of questions) q.choices = choiceStmt.all(q.id) as Choice[];
  return { ...quiz, questions };
}

export interface QuizAttempt {
  id: number;
  quiz_id: number;
  user_id: number;
  score_pct: number;
  passed: number;
  created_at: string;
}

export function getAttempts(userId: number, quizId: number): QuizAttempt[] {
  return getDb()
    .prepare(
      "SELECT * FROM quiz_attempts WHERE user_id = ? AND quiz_id = ? ORDER BY created_at DESC"
    )
    .all(userId, quizId) as QuizAttempt[];
}

export function bestAttempts(userId: number, courseId: number): Map<number, QuizAttempt> {
  const rows = getDb()
    .prepare(
      `SELECT a.* FROM quiz_attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       JOIN modules m ON m.id = q.module_id
       WHERE a.user_id = ? AND m.course_id = ?
       ORDER BY a.score_pct ASC`
    )
    .all(userId, courseId) as QuizAttempt[];
  const best = new Map<number, QuizAttempt>();
  for (const a of rows) best.set(a.quiz_id, a); // later rows have higher scores
  return best;
}

// --- Instructor ---

export function coursesByInstructor(instructorId: number): CourseSummary[] {
  return getDb()
    .prepare(`${COURSE_SUMMARY_SELECT} WHERE c.instructor_id = ? ORDER BY c.created_at DESC`)
    .all(instructorId) as CourseSummary[];
}

export interface EnrolledStudent {
  id: number;
  name: string;
  email: string;
  enrolled_at: string;
  completed_count: number;
}

export function courseStudents(courseId: number): EnrolledStudent[] {
  return getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, e.enrolled_at,
              (SELECT COUNT(*) FROM lesson_progress p
               JOIN lessons l ON l.id = p.lesson_id
               JOIN modules m ON m.id = l.module_id
               WHERE p.user_id = u.id AND m.course_id = e.course_id) AS completed_count
       FROM enrollments e JOIN users u ON u.id = e.user_id
       WHERE e.course_id = ?
       ORDER BY e.enrolled_at DESC`
    )
    .all(courseId) as EnrolledStudent[];
}

// --- Admin ---

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  enrollment_count: number;
  course_count: number;
}

export function listAllCourses(): CourseSummary[] {
  return getDb()
    .prepare(`${COURSE_SUMMARY_SELECT} ORDER BY c.created_at DESC`)
    .all() as CourseSummary[];
}

export function listUsers(): AdminUser[] {
  return getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
              (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS enrollment_count,
              (SELECT COUNT(*) FROM courses c WHERE c.instructor_id = u.id) AS course_count
       FROM users u ORDER BY u.created_at DESC`
    )
    .all() as AdminUser[];
}

export function platformStats() {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    users: one("SELECT COUNT(*) AS n FROM users"),
    courses: one("SELECT COUNT(*) AS n FROM courses WHERE published = 1"),
    enrollments: one("SELECT COUNT(*) AS n FROM enrollments"),
    lessonsCompleted: one("SELECT COUNT(*) AS n FROM lesson_progress"),
  };
}
