"use client";

import { useRef, useState } from "react";
import { Markdown } from "./markdown";

// Markdown editor with a formatting toolbar and a live preview tab.
// The preview uses the same <Markdown> renderer as the lesson player,
// so what instructors see is exactly what students get.
export function ContentEditor({
  name,
  defaultValue = "",
  rows = 12,
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const ref = useRef<HTMLTextAreaElement>(null);

  // A transform takes (text, selectionStart, selectionEnd) and returns the new
  // text plus the new selection. Transforms are pure; the ref is only touched
  // in edit(), which runs from click handlers — never during render.
  type Transform = (v: string, s: number, e: number) => [string, number, number];

  function edit(transform: Transform) {
    const ta = ref.current;
    if (!ta) return;
    const [next, selStart, selEnd] = transform(ta.value, ta.selectionStart, ta.selectionEnd);
    setValue(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  }

  const wrap =
    (before: string, after: string, sample: string): Transform =>
    (v, s, e) => {
      const sel = v.slice(s, e) || sample;
      const next = v.slice(0, s) + before + sel + after + v.slice(e);
      return [next, s + before.length, s + before.length + sel.length];
    };

  const prefixLines =
    (prefix: (i: number) => string): Transform =>
    (v, s, e) => {
      const start = v.lastIndexOf("\n", s - 1) + 1;
      const end = e > start ? e : s;
      const blockText = v.slice(start, end) || "List item";
      const prefixed = blockText
        .split("\n")
        .map((line, i) => prefix(i) + line)
        .join("\n");
      const next = v.slice(0, start) + prefixed + v.slice(end);
      return [next, start, start + prefixed.length];
    };

  const codeBlock: Transform = (v, s, e) => {
    const sel = v.slice(s, e) || "code here";
    const before = (s === 0 || v[s - 1] === "\n" ? "" : "\n") + "```\n";
    const insert = before + sel + "\n```\n";
    const next = v.slice(0, s) + insert + v.slice(e);
    return [next, s + before.length, s + before.length + sel.length];
  };

  const tools: { label: string; title: string; transform: Transform }[] = [
    { label: "H2", title: "Section heading", transform: prefixLines(() => "## ") },
    { label: "H3", title: "Subheading", transform: prefixLines(() => "### ") },
    { label: "B", title: "Bold", transform: wrap("**", "**", "bold text") },
    { label: "I", title: "Italic", transform: wrap("*", "*", "italic text") },
    { label: "<>", title: "Inline code", transform: wrap("`", "`", "code") },
    { label: "• List", title: "Bullet list", transform: prefixLines(() => "- ") },
    { label: "1. List", title: "Numbered list", transform: prefixLines((i) => `${i + 1}. `) },
    { label: "{ }", title: "Code block", transform: codeBlock },
  ];

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-zinc-300 focus-within:ring-2 focus-within:ring-indigo-500">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5">
        <div className="flex gap-0.5 rounded-lg bg-zinc-200/60 p-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors cursor-pointer ${
                tab === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="mx-1 h-4 w-px bg-zinc-200" />
        {tools.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            onClick={() => edit(tool.transform)}
            disabled={tab === "preview"}
            className="rounded-md px-2 py-1 font-mono text-xs font-medium text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-40 cursor-pointer"
          >
            {tool.label}
          </button>
        ))}
      </div>

      {/* The textarea stays mounted (hidden) in preview so the form still submits it. */}
      <textarea
        ref={ref}
        name={name}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        className={`w-full resize-y bg-white px-3 py-2 font-mono text-xs leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none ${
          tab === "preview" ? "hidden" : ""
        }`}
      />
      {tab === "preview" && (
        <div className="min-h-32 bg-white p-4 text-sm">
          {value.trim() ? (
            <Markdown content={value} />
          ) : (
            <p className="text-zinc-400">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
