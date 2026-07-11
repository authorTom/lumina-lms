"use client";

import { useActionState } from "react";
import { changePassword, updateProfile, type FormState } from "@/lib/actions";

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});

  return (
    <form action={action} className="space-y-3">
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : (
        state.ok && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Name updated.
          </p>
        )
      )}
      <div>
        <label htmlFor="profile-name" className="label">Full name</label>
        <div className="flex gap-2">
          <input
            id="profile-name"
            name="name"
            required
            maxLength={100}
            defaultValue={name}
            autoComplete="name"
            className="input max-w-xs"
          />
          <button type="submit" disabled={pending} className="btn-secondary shrink-0">
            {pending ? "Saving…" : "Save name"}
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Shown on your courses, dashboards, and to instructors. Your email stays the same.
        </p>
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : (
        state.ok && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Password changed. Use it the next time you log in.
          </p>
        )
      )}
      <div>
        <label htmlFor="current_password" className="label">Current password</label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new_password" className="label">New password</label>
          <input
            id="new_password"
            name="new_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
          />
          <p className="mt-1 text-xs text-zinc-500">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm_password" className="label">Confirm new password</label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
          />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
