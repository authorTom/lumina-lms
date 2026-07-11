"use client";

import { useActionState } from "react";
import { addScormLesson, uploadScormPackage, type FormState } from "@/lib/actions";

export function ScormLibraryUploadForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadScormPackage, {});
  return (
    <form action={action} className="space-y-3">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <label className="label" htmlFor="library-scorm-file">
          SCORM package (.zip)
        </label>
        <input
          id="library-scorm-file"
          type="file"
          name="package"
          accept=".zip,application/zip"
          required
          className="block w-full text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="mt-1 text-xs text-zinc-500">
          The title and SCORM version are read from the package manifest. Once uploaded,
          the package can be added to any of your courses.
        </p>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Uploading…" : "Upload to library"}
      </button>
    </form>
  );
}

export function ScormUploadForm({
  moduleId,
  courseId,
}: {
  moduleId: number;
  courseId: number;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(addScormLesson, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="module_id" value={moduleId} />
      <input type="hidden" name="course_id" value={courseId} />
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <label className="label" htmlFor={`scorm-file-${moduleId}`}>
          SCORM package (.zip)
        </label>
        <input
          id={`scorm-file-${moduleId}`}
          type="file"
          name="package"
          accept=".zip,application/zip"
          required
          className="block w-full text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="mt-1 text-xs text-zinc-500">
          SCORM 1.2 and SCORM 2004 packages exported from tools like Articulate,
          Captivate, or iSpring. Completion and scores are tracked automatically.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
        <input
          name="title"
          placeholder="Lesson title (defaults to the package title)"
          className="input"
        />
        <input
          name="duration_minutes"
          type="number"
          min={1}
          defaultValue={15}
          className="input"
          aria-label="Duration in minutes"
        />
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Uploading…" : "Upload SCORM lesson"}
      </button>
    </form>
  );
}
