# Lumina LMS

A modern, self-contained learning management system built with Next.js (App Router), TypeScript, Tailwind CSS, and SQLite. No external services required — the database is a local file created and seeded automatically on first run.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. The SQLite database (`data/lms.db`) is created and seeded with demo courses and users on first request.

### Demo accounts

All demo accounts use the password `password123`:

| Email | Role |
| --- | --- |
| `student@lms.dev` | Student (enrolled in two courses with some progress) |
| `sarah@lms.dev` | Instructor (owns two courses) |
| `james@lms.dev` | Instructor (owns two courses) |
| `admin@lms.dev` | Admin |

## Features

- **Auth & roles** — email/password accounts with signed-cookie sessions; student, instructor, and admin roles.
- **Course catalog** — search, category filters, and course detail pages with a full content outline.
- **Learning experience** — lesson player with a course sidebar, markdown lesson content, optional YouTube/Vimeo embeds, mark-complete tracking, and prev/next navigation.
- **Quizzes** — auto-graded multiple-choice quizzes per module with pass thresholds, per-question feedback, and attempt history. Correct answers never leave the server before submission.
- **Student dashboard** — enrolled courses, progress bars, and completion stats.
- **Instructor studio** — create courses, add modules/lessons/quizzes, edit lesson content, publish/unpublish, and view per-student progress. Lesson content is written in a markdown editor with a formatting toolbar and a live Preview tab that renders exactly like the lesson player.
- **Staff access** — instructors and admins never enroll: a shared Courses section lists every course on the platform, all content is viewable directly (a banner marks preview mode), and managing remains limited to the owning instructor or an admin.
- **Admin** — platform stats, user role management, and user deletion.

## Architecture

- `lib/db.ts` — SQLite connection, schema migration, and first-run seeding
- `lib/auth.ts` — HMAC-signed cookie sessions and role guards
- `lib/data.ts` — typed read queries
- `lib/actions.ts` — server actions for every mutation (auth, enrollment, progress, quiz grading, authoring, admin)
- `app/` — App Router pages; server components fetch data directly, small client components handle interactivity
- `components/` — shared UI, including a dependency-free markdown renderer for lesson content

Set `SESSION_SECRET` in the environment for production deployments.

## Production build

```bash
npm run build
npm start
```
