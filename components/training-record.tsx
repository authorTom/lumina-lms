import Link from "next/link";
import { listCompletions } from "@/lib/data";

function formatDate(iso: string): string {
  // Stored as UTC "YYYY-MM-DD HH:MM:SS"
  const date = new Date(iso.replace(" ", "T") + "Z");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function TrainingRecord({
  userId,
  emptyText,
}: {
  userId: number;
  emptyText: string;
}) {
  const completions = listCompletions(userId);

  if (completions.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyText}</p>;
  }

  return (
    <ol className="divide-y divide-zinc-100">
      {completions.map((completion) => (
        <li key={completion.id} className="flex flex-wrap items-center gap-2 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            ✓
          </span>
          <div className="min-w-0">
            {completion.course_id ? (
              <Link
                href={`/courses/${completion.course_id}`}
                className="font-medium text-zinc-900 hover:text-indigo-700"
              >
                {completion.course_title}
              </Link>
            ) : (
              <p className="font-medium text-zinc-900">
                {completion.course_title}
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  (course no longer available)
                </span>
              </p>
            )}
          </div>
          <span className="ml-auto text-sm text-zinc-500">
            Completed {formatDate(completion.completed_at)}
          </span>
        </li>
      ))}
    </ol>
  );
}
