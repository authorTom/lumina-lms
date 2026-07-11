import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getCourse,
  getCourseOutline,
  getQuiz,
  courseStudents,
  getCourseInstructorId,
  listScormPackages,
} from "@/lib/data";
import { requireUser } from "@/lib/auth";
import {
  togglePublish,
  deleteCourse,
  addModule,
  deleteModule,
  addLesson,
  deleteLesson,
  createQuiz,
  deleteQuiz,
  addQuestion,
  deleteQuestion,
  attachScormLesson,
} from "@/lib/actions";
import { EditCourseForm } from "@/components/edit-course-form";
import { ContentEditor } from "@/components/content-editor";
import { ScormUploadForm } from "@/components/scorm-upload-form";
import { ConfirmButton } from "@/components/confirm-button";
import { ProgressBar } from "@/components/progress-bar";

export default async function ManageCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const courseId = Number(id);
  const user = await requireUser("instructor", "admin");

  const course = getCourse(courseId);
  if (!course) notFound();

  // Only the owning instructor (or an admin) may manage a course.
  if (user.role !== "admin" && getCourseInstructorId(courseId) !== user.id) {
    redirect("/instructor");
  }

  const outline = getCourseOutline(courseId);
  const scormLibrary = listScormPackages();

  const students = courseStudents(courseId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/instructor" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
        ← Courses
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{course.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {course.lesson_count} lessons · {course.student_count} students ·{" "}
            <span className={course.published ? "text-emerald-600" : "text-zinc-500"}>
              {course.published ? "Published" : "Draft"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/learn/${courseId}`} className="btn-secondary">
            Preview content
          </Link>
          <Link href={`/courses/${courseId}`} className="btn-secondary">
            View public page
          </Link>
          <form action={togglePublish.bind(null, courseId)}>
            <button className={course.published ? "btn-secondary" : "btn-primary"}>
              {course.published ? "Unpublish" : "Publish"}
            </button>
          </form>
        </div>
      </div>

      {/* Course details */}
      <details className="card mt-8 overflow-hidden">
        <summary className="cursor-pointer px-6 py-4 font-medium text-zinc-900 hover:bg-zinc-50">
          Edit course details
        </summary>
        <div className="border-t border-zinc-100 p-6">
          <EditCourseForm course={course} />
        </div>
      </details>

      {/* Curriculum */}
      <h2 className="mt-10 text-xl font-semibold tracking-tight text-zinc-900">Curriculum</h2>
      <div className="mt-4 space-y-6">
        {outline.map((mod, mi) => {
          const quiz = mod.quiz ? getQuiz(mod.quiz.id) : undefined;
          return (
            <div key={mod.id} className="card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                <h3 className="font-medium text-zinc-900">
                  Module {mi + 1}: {mod.title}
                </h3>
                <ConfirmButton
                  action={deleteModule.bind(null, mod.id, courseId)}
                  message={`Delete module “${mod.title}” and all its lessons?`}
                  className="text-xs text-zinc-400 hover:text-red-600 cursor-pointer"
                >
                  Delete module
                </ConfirmButton>
              </div>

              <ul className="divide-y divide-zinc-100">
                {mod.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="text-zinc-400">▶</span>
                    <span className="text-zinc-800">{lesson.title}</span>
                    {lesson.scorm_package_id && (
                      <span className="badge bg-violet-100 text-violet-800">SCORM</span>
                    )}
                    <span className="text-xs text-zinc-400">{lesson.duration_minutes} min</span>
                    <span className="ml-auto flex items-center gap-3">
                      <Link
                        href={`/learn/${courseId}/${lesson.id}`}
                        className="text-zinc-500 hover:text-zinc-800"
                      >
                        View
                      </Link>
                      <Link
                        href={`/instructor/courses/${courseId}/lessons/${lesson.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Edit
                      </Link>
                      <ConfirmButton
                        action={deleteLesson.bind(null, lesson.id, courseId)}
                        message={`Delete lesson “${lesson.title}”?`}
                        className="text-zinc-400 hover:text-red-600 cursor-pointer"
                      >
                        Delete
                      </ConfirmButton>
                    </span>
                  </li>
                ))}
              </ul>

              <details className="border-t border-zinc-100">
                <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-indigo-600 hover:bg-zinc-50">
                  + Add lesson
                </summary>
                <form action={addLesson.bind(null, mod.id, courseId)} className="space-y-3 px-5 pb-5">
                  <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
                    <input name="title" required placeholder="Lesson title" className="input" />
                    <input
                      name="duration_minutes"
                      type="number"
                      min={1}
                      defaultValue={5}
                      className="input"
                      aria-label="Duration in minutes"
                    />
                  </div>
                  <input
                    name="video_url"
                    type="url"
                    placeholder="Video URL (YouTube or Vimeo, optional)"
                    className="input"
                  />
                  <ContentEditor
                    name="content"
                    rows={6}
                    placeholder="Lesson content — use the toolbar or type markdown, and check the Preview tab."
                  />
                  <button className="btn-primary">Add lesson</button>
                </form>
              </details>

              <details className="border-t border-zinc-100">
                <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-indigo-600 hover:bg-zinc-50">
                  + Add SCORM lesson
                </summary>
                <div className="space-y-5 px-5 pb-5">
                  {scormLibrary.length > 0 && (
                    <form action={attachScormLesson} className="space-y-3">
                      <input type="hidden" name="module_id" value={mod.id} />
                      <input type="hidden" name="course_id" value={courseId} />
                      <p className="text-sm font-medium text-zinc-900">From the library</p>
                      <select name="package_id" required className="input" defaultValue="">
                        <option value="" disabled>
                          Choose a package…
                        </option>
                        {scormLibrary.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.title} (SCORM {pkg.version})
                          </option>
                        ))}
                      </select>
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
                      <button className="btn-primary">Add from library</button>
                      <p className="text-xs text-zinc-500">
                        Manage packages in the{" "}
                        <Link href="/instructor/scorm" className="font-medium text-indigo-600 hover:text-indigo-800">
                          SCORM library
                        </Link>
                        .
                      </p>
                    </form>
                  )}
                  <div className={scormLibrary.length > 0 ? "border-t border-zinc-100 pt-4" : ""}>
                    {scormLibrary.length > 0 && (
                      <p className="mb-3 text-sm font-medium text-zinc-900">Or upload a new package</p>
                    )}
                    <ScormUploadForm moduleId={mod.id} courseId={courseId} />
                  </div>
                </div>
              </details>

              {/* Quiz */}
              <div className="border-t border-zinc-100 bg-violet-50/40">
                {quiz ? (
                  <details>
                    <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm hover:bg-violet-50">
                      <span className="font-medium text-violet-800">
                        ✎ {quiz.title} · {quiz.questions.length} question
                        {quiz.questions.length === 1 ? "" : "s"}
                      </span>
                      <span className="flex items-center gap-3 text-xs">
                        <Link
                          href={`/learn/${courseId}/quiz/${quiz.id}`}
                          className="text-zinc-500 hover:text-zinc-800"
                        >
                          View
                        </Link>
                        <span className="text-zinc-500">manage</span>
                      </span>
                    </summary>
                    <div className="space-y-4 px-5 pb-5">
                      <ul className="space-y-2">
                        {quiz.questions.map((q, qi) => (
                          <li key={q.id} className="rounded-lg bg-white p-3 text-sm ring-1 ring-zinc-200">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-zinc-900">
                                {qi + 1}. {q.text}
                              </p>
                              <ConfirmButton
                                action={deleteQuestion.bind(null, q.id, courseId)}
                                message="Delete this question?"
                                className="text-xs text-zinc-400 hover:text-red-600 cursor-pointer shrink-0"
                              >
                                Delete
                              </ConfirmButton>
                            </div>
                            <ul className="mt-1 space-y-0.5 text-zinc-600">
                              {q.choices.map((c) => (
                                <li key={c.id}>
                                  {c.is_correct ? (
                                    <span className="font-medium text-emerald-700">✓ {c.text}</span>
                                  ) : (
                                    <span>· {c.text}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>

                      <form action={addQuestion.bind(null, quiz.id, courseId)} className="space-y-2 rounded-lg bg-white p-3 ring-1 ring-zinc-200">
                        <p className="text-sm font-medium text-zinc-900">Add question</p>
                        <input name="text" required placeholder="Question text" className="input" />
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correct"
                              value={i}
                              defaultChecked={i === 0}
                              className="accent-emerald-600"
                              aria-label={`Choice ${i + 1} is correct`}
                            />
                            <input
                              name={`choice_${i}`}
                              placeholder={`Choice ${i + 1}${i < 2 ? "" : " (optional)"}`}
                              required={i < 2}
                              className="input"
                            />
                          </div>
                        ))}
                        <p className="text-xs text-zinc-500">Select the radio next to the correct answer.</p>
                        <button className="btn-primary">Add question</button>
                      </form>

                      <ConfirmButton
                        action={deleteQuiz.bind(null, quiz.id, courseId)}
                        message={`Delete quiz “${quiz.title}” and its questions?`}
                        className="text-xs text-zinc-400 hover:text-red-600 cursor-pointer"
                      >
                        Delete quiz
                      </ConfirmButton>
                    </div>
                  </details>
                ) : (
                  <form action={createQuiz.bind(null, mod.id, courseId)} className="flex items-center gap-2 px-5 py-3">
                    <input
                      name="title"
                      placeholder="Quiz title (e.g. Module check)"
                      className="input max-w-xs"
                    />
                    <button className="btn-secondary shrink-0 text-violet-700">+ Add quiz</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form action={addModule.bind(null, courseId)} className="card mt-6 flex items-center gap-2 p-4">
        <input name="title" required placeholder="New module title" className="input" />
        <button className="btn-primary shrink-0">+ Add module</button>
      </form>

      {/* Students */}
      <h2 className="mt-10 text-xl font-semibold tracking-tight text-zinc-900">
        Students ({students.length})
      </h2>
      {students.length === 0 ? (
        <p className="card mt-4 p-6 text-sm text-zinc-500">No one has enrolled yet.</p>
      ) : (
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Enrolled</th>
                <th className="px-5 py-3 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {students.map((s) => {
                const pct = course.lesson_count > 0 ? (s.completed_count / course.lesson_count) * 100 : 0;
                return (
                  <tr key={s.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-900">{s.name}</p>
                      <p className="text-xs text-zinc-500">{s.email}</p>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{s.enrolled_at.slice(0, 10)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={pct} className="w-28" />
                        <span className="text-xs text-zinc-600">{Math.round(pct)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Danger zone */}
      <div className="card mt-10 flex items-center justify-between p-5 ring-red-200">
        <div>
          <p className="font-medium text-zinc-900">Delete this course</p>
          <p className="text-sm text-zinc-500">
            Moves the course to the recycle bin. It disappears for students but can be
            restored — with all content and progress — from the Courses page.
          </p>
        </div>
        <ConfirmButton
          action={deleteCourse.bind(null, courseId)}
          message={`Move “${course.title}” to the recycle bin? Students will lose access until it's restored.`}
        >
          Delete course
        </ConfirmButton>
      </div>
    </div>
  );
}
