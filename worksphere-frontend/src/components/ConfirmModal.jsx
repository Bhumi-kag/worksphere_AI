import { useState } from "react";

export default function ConfirmModal({ dialog, onClose }) {
  const [busy, setBusy] = useState(false);

  if (!dialog) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await dialog.onConfirm?.();
    } finally {
      setBusy(false);
      onClose?.();
    }
  };

  return (
    <div
      className="adm-modal-backdrop"
      onClick={() => !busy && onClose?.()}
      role="presentation"
    >
      <div
        className="adm-confirm-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="adm-confirm-body">
          <div className="adm-confirm-icon">{dialog.icon || "⚠️"}</div>
          <h3>{dialog.title}</h3>
          <p>{dialog.message}</p>
        </div>

        <div className="adm-confirm-footer">
          <button
            type="button"
            className="adm-btn-secondary"
            disabled={busy}
            onClick={() => onClose?.()}
          >
            {dialog.cancelLabel || "Cancel"}
          </button>
          <button
            type="button"
            className="adm-confirm-danger-btn"
            disabled={busy}
            onClick={handleConfirm}
          >
            {busy ? "Processing..." : dialog.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
