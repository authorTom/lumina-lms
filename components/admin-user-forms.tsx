"use client";

import { useActionState, useState, useTransition } from "react";
import { createUser, resetPassword, setPassword, type FormState } from "@/lib/actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createUser, {});
  return (
    <form action={action} className="space-y-3">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="new-name" className="label">Full name</label>
          <input id="new-name" name="name" required className="input" />
        </div>
        <div>
          <label htmlFor="new-email" className="label">Email</label>
          <input id="new-email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label htmlFor="new-password" className="label">Initial password</label>
          <input id="new-password" name="password" type="text" required minLength={8} className="input font-mono" placeholder="min 8 characters" />
        </div>
        <div>
          <label htmlFor="new-role" className="label">Role</label>
          <select id="new-role" name="role" defaultValue="student" className="input">
            <option value="student">student</option>
            <option value="instructor">instructor</option>
            <option value="admin">admin</option>
          </select>
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}

export function PasswordPanel({ userId, userName }: { userId: number; userName: string }) {
  const [generated, setGenerated] = useState<string | null>(null);
  const [resetPending, startReset] = useTransition();
  const [setState, setAction, setPending] = useActionState<FormState, FormData>(
    setPassword.bind(null, userId),
    {}
  );
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-zinc-900">Reset password</p>
        <p className="text-sm text-zinc-500">
          Generates a random password for {userName}. It is shown once — copy it now.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            className="btn-secondary"
            disabled={resetPending}
            onClick={() =>
              startReset(async () => {
                const result = await resetPassword(userId);
                setGenerated(result.password);
              })
            }
          >
            {resetPending ? "Generating…" : "Generate new password"}
          </button>
          {generated && (
            <code className="rounded-lg bg-zinc-900 px-3 py-1.5 font-mono text-sm text-emerald-300">
              {generated}
            </code>
          )}
        </div>
      </div>

      <form
        action={(fd) => {
          setSaved(true);
          setAction(fd);
        }}
        className="border-t border-zinc-100 pt-4"
      >
        <p className="text-sm font-medium text-zinc-900">Set a specific password</p>
        {setState.error ? (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {setState.error}
          </p>
        ) : (
          saved &&
          !setPending && (
            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Password updated.
            </p>
          )
        )}
        <div className="mt-2 flex gap-2">
          <input
            name="password"
            type="text"
            required
            minLength={8}
            placeholder="New password (min 8 characters)"
            className="input max-w-xs font-mono"
          />
          <button type="submit" disabled={setPending} className="btn-secondary shrink-0">
            {setPending ? "Saving…" : "Set password"}
          </button>
        </div>
      </form>
    </div>
  );
}
