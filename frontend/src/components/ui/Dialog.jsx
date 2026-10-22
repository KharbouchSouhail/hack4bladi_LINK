import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import Button from "../Button.jsx";

const WIDTHS = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

// Built on <dialog> so focus trapping, Escape and the top layer come from the browser.
export default function Dialog({ open, onClose, title, description, children, footer, size = "md" }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => event.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${WIDTHS[size]} rounded-xl border border-gray-200 bg-white p-0 text-gray-900 shadow-modal backdrop:bg-navy-950/45`}
    >
      {open && (
        <div className="flex max-h-[88vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 id={titleId} className="text-base font-semibold">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-[13px] text-gray-600">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-m-1 flex h-9 w-9 items-center justify-center rounded-control text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-accent-600"
            >
              <X size={18} strokeWidth={1.8} />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = "Confirm", danger = false, pending = false }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={pending} variant={danger ? "danger" : "solid"} size="sm" onClick={onConfirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">{children}</div>
    </Dialog>
  );
}
