import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ChangePasswordForm, ProfileForm } from "@/components/account-forms";

export const metadata: Metadata = { title: "My account" };

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-rose-100 text-rose-800",
  instructor: "bg-violet-100 text-violet-800",
  student: "bg-sky-100 text-sky-800",
};

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">My account</h1>

      <div className="card mt-6 flex items-center gap-4 p-6">
        <div className="grid size-12 place-items-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
          {user.name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div>
          <p className="font-semibold text-zinc-900">{user.name}</p>
          <p className="text-sm text-zinc-500">{user.email}</p>
        </div>
        <span className={`badge ml-auto ${ROLE_BADGE[user.role]}`}>{user.role}</span>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-semibold text-zinc-900">Profile</h2>
        <p className="mt-1 mb-5 text-sm text-zinc-500">Update the name shown across Lumina.</p>
        <ProfileForm name={user.name} />
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-semibold text-zinc-900">Change password</h2>
        <p className="mt-1 mb-5 text-sm text-zinc-500">
          Enter your current password, then choose a new one.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
