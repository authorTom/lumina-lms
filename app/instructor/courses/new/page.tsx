import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { NewCourseForm } from "@/components/new-course-form";

export const metadata: Metadata = { title: "New course" };

export default async function NewCoursePage() {
  await requireUser("instructor", "admin");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Create a course</h1>
      <p className="mt-1 mb-6 text-zinc-500">
        Start with the basics — you&apos;ll add modules and lessons next.
      </p>
      <div className="card p-6">
        <NewCourseForm />
      </div>
    </div>
  );
}
