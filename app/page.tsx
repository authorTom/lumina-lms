import Link from "next/link";
import { listPublishedCourses } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { CourseCard } from "@/components/course-card";

const FEATURES = [
  {
    title: "Structured courses",
    body: "Modules, lessons, and quizzes organized so you always know what's next.",
    icon: "📚",
  },
  {
    title: "Progress that sticks",
    body: "Every completed lesson and quiz score is tracked across all your courses.",
    icon: "📈",
  },
  {
    title: "Teach what you know",
    body: "Instructors get a full authoring suite: build courses, write lessons, add quizzes.",
    icon: "🎓",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  const courses = listPublishedCourses().slice(0, 3);

  return (
    <div>
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <p className="mb-4 inline-block rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
            Learning, organized
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Learn anything. Track everything.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600">
            Lumina is a clean, fast learning platform. Enroll in courses, work through
            lessons at your pace, and prove it with quizzes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/courses" className="btn-primary px-6 py-3 text-base">
              Browse courses
            </Link>
            {!user && (
              <Link href="/register" className="btn-secondary px-6 py-3 text-base">
                Create a free account
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="text-2xl">{f.icon}</div>
              <h2 className="mt-3 font-semibold text-zinc-900">{f.title}</h2>
              <p className="mt-1 text-sm text-zinc-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {courses.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Featured courses
            </h2>
            <Link href="/courses" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
