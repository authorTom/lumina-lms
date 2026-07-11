import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions";

function NavLinks({ role }: { role?: string }) {
  return (
    <>
      <Link href="/courses" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
        Catalog
      </Link>
      {role === "student" && (
        <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
          My learning
        </Link>
      )}
      {(role === "instructor" || role === "admin") && (
        <Link href="/instructor" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
          Courses
        </Link>
      )}
      {role === "admin" && (
        <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
          Admin
        </Link>
      )}
    </>
  );
}

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-zinc-900">
          <span className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            L
          </span>
          Lumina
        </Link>

        <div className="ml-4 hidden items-center gap-1 sm:flex">
          <NavLinks role={user?.role} />
        </div>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          {user ? (
            <>
              <span className="text-sm text-zinc-500">{user.name}</span>
              <form action={logout}>
                <button className="btn-secondary">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <details className="relative ml-auto sm:hidden">
          <summary className="btn-secondary list-none">Menu</summary>
          <div className="absolute right-0 mt-2 flex w-56 flex-col gap-1 rounded-xl bg-white p-2 shadow-lg ring-1 ring-zinc-200">
            <NavLinks role={user?.role} />
            {user ? (
              <form action={logout} className="mt-1 border-t border-zinc-100 pt-2">
                <button className="btn-secondary w-full">Sign out ({user.name})</button>
              </form>
            ) : (
              <div className="mt-1 flex flex-col gap-1 border-t border-zinc-100 pt-2">
                <Link href="/login" className="btn-secondary">
                  Log in
                </Link>
                <Link href="/register" className="btn-primary">
                  Get started
                </Link>
              </div>
            )}
          </div>
        </details>
      </nav>
    </header>
  );
}
