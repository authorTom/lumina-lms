"use client";

import { useActionState } from "react";
import { login, register, type FormState } from "@/lib/actions";

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {error}
    </p>
  );
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <ErrorNote error={state.error} />
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      <SubmitButton pending={pending}>Log in</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});
  return (
    <form action={action} className="space-y-4">
      <ErrorNote error={state.error} />
      <div>
        <label htmlFor="name" className="label">Full name</label>
        <input id="name" name="name" required autoComplete="name" className="input" />
      </div>
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        <p className="mt-1 text-xs text-zinc-500">At least 8 characters.</p>
      </div>
      <fieldset>
        <legend className="label">I want to</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-zinc-300 has-checked:bg-indigo-50 has-checked:ring-indigo-500">
            <input type="radio" name="role" value="student" defaultChecked className="accent-indigo-600" />
            Learn
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-zinc-300 has-checked:bg-indigo-50 has-checked:ring-indigo-500">
            <input type="radio" name="role" value="instructor" className="accent-indigo-600" />
            Teach
          </label>
        </div>
      </fieldset>
      <SubmitButton pending={pending}>Create account</SubmitButton>
    </form>
  );
}
