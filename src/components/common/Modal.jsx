import { useEffect } from "react";
import { X } from "lucide-react";

const widths = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({ isOpen, onClose, title, description, children, size = "md" }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="presentation">
      <button
        type="button"
        className="fixed inset-0 bg-slate-900/50"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`relative w-full ${widths[size]} rounded-2xl bg-white shadow-xl`}
        >
          <header className="flex items-start gap-4 border-b border-slate-200 px-6 py-5">
            <div className="min-w-0 flex-1">
              <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close dialog"
            >
              <X size={19} />
            </button>
          </header>
          {children}
        </section>
      </div>
    </div>
  );
}
