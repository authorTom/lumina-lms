import { COURSE_COLORS, bannerClass } from "@/lib/colors";
import type { CourseSummary } from "@/lib/data";

// Shared field set for the create and edit course forms.
export function CourseFields({ course }: { course?: CourseSummary }) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="title" className="label">Title</label>
        <input id="title" name="title" required defaultValue={course?.title ?? ""} className="input" placeholder="e.g. Python for Data Analysis" />
      </div>
      <div>
        <label htmlFor="description" className="label">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={course?.description ?? ""} className="input" placeholder="What will students learn?" />
      </div>
      <div>
        <label htmlFor="category" className="label">Category</label>
        <input id="category" name="category" defaultValue={course?.category ?? ""} className="input" placeholder="e.g. Programming" />
      </div>
      <fieldset>
        <legend className="label">Card color</legend>
        <div className="flex gap-2">
          {COURSE_COLORS.map((color) => (
            <label key={color} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={color}
                defaultChecked={(course?.color ?? "indigo") === color}
                className="peer sr-only"
              />
              <span
                className={`block size-8 rounded-full ${bannerClass(color)} ring-offset-2 peer-checked:ring-2 peer-checked:ring-zinc-900`}
                title={color}
              />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
