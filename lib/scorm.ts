import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getDb } from "./db";

export const SCORM_ROOT = path.join(process.cwd(), "data", "scorm");
const MAX_PACKAGE_BYTES = 200 * 1024 * 1024; // extracted size cap

export interface ImportedPackage {
  id: number;
  title: string;
  version: "1.2" | "2004";
  launchHref: string;
  dir: string;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// Depth-first search for the first item that references a resource.
function firstLaunchableItem(items: unknown[]): Record<string, unknown> | undefined {
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    if (item["@_identifierref"]) return item;
    const nested = firstLaunchableItem(toArray(item.item));
    if (nested) return nested;
  }
  return undefined;
}

interface ParsedManifest {
  title: string;
  version: "1.2" | "2004";
  launchHref: string;
}

function parseManifest(xml: string): ParsedManifest {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true, // treat adlcp:scormtype etc. uniformly
  });
  const doc = parser.parse(xml);
  const manifest = doc.manifest;
  if (!manifest) throw new Error("The zip does not contain a valid imsmanifest.xml.");

  // Version: prefer metadata/schemaversion, fall back to the ADL namespace.
  const schemaVersion = String(manifest.metadata?.schemaversion ?? "");
  const rawXml = xml.slice(0, 2000);
  const version: "1.2" | "2004" =
    schemaVersion.includes("1.2") || (!schemaVersion && rawXml.includes("adlcp_rootv1p2"))
      ? "1.2"
      : schemaVersion
        ? "2004"
        : rawXml.includes("v1p3")
          ? "2004"
          : "1.2";

  const organizations = manifest.organizations;
  const orgList = toArray(organizations?.organization) as Record<string, unknown>[];
  const defaultOrgId = organizations?.["@_default"];
  const org =
    orgList.find((o) => o["@_identifier"] === defaultOrgId) ?? orgList[0];

  const resources = toArray(manifest.resources?.resource) as Record<string, unknown>[];

  let launchHref: string | undefined;
  let itemTitle: string | undefined;

  if (org) {
    const item = firstLaunchableItem(toArray(org.item));
    if (item) {
      itemTitle = typeof item.title === "string" ? item.title : undefined;
      const resource = resources.find(
        (r) => r["@_identifier"] === item["@_identifierref"]
      );
      if (resource?.["@_href"]) {
        launchHref = String(resource["@_href"]);
        const params = item["@_parameters"] ? String(item["@_parameters"]) : "";
        if (params) {
          launchHref += params.startsWith("?") || params.startsWith("#") ? params : `?${params}`;
        }
      }
    }
  }
  // Some minimal packages skip organizations entirely — take the first SCO resource.
  if (!launchHref) {
    const sco = resources.find((r) => r["@_href"]);
    if (sco) launchHref = String(sco["@_href"]);
  }
  if (!launchHref) {
    throw new Error("Could not find a launchable resource in the SCORM manifest.");
  }

  const title = String(
    (typeof org?.title === "string" && org.title) ||
      itemTitle ||
      "Untitled SCORM package"
  );

  return { title, version, launchHref };
}

export function deleteScormFiles(dir: string) {
  // dir is a UUID we generated; refuse anything path-like as defence in depth.
  if (!/^[0-9a-f-]{36}$/.test(dir)) return;
  fs.rmSync(path.join(SCORM_ROOT, dir), { recursive: true, force: true });
}

// Directories on disk with no matching database row (e.g. from a crashed
// import or a database restore).
export function listOrphanedScormDirs(): string[] {
  if (!fs.existsSync(SCORM_ROOT)) return [];
  const known = new Set(
    (getDb().prepare("SELECT dir FROM scorm_packages").all() as { dir: string }[]).map(
      (r) => r.dir
    )
  );
  return fs
    .readdirSync(SCORM_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !known.has(e.name))
    .map((e) => e.name);
}

export function importScormPackage(buffer: Buffer, uploadedBy: number): ImportedPackage {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new Error("The uploaded file is not a valid zip archive.");
  }

  const entries = zip.getEntries();
  // The manifest is usually at the root, but some tools nest everything in one folder.
  const manifestEntry = entries
    .filter((e) => e.entryName.toLowerCase().endsWith("imsmanifest.xml"))
    .sort((a, b) => a.entryName.length - b.entryName.length)[0];
  if (!manifestEntry) {
    throw new Error("No imsmanifest.xml found — this doesn't look like a SCORM package.");
  }
  const baseDir = manifestEntry.entryName.slice(
    0,
    manifestEntry.entryName.length - "imsmanifest.xml".length
  );

  const parsed = parseManifest(manifestEntry.getData().toString("utf-8"));

  const dir = crypto.randomUUID();
  const target = path.join(SCORM_ROOT, dir);
  fs.mkdirSync(target, { recursive: true });

  let totalBytes = 0;
  try {
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      if (baseDir && !entry.entryName.startsWith(baseDir)) continue;
      const relative = entry.entryName.slice(baseDir.length);
      const dest = path.resolve(target, relative);
      // Zip-slip guard: every entry must stay inside the package directory.
      if (dest !== target && !dest.startsWith(target + path.sep)) {
        throw new Error("The zip contains unsafe file paths.");
      }
      const data = entry.getData();
      totalBytes += data.length;
      if (totalBytes > MAX_PACKAGE_BYTES) {
        throw new Error("The package is too large (200 MB extracted limit).");
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, data);
    }
  } catch (err) {
    fs.rmSync(target, { recursive: true, force: true });
    throw err;
  }

  const result = getDb()
    .prepare(
      "INSERT INTO scorm_packages (title, version, launch_href, dir, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(parsed.title, parsed.version, parsed.launchHref, dir, totalBytes, uploadedBy);

  return {
    id: result.lastInsertRowid as number,
    title: parsed.title,
    version: parsed.version,
    launchHref: parsed.launchHref,
    dir,
  };
}
