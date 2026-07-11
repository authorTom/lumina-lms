"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveScormData } from "@/lib/actions";

// SCORM runtime host. Installs the SCORM 1.2 (window.API) or SCORM 2004
// (window.API_1484_11) adapter that content discovers by walking parent
// windows, backs it with a flat CMI key/value store, and persists the store
// on Commit/Finish plus a safety interval.

const COMPLETE_STATUSES = new Set(["completed", "passed", "failed"]);

export function ScormPlayer({
  lessonId,
  version,
  launchUrl,
  initialCmi,
  learnerId,
  learnerName,
}: {
  lessonId: number;
  version: "1.2" | "2004";
  launchUrl: string;
  initialCmi: Record<string, string>;
  learnerId: string;
  learnerName: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string | null>(
    initialCmi["cmi.core.lesson_status"] ?? initialCmi["cmi.completion_status"] ?? null
  );
  const [score, setScore] = useState<string | null>(
    initialCmi["cmi.core.score.raw"] ?? initialCmi["cmi.score.raw"] ?? null
  );
  const [saving, setSaving] = useState(false);
  const cmiRef = useRef<Record<string, string>>({});
  const dirtyRef = useRef(false);
  const savedCompleteRef = useRef(false);

  useEffect(() => {
    const hasSuspend = !!initialCmi["cmi.suspend_data"];
    const is12 = version === "1.2";

    // Defaults per data model, overlaid with whatever was saved last session.
    const defaults: Record<string, string> = is12
      ? {
          "cmi.core.student_id": learnerId,
          "cmi.core.student_name": learnerName,
          "cmi.core.lesson_status": "not attempted",
          "cmi.core.entry": hasSuspend ? "resume" : "ab-initio",
          "cmi.core.lesson_mode": "normal",
          "cmi.core.credit": "credit",
          "cmi.core.total_time": "0000:00:00.00",
          "cmi.launch_data": "",
          "cmi.suspend_data": "",
        }
      : {
          "cmi.learner_id": learnerId,
          "cmi.learner_name": learnerName,
          "cmi.completion_status": "unknown",
          "cmi.success_status": "unknown",
          "cmi.entry": hasSuspend ? "resume" : "ab-initio",
          "cmi.mode": "normal",
          "cmi.credit": "credit",
          "cmi.total_time": "PT0S",
          "cmi.launch_data": "",
          "cmi.suspend_data": "",
        };
    const cmi: Record<string, string> = { ...defaults, ...initialCmi };
    cmiRef.current = cmi;

    const CHILDREN: Record<string, string> = is12
      ? {
          "cmi.core._children":
            "student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time",
          "cmi.core.score._children": "raw,min,max",
          "cmi.objectives._children": "id,score,status",
          "cmi.interactions._children":
            "id,objectives,time,type,correct_responses,weighting,student_response,result,latency",
        }
      : {
          "cmi._children":
            "comments_from_learner,comments_from_lms,completion_status,credit,entry,exit,interactions,launch_data,learner_id,learner_name,learner_preference,location,max_time_allowed,mode,objectives,progress_measure,scaled_passing_score,score,session_time,success_status,suspend_data,time_limit_action,total_time",
          "cmi.score._children": "scaled,raw,min,max",
          "cmi.objectives._children": "id,score,success_status,completion_status,description",
          "cmi.interactions._children":
            "id,type,objectives,timestamp,correct_responses,weighting,learner_response,result,latency,description",
        };

    let lastError = "0";
    let initialized = false;

    function countEntries(prefix: string): string {
      const indices = new Set<string>();
      for (const key of Object.keys(cmiRef.current)) {
        const match = key.startsWith(prefix + ".") && key.slice(prefix.length + 1).match(/^(\d+)\./);
        if (match) indices.add(match[1]);
      }
      return String(indices.size);
    }

    function getValue(key: string): string {
      if (CHILDREN[key]) return CHILDREN[key];
      if (key.endsWith("._count")) {
        return countEntries(key.slice(0, -"._count".length));
      }
      const value = cmiRef.current[key];
      if (value !== undefined) return value;
      lastError = is12 ? "201" : "401"; // undefined element
      return "";
    }

    function setValue(key: string, value: string): string {
      cmiRef.current[key] = String(value);
      dirtyRef.current = true;
      if (key === "cmi.core.lesson_status" || key === "cmi.completion_status") {
        setStatus(String(value));
      }
      if (key === "cmi.success_status" && value === "passed") setStatus("passed");
      if (key === "cmi.core.score.raw" || key === "cmi.score.raw") setScore(String(value));
      lastError = "0";
      return "true";
    }

    async function persist() {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setSaving(true);
      try {
        const result = await saveScormData(lessonId, JSON.stringify(cmiRef.current));
        if (
          result.status &&
          COMPLETE_STATUSES.has(result.status) &&
          !savedCompleteRef.current
        ) {
          savedCompleteRef.current = true;
          router.refresh(); // update sidebar checkmarks / progress
        }
      } catch {
        dirtyRef.current = true; // retry on next commit
      } finally {
        setSaving(false);
      }
    }

    const ERROR_STRINGS: Record<string, string> = {
      "0": "No error",
      "101": "General exception",
      "201": "Invalid argument / undefined element",
      "401": "Undefined data model element",
    };

    const api12 = {
      LMSInitialize: () => ((initialized = true), (lastError = "0"), "true"),
      LMSFinish: () => {
        if (!cmiRef.current["cmi.core.lesson_status"] ||
            cmiRef.current["cmi.core.lesson_status"] === "not attempted") {
          cmiRef.current["cmi.core.lesson_status"] = "completed";
          setStatus("completed");
        }
        dirtyRef.current = true;
        void persist();
        return "true";
      },
      LMSGetValue: getValue,
      LMSSetValue: setValue,
      LMSCommit: () => (void persist(), "true"),
      LMSGetLastError: () => lastError,
      LMSGetErrorString: (code: string) => ERROR_STRINGS[code] ?? "Unknown error",
      LMSGetDiagnostic: (code: string) => ERROR_STRINGS[code] ?? code,
    };

    const api2004 = {
      Initialize: () => ((initialized = true), (lastError = "0"), "true"),
      Terminate: () => {
        dirtyRef.current = true;
        void persist();
        return "true";
      },
      GetValue: getValue,
      SetValue: setValue,
      Commit: () => (void persist(), "true"),
      GetLastError: () => lastError,
      GetErrorString: (code: string) => ERROR_STRINGS[code] ?? "Unknown error",
      GetDiagnostic: (code: string) => ERROR_STRINGS[code] ?? code,
    };

    const w = window as unknown as Record<string, unknown>;
    if (is12) w.API = api12;
    else w.API_1484_11 = api2004;
    setReady(true);

    // Safety net: SCOs that rarely commit still get saved periodically,
    // and once more when the learner leaves the page.
    const interval = setInterval(() => void persist(), 15000);
    const onHide = () => void persist();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      void persist();
      if (is12) delete w.API;
      else delete w.API_1484_11;
      void initialized;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, version]);

  const statusBadge =
    status === "passed" || status === "completed"
      ? "bg-emerald-100 text-emerald-800"
      : status === "failed"
        ? "bg-red-100 text-red-800"
        : "bg-zinc-100 text-zinc-600";

  return (
    <div>
      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-2 text-xs text-zinc-500">
          <span className="badge bg-violet-100 text-violet-800">SCORM {version}</span>
          <span className={`badge ${statusBadge}`}>{status ?? "not attempted"}</span>
          {score !== null && score !== "" && <span>Score: {score}</span>}
          <span className="ml-auto">{saving ? "Saving…" : "Progress saves automatically"}</span>
        </div>
        {ready && (
          <iframe
            src={launchUrl}
            title="SCORM content"
            className="h-[70vh] w-full bg-white"
            allow="autoplay; fullscreen"
          />
        )}
      </div>
    </div>
  );
}
