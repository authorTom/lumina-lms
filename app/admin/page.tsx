import Link from "next/link";
import type { Metadata } from "next";
import { listUsers, listGroups, platformStats } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { createGroup, deleteGroup } from "@/lib/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { CreateUserForm } from "@/components/admin-user-forms";

export const metadata: Metadata = { title: "Admin" };

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-rose-100 text-rose-800",
  instructor: "bg-violet-100 text-violet-800",
  student: "bg-sky-100 text-sky-800",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const admin = await requireUser("admin");
  const { group } = await searchParams;
  const groupId = group ? Number(group) : undefined;
  const users = listUsers(groupId);
  const groups = listGroups();
  const stats = platformStats();
  const activeGroup = groups.find((g) => g.id === groupId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Admin</h1>
      <p className="mt-1 text-zinc-500">Platform overview, users, and account groups.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Users", value: stats.users },
          { label: "Published courses", value: stats.courses },
          { label: "Enrollments", value: stats.enrollments },
          { label: "Lessons completed", value: stats.lessonsCompleted },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-zinc-500">
        Courses are managed in the{" "}
        <Link href="/instructor" className="font-medium text-indigo-600 hover:text-indigo-800">
          Courses section
        </Link>
        , which lists every course on the platform.
      </p>

      {/* Create user */}
      <details className="card mt-8 overflow-hidden">
        <summary className="cursor-pointer px-6 py-4 font-medium text-zinc-900 hover:bg-zinc-50">
          + Create user
        </summary>
        <div className="border-t border-zinc-100 p-6">
          <CreateUserForm />
        </div>
      </details>

      {/* Account groups */}
      <h2 className="mt-10 text-xl font-semibold tracking-tight text-zinc-900">
        Account groups ({groups.length})
      </h2>
      <div className="card mt-4 p-5">
        {groups.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No groups yet. Groups help you organise users — e.g. cohorts, departments, or
            teams — and filter the user list.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <li
                key={g.id}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 ${
                  g.id === groupId
                    ? "bg-indigo-600 text-white ring-indigo-600"
                    : "bg-white text-zinc-700 ring-zinc-300"
                }`}
              >
                <Link href={g.id === groupId ? "/admin" : `/admin?group=${g.id}`} className="hover:underline">
                  {g.name}
                </Link>
                <span className={g.id === groupId ? "text-indigo-200" : "text-zinc-400"}>
                  {g.member_count}
                </span>
                <ConfirmButton
                  action={deleteGroup.bind(null, g.id)}
                  message={`Delete group “${g.name}”? Members are kept — they just leave the group.`}
                  className={`cursor-pointer ${
                    g.id === groupId ? "text-indigo-200 hover:text-white" : "text-zinc-400 hover:text-red-600"
                  }`}
                >
                  ×
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
        <form action={createGroup} className="mt-4 flex gap-2">
          <input name="name" required maxLength={60} placeholder="New group name" className="input max-w-xs" />
          <button className="btn-secondary shrink-0">+ Add group</button>
        </form>
      </div>

      {/* Users */}
      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          Users ({users.length}){activeGroup ? ` in ${activeGroup.name}` : ""}
        </h2>
        {activeGroup && (
          <Link href="/admin" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            Show all users
          </Link>
        )}
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-500 uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Groups</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((u) => (
              <tr key={u.id} className={`hover:bg-zinc-50 ${u.disabled ? "opacity-60" : ""}`}>
                <td className="px-5 py-3">
                  <p className="font-medium text-zinc-900">
                    {u.name}
                    {u.id === admin.id && <span className="ml-2 text-xs text-zinc-400">(you)</span>}
                  </p>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                </td>
                <td className="px-5 py-3">
                  <span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`badge ${
                      u.disabled ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {u.disabled ? "Disabled" : "Active"}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-zinc-600">{u.group_names ?? "—"}</td>
                <td className="px-5 py-3 text-zinc-600">{u.created_at.slice(0, 10)}</td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
