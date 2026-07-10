import { notFound } from "next/navigation";
import { getQuiz, getAttempts } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { QuizForm } from "@/components/quiz-form";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const { courseId: courseIdParam, quizId: quizIdParam } = await params;
  const courseId = Number(courseIdParam);
  const quizId = Number(quizIdParam);
  const user = await requireUser();

  const quiz = getQuiz(quizId);
  if (!quiz || quiz.course_id !== courseId) notFound();

  const attempts = getAttempts(user.id, quizId);

  // Strip correct-answer flags before sending to the client.
  const questions = quiz.questions.map((q) => ({
    id: q.id,
    text: q.text,
    choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
  }));

  return (
    <div>
      <p className="text-sm font-medium text-violet-600">{quiz.module_title}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        {quiz.title}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {quiz.questions.length} questions · {quiz.pass_pct}% to pass
        {attempts.length > 0 &&
          ` · best score so far: ${Math.max(...attempts.map((a) => a.score_pct))}%`}
      </p>

      <div className="mt-6">
        {questions.length === 0 ? (
          <p className="card p-6 text-sm text-zinc-500">
            This quiz has no questions yet.
          </p>
        ) : (
          <QuizForm quizId={quizId} passPct={quiz.pass_pct} questions={questions} />
        )}
      </div>

      {attempts.length > 0 && (
        <div className="card mt-8 p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Previous attempts</h2>
          <ul className="mt-2 divide-y divide-zinc-100 text-sm">
            {attempts.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span className="text-zinc-500">{a.created_at}</span>
                <span
                  className={`badge ${
                    a.passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {a.score_pct}% · {a.passed ? "Passed" : "Failed"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
