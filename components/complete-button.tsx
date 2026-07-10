"use client";

import { useTransition } from "react";
import { toggleLessonComplete } from "@/lib/actions";

export function CompleteButton({
  lessonId,
  courseId,
  completed,
}: {
  lessonId: number;
  courseId: number;
  completed: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(() => toggleLessonComplete(lessonId, courseId, !completed))
      }
      className={completed ? "btn-secondary" : "btn-primary"}
    >
      {completed ? (
        <>
          <span className="text-emerald-600">✓</span> Completed — undo
        </>
      ) : (
        "Mark as complete"
      )}
    </button>
  );
}
