"use client";

import { useTransition } from "react";
import { setUserRole } from "@/lib/actions";

export function RoleSelect({ userId, role }: { userId: number; role: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={role}
      disabled={pending}
      onChange={(e) => startTransition(() => setUserRole(userId, e.target.value))}
      className="input w-auto py-1 text-xs"
      aria-label="Change role"
    >
      <option value="student">student</option>
      <option value="instructor">instructor</option>
      <option value="admin">admin</option>
    </select>
  );
}
