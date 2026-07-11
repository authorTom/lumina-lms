"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { createSession, destroySession, getCurrentUser, requireUser } from "./auth";
import { getCourseInstructorId, getLesson, getQuiz, isEnrolled } from "./data";
import { importScormPackage } from "./scorm";

export interface FormState {
  error?: string;
}

// --- Auth ---

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "student");

  if (!name || name.length > 100) return { error: "Please enter your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (role !== "student" && role !== "instructor") return { error: "Invalid role." };

  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return { error: "An account with that email already exists." };
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(name, email, hash, role);
  await createSession(result.lastInsertRowid as number);
  redirect(role === "student" ? "/dashboard" : "/instructor");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = getDb()
    .prepare("SELECT id, password_hash, role, disabled FROM users WHERE email = ?")
    .get(email) as
    | { id: number; password_hash: string; role: string; disabled: number }
    | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return { error: "Incorrect email or password." };
  }
  if (user.disabled) {
    return { error: "This account has been disabled. Contact an administrator." };
  }
  await createSession(user.id);
  redirect(user.role === "student" ? "/dashboard" : "/instructor");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// --- Enrollment & progress ---

export async function enroll(courseId: number) {
  const user = await requireUser();
  // Only students enroll; staff view content directly.
  if (user.role !== "student") redirect(`/learn/${courseId}`);
  getDb()
    .prepare("INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)")
    .run(user.id, courseId);
  revalidatePath(`/courses/${courseId}`);
  redirect(`/learn/${courseId}`);
}

export async function unenroll(courseId: number) {
  const user = await requireUser();
  getDb()
    .prepare("DELETE FROM enrollments WHERE user_id = ? AND course_id = ?")
    .run(user.id, courseId);
  revalidatePath("/dashboard");
  revalidatePath(`/courses/${courseId}`);
}

export async function toggleLessonComplete(lessonId: number, courseId: number, done: boolean) {
  const user = await requireUser();
  const db = getDb();
  if (done) {
    db.prepare("INSERT OR IGNORE INTO lesson_progress (user_id, lesson_id) VALUES (?, ?)").run(
      user.id,
      lessonId
    );
  } else {
    db.prepare("DELETE FROM lesson_progress WHERE user_id = ? AND lesson_id = ?").run(
      user.id,
      lessonId
    );
  }
  revalidatePath(`/learn/${courseId}`, "layout");
  revalidatePath("/dashboard");
}

export interface QuizResult {
  scorePct: number;
  passed: boolean;
  correct: number;
  total: number;
  correctChoiceIds: number[];
}

export async function submitQuiz(quizId: number, formData: FormData): Promise<QuizResult> {
  const user = await requireUser();
  const quiz = getQuiz(quizId);
  if (!quiz) throw new Error("Quiz not found");
  const isStaff = user.role === "admin" || user.role === "instructor";
  if (!isEnrolled(user.id, quiz.course_id) && !isStaff) throw new Error("Not enrolled");

  let correct = 0;
  const correctChoiceIds: number[] = [];
  for (const question of quiz.questions) {
    const chosen = Number(formData.get(`q_${question.id}`));
    const right = question.choices.find((c) => c.is_correct === 1);
    if (right) {
      correctChoiceIds.push(right.id);
      if (chosen === right.id) correct++;
    }
  }
  const total = quiz.questions.length;
  const scorePct = total === 0 ? 0 : Math.round((correct / total) * 100);
  const passed = scorePct >= quiz.pass_pct;

  getDb()
    .prepare(
      "INSERT INTO quiz_attempts (quiz_id, user_id, score_pct, passed) VALUES (?, ?, ?, ?)"
    )
    .run(quizId, user.id, scorePct, passed ? 1 : 0);
  revalidatePath(`/learn/${quiz.course_id}`, "layout");
  return { scorePct, passed, correct, total, correctChoiceIds };
}

// --- Instructor: course authoring ---

async function requireCourseOwner(courseId: number) {
  const user = await requireUser("instructor", "admin");
  const ownerId = getCourseInstructorId(courseId);
  if (ownerId === undefined) throw new Error("Course not found");
  if (user.role !== "admin" && ownerId !== user.id) throw new Error("Not your course");
  return user;
}

export async function createCourse(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("instructor", "admin");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "General").trim() || "General";
  const level = String(formData.get("level") ?? "Beginner");
  const color = String(formData.get("color") ?? "indigo");

  if (!title) return { error: "Please enter a course title." };
  if (!["Beginner", "Intermediate", "Advanced"].includes(level)) return { error: "Invalid level." };

  const result = getDb()
    .prepare(
      "INSERT INTO courses (title, description, category, level, color, instructor_id) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(title, description, category, level, color, user.id);
  redirect(`/instructor/courses/${result.lastInsertRowid}`);
}

export async function updateCourse(courseId: number, formData: FormData) {
  await requireCourseOwner(courseId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  getDb()
    .prepare(
      "UPDATE courses SET title = ?, description = ?, category = ?, level = ?, color = ? WHERE id = ?"
    )
    .run(
      title,
      String(formData.get("description") ?? "").trim(),
      String(formData.get("category") ?? "General").trim() || "General",
      String(formData.get("level") ?? "Beginner"),
      String(formData.get("color") ?? "indigo"),
      courseId
    );
  revalidatePath(`/instructor/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

export async function togglePublish(courseId: number) {
  await requireCourseOwner(courseId);
  getDb().prepare("UPDATE courses SET published = 1 - published WHERE id = ?").run(courseId);
  revalidatePath(`/instructor/courses/${courseId}`);
  revalidatePath("/courses");
}

// Deleting moves a course to the recycle bin; students keep their progress
// and everything comes back intact on restore.
export async function deleteCourse(courseId: number, redirectTo: string = "/instructor") {
  await requireCourseOwner(courseId);
  getDb()
    .prepare("UPDATE courses SET deleted_at = datetime('now') WHERE id = ?")
    .run(courseId);
  revalidatePath("/instructor");
  revalidatePath("/admin");
  revalidatePath("/courses");
  redirect(redirectTo);
}

export async function restoreCourse(courseId: number) {
  await requireCourseOwner(courseId);
  getDb().prepare("UPDATE courses SET deleted_at = NULL WHERE id = ?").run(courseId);
  revalidatePath("/instructor");
  revalidatePath("/courses");
}

export async function purgeCourse(courseId: number) {
  await requireCourseOwner(courseId);
  getDb().prepare("DELETE FROM courses WHERE id = ? AND deleted_at IS NOT NULL").run(courseId);
  revalidatePath("/instructor");
}

export async function addModule(courseId: number, formData: FormData) {
  await requireCourseOwner(courseId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const db = getDb();
  const max = db
    .prepare("SELECT COALESCE(MAX(position), -1) AS p FROM modules WHERE course_id = ?")
    .get(courseId) as { p: number };
  db.prepare("INSERT INTO modules (course_id, title, position) VALUES (?, ?, ?)").run(
    courseId,
    title,
    max.p + 1
  );
  revalidatePath(`/instructor/courses/${courseId}`);
}

export async function deleteModule(moduleId: number, courseId: number) {
  await requireCourseOwner(courseId);
  getDb().prepare("DELETE FROM modules WHERE id = ? AND course_id = ?").run(moduleId, courseId);
  revalidatePath(`/instructor/courses/${courseId}`);
}

export async function addLesson(moduleId: number, courseId: number, formData: FormData) {
  await requireCourseOwner(courseId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const db = getDb();
  const max = db
    .prepare("SELECT COALESCE(MAX(position), -1) AS p FROM lessons WHERE module_id = ?")
    .get(moduleId) as { p: number };
  db.prepare(
    "INSERT INTO lessons (module_id, title, content, video_url, duration_minutes, position) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    moduleId,
    title,
    String(formData.get("content") ?? ""),
    String(formData.get("video_url") ?? "").trim() || null,
    Math.max(1, Number(formData.get("duration_minutes")) || 5),
    max.p + 1
  );
  revalidatePath(`/instructor/courses/${courseId}`);
}

export async function addScormLesson(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const moduleId = Number(formData.get("module_id"));
  const courseId = Number(formData.get("course_id"));
  if (!Number.isInteger(moduleId) || !Number.isInteger(courseId)) {
    return { error: "Invalid module." };
  }
  const moduleRow = getDb()
    .prepare("SELECT course_id FROM modules WHERE id = ?")
    .get(moduleId) as { course_id: number } | undefined;
  if (!moduleRow || moduleRow.course_id !== courseId) {
    return { error: "Invalid module." };
  }
  const user = await requireCourseOwner(courseId);

  const file = formData.get("package");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a SCORM zip file." };
  }
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return { error: "SCORM packages must be uploaded as .zip files." };
  }

  let imported;
  try {
    imported = importScormPackage(Buffer.from(await file.arrayBuffer()), user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not import the package." };
  }

  const title = String(formData.get("title") ?? "").trim() || imported.title;
  const db = getDb();
  const max = db
    .prepare("SELECT COALESCE(MAX(position), -1) AS p FROM lessons WHERE module_id = ?")
    .get(moduleId) as { p: number };
  db.prepare(
    "INSERT INTO lessons (module_id, title, content, duration_minutes, position, scorm_package_id) VALUES (?, ?, '', ?, ?, ?)"
  ).run(
    moduleId,
    title,
    Math.max(1, Number(formData.get("duration_minutes")) || 15),
    max.p + 1,
    imported.id
  );
  revalidatePath(`/instructor/courses/${courseId}`);
  return {};
}

// Persists the CMI state reported by a SCO and mirrors completion into
// the regular lesson-progress system for enrolled students.
const SCORM_COMPLETE = new Set(["completed", "passed"]);

export async function saveScormData(lessonId: number, cmiJson: string) {
  const user = await requireUser();
  const lesson = getLesson(lessonId);
  if (!lesson || !lesson.scorm_package_id) throw new Error("Not a SCORM lesson");
  const isStaff = user.role === "admin" || user.role === "instructor";
  const enrolled = isEnrolled(user.id, lesson.course_id);
  if (!enrolled && !isStaff) throw new Error("Not enrolled");

  if (cmiJson.length > 1_000_000) throw new Error("CMI payload too large");
  let cmi: Record<string, string>;
  try {
    cmi = JSON.parse(cmiJson);
  } catch {
    throw new Error("Invalid CMI payload");
  }

  // SCORM 1.2 reports lesson_status; 2004 splits completion and success.
  const status =
    cmi["cmi.core.lesson_status"] ||
    (cmi["cmi.success_status"] === "passed" ? "passed" : cmi["cmi.completion_status"]) ||
    null;
  const rawScore = Number(cmi["cmi.core.score.raw"] ?? cmi["cmi.score.raw"]);
  const score = Number.isFinite(rawScore) ? rawScore : null;

  const db = getDb();
  db.prepare(
    `INSERT INTO scorm_data (user_id, lesson_id, cmi, lesson_status, score_raw, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET
       cmi = excluded.cmi, lesson_status = excluded.lesson_status,
       score_raw = excluded.score_raw, updated_at = excluded.updated_at`
  ).run(user.id, lessonId, cmiJson, status, score);

  if (enrolled && status && SCORM_COMPLETE.has(status)) {
    db.prepare(
      "INSERT OR IGNORE INTO lesson_progress (user_id, lesson_id) VALUES (?, ?)"
    ).run(user.id, lessonId);
    revalidatePath(`/learn/${lesson.course_id}`, "layout");
    revalidatePath("/dashboard");
  }
  return { status, score };
}

export async function updateLesson(lessonId: number, courseId: number, formData: FormData) {
  await requireCourseOwner(courseId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  getDb()
    .prepare(
      "UPDATE lessons SET title = ?, content = ?, video_url = ?, duration_minutes = ? WHERE id = ?"
    )
    .run(
      title,
      String(formData.get("content") ?? ""),
      String(formData.get("video_url") ?? "").trim() || null,
      Math.max(1, Number(formData.get("duration_minutes")) || 5),
      lessonId
    );
  revalidatePath(`/instructor/courses/${courseId}`);
  redirect(`/instructor/courses/${courseId}`);
}

export async function deleteLesson(lessonId: number, courseId: number) {
  await requireCourseOwner(courseId);
  getDb().prepare("DELETE FROM lessons WHERE id = ?").run(lessonId);
  revalidatePath(`/instructor/courses/${courseId}`);
}

export async function createQuiz(moduleId: number, courseId: number, formData: FormData) {
  await requireCourseOwner(courseId);
  const title = String(formData.get("title") ?? "").trim() || "Module quiz";
  getDb()
    .prepare("INSERT OR IGNORE INTO quizzes (module_id, title) VALUES (?, ?)")
    .run(moduleId, title);
  revalidatePath(`/instructor/courses/${courseId}`);
}

export async function deleteQuiz(quizId: number, courseId: number) {
  await requireCourseOwner(courseId);
  getDb().prepare("DELETE FROM quizzes WHERE id = ?").run(quizId);
  revalidatePath(`/instructor/courses/${courseId}`);
}

export async function addQuestion(quizId: number, courseId: number, formData: FormData) {
  await requireCourseOwner(courseId);
  const text = String(formData.get("text") ?? "").trim();
  const choices = [0, 1, 2, 3]
    .map((i) => String(formData.get(`choice_${i}`) ?? "").trim())
    .filter(Boolean);
  const correct = Number(formData.get("correct"));
  if (!text || choices.length < 2 || isNaN(correct) || correct >= choices.length) return;

  const db = getDb();
  const max = db
    .prepare("SELECT COALESCE(MAX(position), -1) AS p FROM questions WHERE quiz_id = ?")
    .get(quizId) as { p: number };
  const questionId = db
    .prepare("INSERT INTO questions (quiz_id, text, position) VALUES (?, ?, ?)")
    .run(quizId, text, max.p + 1).lastInsertRowid as number;
  const insertChoice = db.prepare(
    "INSERT INTO choices (question_id, text, is_correct, position) VALUES (?, ?, ?, ?)"
  );
  choices.forEach((choice, i) => insertChoice.run(questionId, choice, i === correct ? 1 : 0, i));
  revalidatePath(`/instructor/courses/${courseId}`);
}

export async function deleteQuestion(questionId: number, courseId: number) {
  await requireCourseOwner(courseId);
  getDb().prepare("DELETE FROM questions WHERE id = ?").run(questionId);
  revalidatePath(`/instructor/courses/${courseId}`);
}

// --- Admin: user management ---

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("admin");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "student");

  if (!name || name.length > 100) return { error: "Please enter a name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!["student", "instructor", "admin"].includes(role)) return { error: "Invalid role." };

  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return { error: "An account with that email already exists." };
  }
  const result = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(name, email, bcrypt.hashSync(password, 10), role);
  revalidatePath("/admin");
  redirect(`/admin/users/${result.lastInsertRowid}`);
}

export async function setUserDisabled(userId: number, disabled: boolean) {
  const admin = await requireUser("admin");
  if (userId === admin.id) return; // don't lock yourself out
  getDb().prepare("UPDATE users SET disabled = ? WHERE id = ?").run(disabled ? 1 : 0, userId);
  revalidatePath("/admin");
  revalidatePath(`/admin/users/${userId}`);
}

// Generates a random password, sets it, and returns it for one-time display.
export async function resetPassword(userId: number): Promise<{ password: string }> {
  await requireUser("admin");
  const password = crypto.randomBytes(9).toString("base64url"); // 12 chars
  getDb()
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(bcrypt.hashSync(password, 10), userId);
  return { password };
}

export async function setPassword(userId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("admin");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  getDb()
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(bcrypt.hashSync(password, 10), userId);
  return { error: undefined };
}

export async function createGroup(formData: FormData) {
  await requireUser("admin");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 60) return;
  getDb().prepare("INSERT OR IGNORE INTO account_groups (name) VALUES (?)").run(name);
  revalidatePath("/admin");
}

export async function deleteGroup(groupId: number) {
  await requireUser("admin");
  getDb().prepare("DELETE FROM account_groups WHERE id = ?").run(groupId);
  revalidatePath("/admin");
}

export async function setUserGroups(userId: number, formData: FormData) {
  await requireUser("admin");
  const db = getDb();
  const groups = db.prepare("SELECT id FROM account_groups").all() as { id: number }[];
  const setMembership = db.transaction(() => {
    db.prepare("DELETE FROM user_group_members WHERE user_id = ?").run(userId);
    const insert = db.prepare(
      "INSERT OR IGNORE INTO user_group_members (user_id, group_id) VALUES (?, ?)"
    );
    for (const g of groups) {
      if (formData.get(`group_${g.id}`)) insert.run(userId, g.id);
    }
  });
  setMembership();
  revalidatePath("/admin");
  revalidatePath(`/admin/users/${userId}`);
}

export async function setUserRole(userId: number, role: string) {
  const admin = await requireUser("admin");
  if (!["student", "instructor", "admin"].includes(role)) return;
  if (userId === admin.id) return; // don't demote yourself
  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  revalidatePath("/admin");
}

export async function deleteUser(userId: number) {
  const admin = await requireUser("admin");
  if (userId === admin.id) return;
  getDb().prepare("DELETE FROM users WHERE id = ?").run(userId);
  revalidatePath("/admin");
  redirect("/admin");
}
