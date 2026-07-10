import Link from "next/link";
import type { Metadata } from "next";
import { listPublishedCourses, listCategories } from "@/lib/data";
import { CourseCard } from "@/components/course-card";

export const metadata: Metadata = { title: "Course catalog" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const courses = listPublishedCourses(q, category);
  const categories = listCategories();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Course catalog</h1>
      <p className="mt-1 text-zinc-500">
        {courses.length} course{courses.length === 1 ? "" : "s"}
        {category ? ` in ${category}` : ""}
        {q ? ` matching “${q}”` : ""}
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <form className="flex max-w-md flex-1 gap-2" action="/courses">
          {category && <input type="hidden" name="category" value={category} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search courses…"
            className="input"
            aria-label="Search courses"
          />
          <button type="submit" className="btn-secondary shrink-0">
            Search
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Link
            href={q ? `/courses?q=${encodeURIComponent(q)}` : "/courses"}
            className={`badge ring-1 ${!category ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-zinc-600 ring-zinc-300 hover:bg-zinc-100"}`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/courses?category=${encodeURIComponent(cat)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`badge ring-1 ${category === cat ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-zinc-600 ring-zinc-300 hover:bg-zinc-100"}`}
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="card mt-10 p-12 text-center text-zinc-500">
          No courses match your search.{" "}
          <Link href="/courses" className="font-medium text-indigo-600">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
