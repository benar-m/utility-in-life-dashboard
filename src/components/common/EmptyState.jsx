
 // will be connected to a ereal api
export default function EmptyState({ icon: Icon, title, description, primaryActionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {primaryActionLabel && (
        <button
          type="button"
          disabled
          title="Available once this module is connected to the API"
          className="mt-4 cursor-not-allowed rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
        >
          {primaryActionLabel}
        </button>
      )}
    </div>
  );
}
