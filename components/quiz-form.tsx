"use client";

import { useState, useTransition } from "react";
import { submitQuiz, type QuizResult } from "@/lib/actions";

// Choices are passed without the is_correct flag so answers never reach the
// client before submission; the result reveals them for feedback.
export interface ClientQuestion {
  id: number;
  text: string;
  choices: { id: number; text: string }[];
}

export function QuizForm({
  quizId,
  passPct,
  questions,
}: {
  quizId: number;
  passPct: number;
  questions: ClientQuestion[];
}) {
  const [result, setResult] = useState<QuizResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [pending, startTransition] = useTransition();

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setResult(await submitQuiz(quizId, formData));
    });
  }

  if (result) {
    const correctSet = new Set(result.correctChoiceIds);
    return (
      <div className="space-y-6">
        <div
          className={`card p-6 text-center ${
            result.passed ? "ring-emerald-300" : "ring-red-300"
          }`}
        >
          <p className="text-5xl font-bold text-zinc-900">{result.scorePct}%</p>
          <p className={`mt-2 font-medium ${result.passed ? "text-emerald-700" : "text-red-700"}`}>
            {result.passed
              ? "Passed — nice work!"
              : `Not quite — you need ${passPct}% to pass.`}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {result.correct} of {result.total} questions correct
          </p>
          {!result.passed && (
            <button
              className="btn-primary mt-4"
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
            >
              Try again
            </button>
          )}
        </div>

        <ol className="space-y-4">
          {questions.map((q, i) => {
            const chosen = answers[q.id];
            return (
              <li key={q.id} className="card p-5">
                <p className="font-medium text-zinc-900">
                  {i + 1}. {q.text}
                </p>
                <ul className="mt-3 space-y-2">
                  {q.choices.map((c) => {
                    const isCorrect = correctSet.has(c.id);
                    const isChosen = chosen === c.id;
                    let cls = "ring-zinc-200 text-zinc-600";
                    if (isCorrect) cls = "ring-emerald-400 bg-emerald-50 text-emerald-900";
                    else if (isChosen) cls = "ring-red-400 bg-red-50 text-red-900";
                    return (
                      <li key={c.id} className={`rounded-lg px-3 py-2 text-sm ring-1 ${cls}`}>
                        {c.text}
                        {isCorrect && <span className="ml-2 text-xs font-medium">Correct answer</span>}
                        {isChosen && !isCorrect && (
                          <span className="ml-2 text-xs font-medium">Your answer</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <ol className="space-y-4">
        {questions.map((q, i) => (
          <li key={q.id} className="card p-5">
            <p className="font-medium text-zinc-900">
              {i + 1}. {q.text}
            </p>
            <div className="mt-3 space-y-2">
              {q.choices.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 has-checked:bg-indigo-50 has-checked:ring-indigo-500"
                >
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={c.id}
                    required
                    className="accent-indigo-600"
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: c.id }))}
                  />
                  {c.text}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <button type="submit" disabled={pending || !allAnswered} className="btn-primary w-full">
        {pending ? "Grading…" : "Submit answers"}
      </button>
      {!allAnswered && (
        <p className="text-center text-sm text-zinc-500">Answer every question to submit.</p>
      )}
    </form>
  );
}
