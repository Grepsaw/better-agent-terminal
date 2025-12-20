interface CloseConfirmDialogProps {
  onConfirm: () => void
  onCancel: () => void
}

export function CloseConfirmDialog({ onConfirm, onCancel }: CloseConfirmDialogProps) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h3>Close Code Agent?</h3>
        <p>
          Are you sure you want to close the Code Agent terminal?
          Any running process will be terminated.
        </p>
        <div className="dialog-actions">
          <button className="dialog-btn cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="dialog-btn confirm" onClick={onConfirm}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
