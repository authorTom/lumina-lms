import Database from "better-sqlite3";
import path from "path";
import { seed } from "./seed";

const DB_PATH = path.join(process.cwd(), "data", "lms.db");

declare global {
  // eslint-disable-next-line no-var
  var __lmsDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  const fs = require("fs") as typeof import("fs");
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  const hadCompletions = !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='course_completions'")
    .get();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','instructor','admin')),
      disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS account_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_group_members (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES account_groups(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'General',
      level TEXT NOT NULL DEFAULT 'Beginner' CHECK (level IN ('Beginner','Intermediate','Advanced')),
      color TEXT NOT NULL DEFAULT 'indigo',
      image TEXT,
      enrollment_policy TEXT NOT NULL DEFAULT 'open' CHECK (enrollment_policy IN ('open','assigned')),
      instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      video_url TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 5,
      position INTEGER NOT NULL DEFAULT 0,
      scorm_package_id INTEGER REFERENCES scorm_packages(id)
    );

    CREATE TABLE IF NOT EXISTS scorm_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.2' CHECK (version IN ('1.2','2004')),
      launch_href TEXT NOT NULL,
      dir TEXT NOT NULL UNIQUE,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scorm_data (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      cmi TEXT NOT NULL DEFAULT '{}',
      lesson_status TEXT,
      score_raw REAL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS course_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
      course_title TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS lesson_progress (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL UNIQUE REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      pass_pct INTEGER NOT NULL DEFAULT 70
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS choices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score_pct INTEGER NOT NULL,
      passed INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
    CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id, position);
    CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id, position);
    CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_user ON quiz_attempts(user_id, quiz_id);
  `);

  // Migrate databases created before soft-delete existed.
  const courseCols = db.prepare("PRAGMA table_info(courses)").all() as { name: string }[];
  if (!courseCols.some((c) => c.name === "deleted_at")) {
    db.exec("ALTER TABLE courses ADD COLUMN deleted_at TEXT");
  }

  // Migrate databases created before account enable/disable existed.
  const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userCols.some((c) => c.name === "disabled")) {
    db.exec("ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0");
  }

  // Migrate databases created before SCORM support existed.
  const lessonCols = db.prepare("PRAGMA table_info(lessons)").all() as { name: string }[];
  if (!lessonCols.some((c) => c.name === "scorm_package_id")) {
    db.exec("ALTER TABLE lessons ADD COLUMN scorm_package_id INTEGER REFERENCES scorm_packages(id)");
  }

  // Migrate databases created before the SCORM library existed.
  const packageCols = db.prepare("PRAGMA table_info(scorm_packages)").all() as { name: string }[];
  if (!packageCols.some((c) => c.name === "size_bytes")) {
    db.exec("ALTER TABLE scorm_packages ADD COLUMN size_bytes INTEGER NOT NULL DEFAULT 0");
  }

  // Migrate databases created before course images existed.
  const imgCols = db.prepare("PRAGMA table_info(courses)").all() as { name: string }[];
  if (!imgCols.some((c) => c.name === "image")) {
    db.exec("ALTER TABLE courses ADD COLUMN image TEXT");
  }

  // Migrate databases created before enrollment policies existed.
  if (!imgCols.some((c) => c.name === "enrollment_policy")) {
    db.exec(
      "ALTER TABLE courses ADD COLUMN enrollment_policy TEXT NOT NULL DEFAULT 'open' CHECK (enrollment_policy IN ('open','assigned'))"
    );
  }

  // Backfill training records for courses finished before completion
  // logging existed; the date is the last lesson's completion time.
  if (!hadCompletions) {
    db.exec(`
      INSERT OR IGNORE INTO course_completions (user_id, course_id, course_title, completed_at)
      SELECT e.user_id, c.id, c.title,
             (SELECT MAX(p.completed_at) FROM lesson_progress p
              JOIN lessons l ON l.id = p.lesson_id
              JOIN modules m ON m.id = l.module_id
              WHERE p.user_id = e.user_id AND m.course_id = c.id)
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id
             WHERE m.course_id = c.id) > 0
        AND (SELECT COUNT(*) FROM lesson_progress p
             JOIN lessons l ON l.id = p.lesson_id
             JOIN modules m ON m.id = l.module_id
             WHERE p.user_id = e.user_id AND m.course_id = c.id)
          = (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id
             WHERE m.course_id = c.id)
    `);
  }

  const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (userCount.n === 0) seed(db);
}

export function getDb(): Database.Database {
  if (!globalThis.__lmsDb) globalThis.__lmsDb = createDb();
  return globalThis.__lmsDb;
}
