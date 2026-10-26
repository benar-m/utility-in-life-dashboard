/**
 * Consistent page heading used across every module page.
 * `actionSlot` accepts an optional button/element rendered on the right.
 */
export default function PageHeader({ title, description, actionSlot }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actionSlot && <div className="shrink-0">{actionSlot}</div>}
    </div>
  );
}
