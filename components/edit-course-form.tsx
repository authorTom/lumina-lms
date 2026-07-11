"use client";

import { useActionState } from "react";
import { updateCourse, type FormState } from "@/lib/actions";
import type { CourseSummary } from "@/lib/data";
import { CourseFields } from "./course-fields";

export function EditCourseForm({ course }: { course: CourseSummary }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateCourse, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="course_id" value={course.id} />
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : (
        state.ok && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Course details saved.
          </p>
        )
      )}
      <CourseFields course={course} />
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
