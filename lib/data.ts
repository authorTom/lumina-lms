import { getDb } from "./db";

export interface CourseSummary {
  id: number;
  title: string;
  description: string;
  category: string;
  color: string;
  image: string | null;
  enrollment_policy: "open" | "assigned";
  review_months: number | null;
  published: number;
  deleted_at: string | null;
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
  scorm_package_id: number | null;
}

export interface ScormPackage {
  id: number;
  title: string;
  version: "1.2" | "2004";
  launch_href: string;
  dir: string;
  uploaded_by: number | null;
  created_at: string;
}

export interface ScormData {
  user_id: number;
  lesson_id: number;
  cmi: string;
  lesson_status: string | null;
  score_raw: number | null;
  updated_at: string;
}

export interface LibraryPackage extends ScormPackage {
  size_bytes: number;
  uploader_name: string | null;
  usage_count: number;
  used_in: string | null; // distinct course titles
}

export function listScormPackages(): LibraryPackage[] {
  return getDb()
    .prepare(
      `SELECT p.*, u.name AS uploader_name,
              (SELECT COUNT(*) FROM lessons l WHERE l.scorm_package_id = p.id) AS usage_count,
              (SELECT GROUP_CONCAT(DISTINCT c.title) FROM lessons l
               JOIN modules m ON m.id = l.module_id
               JOIN courses c ON c.id = m.course_id
               WHERE l.scorm_package_id = p.id) AS used_in
       FROM scorm_packages p
       LEFT JOIN users u ON u.id = p.uploaded_by
       ORDER BY p.created_at DESC`
    )
    .all() as LibraryPackage[];
}

export function scormPackageUsageCount(packageId: number): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM lessons WHERE scorm_package_id = ?")
    .get(packageId) as { n: number };
  return row.n;
}

export function getScormPackage(id: number): ScormPackage | undefined {
  return getDb()
    .prepare("SELECT * FROM scorm_packages WHERE id = ?")
    .get(id) as ScormPackage | undefined;
}

export function getScormData(userId: number, lessonId: number): ScormData | undefined {
  return getDb()
    .prepare("SELECT * FROM scorm_data WHERE user_id = ? AND lesson_id = ?")
    .get(userId, lessonId) as ScormData | undefined;
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
  SELECT c.id, c.title, c.description, c.category, c.color, c.image, c.enrollment_policy, c.review_months, c.published,
         c.deleted_at, c.instructor_id, u.name AS instructor_name,
         (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS lesson_count,
         (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count,
         (SELECT COALESCE(SUM(l.duration_minutes), 0) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS total_minutes
  FROM courses c
  JOIN users u ON u.id = c.instructor_id
`;

export function listPublishedCourses(search?: string, category?: string): CourseSummary[] {
  const clauses = ["c.published = 1", "c.deleted_at IS NULL"];
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
    .prepare(
      "SELECT DISTINCT category FROM courses WHERE published = 1 AND deleted_at IS NULL ORDER BY category"
    )
    .all() as { category: string }[];
  return rows.map((r) => r.category);
}

export function getCourse(id: number): CourseSummary | undefined {
  return getDb()
    .prepare(`${COURSE_SUMMARY_SELECT} WHERE c.id = ? AND c.deleted_at IS NULL`)
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

// Relationship guards: confirm a child row really belongs to the course whose
// ownership the caller has already been checked against. Without these, an
// instructor who owns course A could mutate content in course B by passing
// A's id (which passes the ownership check) alongside B's lesson/quiz id.
export function moduleInCourse(moduleId: number, courseId: number): boolean {
  return !!getDb()
    .prepare("SELECT 1 FROM modules WHERE id = ? AND course_id = ?")
    .get(moduleId, courseId);
}

export function lessonInCourse(lessonId: number, courseId: number): boolean {
  return !!getDb()
    .prepare(
      `SELECT 1 FROM lessons l JOIN modules m ON m.id = l.module_id
       WHERE l.id = ? AND m.course_id = ?`
    )
    .get(lessonId, courseId);
}

export function quizInCourse(quizId: number, courseId: number): boolean {
  return !!getDb()
    .prepare(
      `SELECT 1 FROM quizzes q JOIN modules m ON m.id = q.module_id
       WHERE q.id = ? AND m.course_id = ?`
    )
    .get(quizId, courseId);
}

export function questionInCourse(questionId: number, courseId: number): boolean {
  return !!getDb()
    .prepare(
      `SELECT 1 FROM questions qn
       JOIN quizzes q ON q.id = qn.quiz_id
       JOIN modules m ON m.id = q.module_id
       WHERE qn.id = ? AND m.course_id = ?`
    )
    .get(questionId, courseId);
}

export function getEnrolledCourses(userId: number): CourseWithProgress[] {
  return getDb()
    .prepare(
      `${COURSE_SUMMARY_SELECT}
       JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
       WHERE c.deleted_at IS NULL
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

export interface CourseCompletion {
  id: number;
  course_id: number | null;
  course_title: string;
  completed_at: string;
}

export function listCompletions(userId: number): CourseCompletion[] {
  return getDb()
    .prepare(
      "SELECT id, course_id, course_title, completed_at FROM course_completions WHERE user_id = ? ORDER BY completed_at DESC"
    )
    .all(userId) as CourseCompletion[];
}

// Called whenever a lesson is marked complete: if that was the last one,
// log a permanent training record (kept even if progress is later undone
// or the course is deleted).
export function recordCompletionIfFinished(userId: number, courseId: number) {
  const db = getDb();
  const total = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?"
      )
      .get(courseId) as { n: number }
  ).n;
  if (total === 0 || countCompletedLessons(userId, courseId) < total) return;
  db.prepare(
    `INSERT OR IGNORE INTO course_completions (user_id, course_id, course_title)
     SELECT ?, id, title FROM courses WHERE id = ?`
  ).run(userId, courseId);
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
    .prepare(
      `${COURSE_SUMMARY_SELECT} WHERE c.instructor_id = ? AND c.deleted_at IS NULL ORDER BY c.created_at DESC`
    )
    .all(instructorId) as CourseSummary[];
}

export interface EnrolledStudent {
  id: number;
  name: string;
  email: string;
  enrolled_at: string;
  completed_count: number;
}

// Students available to allocate to a course (not yet enrolled).
export function unenrolledStudents(courseId: number): { id: number; name: string; email: string }[] {
  return getDb()
    .prepare(
      `SELECT id, name, email FROM users
       WHERE role = 'student' AND disabled = 0
         AND id NOT IN (SELECT user_id FROM enrollments WHERE course_id = ?)
       ORDER BY name`
    )
    .all(courseId) as { id: number; name: string; email: string }[];
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
  disabled: number;
  created_at: string;
  enrollment_count: number;
  course_count: number;
  group_names: string | null;
  last_login: string | null;
}

const ADMIN_USER_SELECT = `
  SELECT u.id, u.name, u.email, u.role, u.disabled, u.created_at,
         (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS enrollment_count,
         (SELECT COUNT(*) FROM courses c WHERE c.instructor_id = u.id AND c.deleted_at IS NULL) AS course_count,
         (SELECT GROUP_CONCAT(g.name, ', ') FROM user_group_members m
          JOIN account_groups g ON g.id = m.group_id WHERE m.user_id = u.id) AS group_names,
         (SELECT MAX(a.created_at) FROM activity_log a
          WHERE a.user_id = u.id AND a.type = 'login') AS last_login
  FROM users u
`;

export function listAllCourses(search?: string): CourseSummary[] {
  if (search) {
    const like = `%${search}%`;
    return getDb()
      .prepare(
        `${COURSE_SUMMARY_SELECT}
         WHERE c.deleted_at IS NULL AND (c.title LIKE ? OR c.category LIKE ? OR u.name LIKE ?)
         ORDER BY c.created_at DESC`
      )
      .all(like, like, like) as CourseSummary[];
  }
  return getDb()
    .prepare(`${COURSE_SUMMARY_SELECT} WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC`)
    .all() as CourseSummary[];
}

export type ReviewStatus = "overdue" | "due-soon" | "ok" | "unscheduled";

export interface CourseReview {
  id: number;
  title: string;
  instructor_id: number;
  instructor_name: string;
  published: number;
  review_months: number | null;
  created_at: string;
  updated_at: string | null;
  last_reviewed_at: string | null;
  due_at: Date | null;
  status: ReviewStatus;
}

const DUE_SOON_DAYS = 30;

function parseUtc(sqlite: string): Date {
  return new Date(sqlite.replace(" ", "T") + "Z");
}

export function reviewDashboard(): CourseReview[] {
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.title, c.instructor_id, u.name AS instructor_name, c.published,
              c.review_months, c.created_at, c.updated_at, c.last_reviewed_at
       FROM courses c JOIN users u ON u.id = c.instructor_id
       WHERE c.deleted_at IS NULL`
    )
    .all() as Omit<CourseReview, "due_at" | "status">[];

  const now = Date.now();
  const reviews = rows.map((row): CourseReview => {
    if (!row.review_months) {
      return { ...row, due_at: null, status: "unscheduled" };
    }
    // The review clock starts from the last review, or course creation.
    const base = parseUtc(row.last_reviewed_at ?? row.created_at);
    const due = new Date(base);
    due.setUTCMonth(due.getUTCMonth() + row.review_months);
    const status: ReviewStatus =
      due.getTime() < now
        ? "overdue"
        : due.getTime() < now + DUE_SOON_DAYS * 86400000
          ? "due-soon"
          : "ok";
    return { ...row, due_at: due, status };
  });

  const order: Record<ReviewStatus, number> = { overdue: 0, "due-soon": 1, ok: 2, unscheduled: 3 };
  return reviews.sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      (a.due_at?.getTime() ?? Infinity) - (b.due_at?.getTime() ?? Infinity)
  );
}

// Recycle bin: admins see every deleted course, instructors only their own.
export function listDeletedCourses(userId: number, isAdmin: boolean): CourseSummary[] {
  const clause = isAdmin ? "" : "AND c.instructor_id = ?";
  return getDb()
    .prepare(
      `${COURSE_SUMMARY_SELECT} WHERE c.deleted_at IS NOT NULL ${clause} ORDER BY c.deleted_at DESC`
    )
    .all(...(isAdmin ? [] : [userId])) as CourseSummary[];
}

export function listUsers(groupId?: number, search?: string): AdminUser[] {
  const joins = groupId ? "JOIN user_group_members f ON f.user_id = u.id AND f.group_id = ?" : "";
  const where = search ? "WHERE (u.name LIKE ? OR u.email LIKE ?)" : "";
  const params: unknown[] = [];
  if (groupId) params.push(groupId);
  if (search) params.push(`%${search}%`, `%${search}%`);
  return getDb()
    .prepare(`${ADMIN_USER_SELECT} ${joins} ${where} ORDER BY u.created_at DESC`)
    .all(...params) as AdminUser[];
}

export function getAdminUser(id: number): AdminUser | undefined {
  return getDb()
    .prepare(`${ADMIN_USER_SELECT} WHERE u.id = ?`)
    .get(id) as AdminUser | undefined;
}

export interface AccountGroup {
  id: number;
  name: string;
  member_count: number;
}

export function listGroups(): AccountGroup[] {
  return getDb()
    .prepare(
      `SELECT g.id, g.name,
              (SELECT COUNT(*) FROM user_group_members m WHERE m.group_id = g.id) AS member_count
       FROM account_groups g ORDER BY g.name`
    )
    .all() as AccountGroup[];
}

export function userGroupIds(userId: number): Set<number> {
  const rows = getDb()
    .prepare("SELECT group_id FROM user_group_members WHERE user_id = ?")
    .all(userId) as { group_id: number }[];
  return new Set(rows.map((r) => r.group_id));
}

export function platformStats() {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    users: one("SELECT COUNT(*) AS n FROM users"),
    courses: one("SELECT COUNT(*) AS n FROM courses WHERE published = 1 AND deleted_at IS NULL"),
    enrollments: one("SELECT COUNT(*) AS n FROM enrollments"),
    lessonsCompleted: one("SELECT COUNT(*) AS n FROM lesson_progress"),
  };
}
