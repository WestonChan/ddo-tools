import { useId, useState, type JSX } from 'react'
import { Modal } from './Modal'
import './ConfirmModal.css'

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  requireInput,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  requireInput?: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const canConfirm = !requireInput || inputValue.toLowerCase() === requireInput.toLowerCase()
  const titleId = useId()

  return (
    <Modal variant="centered" onClose={onCancel} labelledBy={titleId} className="confirm-modal">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canConfirm) onConfirm()
        }}
      >
        <div className="confirm-modal-title" id={titleId}>
          {title}
        </div>
        <div className="confirm-modal-message">{message}</div>
        {requireInput && (
          <div className="confirm-modal-input">
            <label>
              Type <strong>{requireInput}</strong> to confirm
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={requireInput}
              autoFocus
            />
          </div>
        )}
        <div className="confirm-modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!canConfirm}
            autoFocus={!requireInput}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
