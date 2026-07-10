import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Welcome back</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-500">Log in to continue learning.</p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-zinc-500">
          New here?{" "}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-800">
            Create an account
          </Link>
        </p>
      </div>
      <div className="card mt-4 p-4 text-sm text-zinc-600">
        <p className="font-medium text-zinc-800">Demo accounts (password: password123)</p>
        <ul className="mt-1 space-y-0.5">
          <li>student@lms.dev — student</li>
          <li>sarah@lms.dev — instructor</li>
          <li>admin@lms.dev — admin</li>
        </ul>
      </div>
    </div>
  );
}
