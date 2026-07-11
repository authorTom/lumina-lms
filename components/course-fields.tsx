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
      <fieldset className="space-y-3">
        <legend className="label">Header &amp; thumbnail</legend>
        <p className="text-xs text-zinc-500">
          Shown at the top of the course page and on catalog cards. Use a solid colour or
          upload an image.
        </p>

        <div className="rounded-lg p-3 ring-1 ring-zinc-200 has-checked:ring-indigo-400">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
            <input
              type="radio"
              name="banner_type"
              value="color"
              defaultChecked={!course?.image}
              className="accent-indigo-600"
            />
            Solid colour
          </label>
          <div className="mt-3 flex gap-2 pl-6">
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
        </div>

        <div className="rounded-lg p-3 ring-1 ring-zinc-200 has-checked:ring-indigo-400">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
            <input
              type="radio"
              name="banner_type"
              value="image"
              defaultChecked={!!course?.image}
              className="accent-indigo-600"
            />
            Image
          </label>
          <div className="mt-3 space-y-2 pl-6">
            {course?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/media/courses/${course.image}`}
                alt="Current course image"
                className="h-20 w-36 rounded-lg object-cover ring-1 ring-zinc-200"
              />
            )}
            <input
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              className="block w-full text-sm text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-zinc-500">
              PNG, JPEG, WebP, GIF, or AVIF up to 5 MB — landscape around 1200×400 works best.
              {course?.image ? " Leave empty to keep the current image." : ""}
            </p>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
