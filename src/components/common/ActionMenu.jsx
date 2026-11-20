import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

export default function ActionMenu({ label = "Open actions", items }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (
        !buttonRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const closeMenu = () => setIsOpen(false);
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.right - 208, window.innerWidth - 216)),
      });
    }
    setIsOpen((current) => !current);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      >
        <MoreHorizontal size={18} />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left }}
            className="fixed z-[70] w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setIsOpen(false);
                    item.onSelect?.();
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                    item.tone === "danger"
                      ? "text-red-600 hover:bg-red-50"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {Icon && <Icon size={15} />}
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
