import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUser, listGroups, userGroupIds } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { deleteUser, setUserDisabled, setUserGroups } from "@/lib/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { RoleSelect } from "@/components/role-select";
import { PasswordPanel, RenameUserForm } from "@/components/admin-user-forms";
import { TrainingRecord } from "@/components/training-record";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-rose-100 text-rose-800",
  instructor: "bg-violet-100 text-violet-800",
  student: "bg-sky-100 text-sky-800",
};

export default async function ManageUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireUser("admin");
  const { id } = await params;
  const userId = Number(id);
  const user = getAdminUser(userId);
  if (!user) notFound();

  const isSelf = user.id === admin.id;
  const groups = listGroups();
  const memberOf = userGroupIds(userId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/admin" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
        ← Admin
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {user.name}
            {isSelf && <span className="ml-2 text-base font-normal text-zinc-400">(you)</span>}
          </h1>
          <p className="mt-1 text-zinc-500">{user.email}</p>
        </div>
        <span
          className={`badge ${
            user.disabled ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {user.disabled ? "Disabled" : "Active"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {[
          { label: "Enrollments", value: user.enrollment_count },
          { label: "Courses taught", value: user.course_count },
          { label: "Joined", value: user.created_at.slice(0, 10) },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <p className="text-lg font-bold text-zinc-900">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Name, role & status */}
      <div className="card mt-6 space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">Name</p>
            <p className="text-sm text-zinc-500">The display name shown across the platform.</p>
          </div>
          <RenameUserForm userId={user.id} name={user.name} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <div>
            <p className="text-sm font-medium text-zinc-900">Role</p>
            <p className="text-sm text-zinc-500">Controls what this user can access.</p>
          </div>
          {isSelf ? (
            <span className={`badge ${ROLE_BADGE[user.role]}`}>{user.role}</span>
          ) : (
            <RoleSelect userId={user.id} role={user.role} />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <div>
            <p className="text-sm font-medium text-zinc-900">Account status</p>
            <p className="text-sm text-zinc-500">
              Disabled accounts can&apos;t log in, and existing sessions stop working immediately.
            </p>
          </div>
          {isSelf ? (
            <p className="text-sm text-zinc-400">You can&apos;t disable your own account.</p>
          ) : (
            <form action={setUserDisabled.bind(null, user.id, !user.disabled)}>
              <button className={user.disabled ? "btn-primary" : "btn-danger"}>
                {user.disabled ? "Enable account" : "Disable account"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Training record */}
      <div className="card mt-6 p-6">
        <p className="text-sm font-medium text-zinc-900">Training record</p>
        <p className="mb-3 text-sm text-zinc-500">
          Courses this user has completed. Records are permanent — they survive
          unenrollment and course deletion.
        </p>
        <TrainingRecord userId={user.id} emptyText="No completed courses yet." />
      </div>

      {/* Password */}
      <div className="card mt-6 p-6">
        <PasswordPanel userId={user.id} userName={user.name.split(" ")[0]} />
      </div>

      {/* Groups */}
      <div className="card mt-6 p-6">
        <p className="text-sm font-medium text-zinc-900">Account groups</p>
        {groups.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-500">
            No groups exist yet — create them on the{" "}
            <Link href="/admin" className="font-medium text-indigo-600 hover:text-indigo-800">
              admin page
            </Link>
            .
          </p>
        ) : (
          <form action={setUserGroups.bind(null, user.id)} className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <label
                  key={g.id}
                  className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 ring-zinc-300 has-checked:bg-indigo-50 has-checked:ring-indigo-500"
                >
                  <input
                    type="checkbox"
                    name={`group_${g.id}`}
                    defaultChecked={memberOf.has(g.id)}
                    className="accent-indigo-600"
                  />
                  {g.name}
                </label>
              ))}
            </div>
            <button className="btn-secondary">Save groups</button>
          </form>
        )}
      </div>

      {/* Danger zone */}
      {!isSelf && (
        <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-5 ring-red-200">
          <div>
            <p className="font-medium text-zinc-900">Delete this user</p>
            <p className="text-sm text-zinc-500">
              Removes the account, its enrollments and progress, and any courses it teaches.
              Cannot be undone.
            </p>
          </div>
          <ConfirmButton
            action={deleteUser.bind(null, user.id)}
            message={`Permanently delete ${user.name}? Their enrollments, progress, and any courses they teach will be removed. This cannot be undone.`}
          >
            Delete user
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
