"use client";

import { useActionState } from "react";
import { createCourse, type FormState } from "@/lib/actions";
import { CourseFields } from "./course-fields";

export function NewCourseForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createCourse, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      <CourseFields />
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Creating…" : "Create course"}
      </button>
    </form>
  );
}
