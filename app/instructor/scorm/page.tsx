import Link from "next/link";
import type { Metadata } from "next";
import { listScormPackages } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { listOrphanedScormDirs } from "@/lib/scorm";
import { deleteScormPackage, cleanupScormOrphans } from "@/lib/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { ScormLibraryUploadForm } from "@/components/scorm-upload-form";

export const metadata: Metadata = { title: "SCORM library" };

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export default async function ScormLibraryPage() {
  const user = await requireUser("instructor", "admin");
  const packages = listScormPackages();
  const orphans = user.role === "admin" ? listOrphanedScormDirs() : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/instructor" className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
        ← Courses
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">SCORM library</h1>
      <p className="mt-1 text-zinc-500">
        Shared across all instructors — upload a package once, then add it to any course
        from the course manager.
      </p>

      <details className="card mt-8 overflow-hidden" open={packages.length === 0}>
        <summary className="cursor-pointer px-6 py-4 font-medium text-zinc-900 hover:bg-zinc-50">
          + Upload package
        </summary>
        <div className="border-t border-zinc-100 p-6">
          <ScormLibraryUploadForm />
        </div>
      </details>

      {packages.length === 0 ? (
        <p className="card mt-6 p-8 text-center text-sm text-zinc-500">
          No packages yet. Upload a SCORM 1.2 or 2004 zip to get started.
        </p>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 font-medium">Version</th>
                <th className="px-5 py-3 font-medium">Size</th>
                <th className="px-5 py-3 font-medium">Uploaded</th>
                <th className="px-5 py-3 font-medium">Used in</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {packages.map((pkg) => {
                const canDelete =
                  pkg.usage_count === 0 &&
                  (user.role === "admin" || pkg.uploaded_by === user.id);
                return (
                  <tr key={pkg.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-medium text-zinc-900">{pkg.title}</td>
                    <td className="px-5 py-3">
                      <span className="badge bg-violet-100 text-violet-800">
                        SCORM {pkg.version}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{formatSize(pkg.size_bytes)}</td>
                    <td className="px-5 py-3 text-zinc-600">
                      {pkg.uploader_name ?? "—"}
                      <span className="block text-xs text-zinc-400">
                        {pkg.created_at.slice(0, 10)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      {pkg.usage_count === 0 ? (
                        <span className="text-zinc-400">Not used</span>
                      ) : (
                        <>
                          {pkg.usage_count} lesson{pkg.usage_count === 1 ? "" : "s"}
                          <span className="block max-w-56 truncate text-xs text-zinc-400">
                            {pkg.used_in}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {canDelete ? (
                        <ConfirmButton
                          action={deleteScormPackage.bind(null, pkg.id)}
                          message={`Delete “${pkg.title}” and its files from the library? This cannot be undone.`}
                          className="text-xs text-zinc-400 hover:text-red-600 cursor-pointer"
                        >
                          Delete
                        </ConfirmButton>
                      ) : pkg.usage_count > 0 ? (
                        <span className="text-xs text-zinc-400" title="Remove the lessons that use it first">
                          In use
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {orphans.length > 0 && (
        <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-5 ring-amber-200">
          <div>
            <p className="font-medium text-zinc-900">Orphaned files found</p>
            <p className="text-sm text-zinc-500">
              {orphans.length} director{orphans.length === 1 ? "y" : "ies"} on disk belong to
              no library package (e.g. from an interrupted upload). Safe to remove.
            </p>
          </div>
          <form action={cleanupScormOrphans}>
            <button className="btn-secondary">Clean up orphaned files</button>
          </form>
        </div>
      )}
    </div>
  );
}
