// Static class maps so Tailwind's compiler can see every class name.
export const COURSE_COLORS = [
  "indigo",
  "sky",
  "emerald",
  "amber",
  "rose",
  "violet",
] as const;

export type CourseColor = (typeof COURSE_COLORS)[number];

const BANNER: Record<string, string> = {
  indigo: "bg-gradient-to-br from-indigo-500 to-indigo-700",
  sky: "bg-gradient-to-br from-sky-500 to-sky-700",
  emerald: "bg-gradient-to-br from-emerald-500 to-emerald-700",
  amber: "bg-gradient-to-br from-amber-500 to-amber-700",
  rose: "bg-gradient-to-br from-rose-500 to-rose-700",
  violet: "bg-gradient-to-br from-violet-500 to-violet-700",
};

const BADGE: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-800",
  sky: "bg-sky-100 text-sky-800",
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-800",
  violet: "bg-violet-100 text-violet-800",
};

export function bannerClass(color: string): string {
  return BANNER[color] ?? BANNER.indigo;
}

export function badgeClass(color: string): string {
  return BADGE[color] ?? BADGE.indigo;
}
