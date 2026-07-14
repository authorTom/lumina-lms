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
- **Instructor studio** — create courses, add modules/lessons/quizzes, edit lesson content, publish/unpublish, and view per-student progress. Lesson content is written in a markdown editor with a formatting toolbar and a live Preview tab that renders exactly like the lesson player. Course banners (page header + catalog thumbnail) can be a solid colour or an uploaded image.
- **Course reviews** — each course can carry a review period (3/6/12/24 months) set at creation or in its details. A staff review dashboard shows every course's status (overdue / due soon / up to date / no schedule) with due dates, last-reviewed and last-updated timestamps — content edits update the latter automatically — and a one-click "Mark reviewed" that restarts the clock.
- **Enrollment policies** — each course is either open to self-enrollment or "by allocation only": staff assign individual students or whole account groups from the course manager, remove enrollments (progress is kept), and allocation-only courses hide the enroll button behind an explanatory note.
- **Staff access** — instructors and admins never enroll: a shared Courses section lists every course on the platform, all content is viewable directly (a banner marks preview mode), and managing remains limited to the owning instructor or an admin.
- **SCORM support** — upload SCORM 1.2 or SCORM 2004 zip packages (from Articulate, Captivate, iSpring, etc.) as lessons. The built-in runtime exposes the SCORM JavaScript API, persists the CMI data model (completion, score, suspend data) for resume, and mirrors completion into normal lesson progress. Content is extracted to `data/scorm/` and served through an authenticated route.
- **SCORM library** — packages live in a shared library: upload once (there or directly from a course), attach to any number of courses, see per-package usage, and delete unused packages (files included). Deletion is blocked while lessons still use a package, and admins can sweep orphaned directories left by interrupted uploads.
- **Recycle bin** — deleting a course soft-deletes it: it vanishes from the catalog and dashboards but keeps all content and student progress, and can be restored or permanently purged from the Courses page (admins see every deleted course, instructors their own).
- **Admin** — platform stats plus full user management: create users, change roles, enable/disable accounts (disabled users can't log in and live sessions end immediately), reset passwords to a generated value or set a specific one, delete users, and organise users into account groups with group filtering.

## Architecture

- `lib/db.ts` — SQLite connection, schema migration, and first-run seeding
- `lib/auth.ts` — HMAC-signed cookie sessions and role guards
- `lib/data.ts` — typed read queries
- `lib/actions.ts` — server actions for every mutation (auth, enrollment, progress, quiz grading, authoring, admin)
- `app/` — App Router pages; server components fetch data directly, small client components handle interactivity
- `components/` — shared UI, including a dependency-free markdown renderer for lesson content

Set `SESSION_SECRET` in the environment for production deployments. In production
(`NODE_ENV=production`) the app **requires** it and will refuse to sign sessions
without it — generate one with `openssl rand -base64 32`.

## Production build

```bash
npm run build
npm start
```

## Docker

The app ships as a self-contained image built from Next.js [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output):
a multi-stage build that compiles the native SQLite module, then copies only the
runtime server, static assets, and `public/` into a slim Debian base that runs as
an unprivileged user.

All state — the SQLite database, extracted SCORM packages, and uploaded images —
lives under `/app/data`, which is exposed as a volume so it survives container
restarts and image upgrades.

### With Docker Compose (recommended)

```bash
cp .env.example .env          # then set SESSION_SECRET in .env
docker compose up -d --build
```

The app is served on http://localhost:3000. Data is stored in the named volume
`lumina-data`; the database is created and seeded on first request.

### With plain Docker

```bash
docker build -t lumina-lms .
docker run -d --name lumina \
  -p 3000:3000 \
  -e SESSION_SECRET="$(openssl rand -base64 32)" \
  -v lumina-data:/app/data \
  lumina-lms
```

Notes:

- **`SESSION_SECRET` is required** — the container starts, but signing a session
  (logging in) throws without it. Keep the value stable across deploys, or all
  existing sessions are invalidated.
- **Back up the volume**, not the container — everything persistent is in
  `/app/data`.
- The image defines a `HEALTHCHECK`; `docker ps` shows `healthy` once it's ready.
- Uploads are capped at 200 MB (SCORM) via the server action body-size limit; put
  a reverse proxy in front for TLS and its own request-size limits in production.
