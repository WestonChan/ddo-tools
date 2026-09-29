import { useId, useState, type JSX } from 'react'
import { Modal } from './Modal'
import './ConfirmModal.css'

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmationPhrase,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  confirmationPhrase?: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const [typedPhrase, setTypedPhrase] = useState('')
  const canConfirm = !confirmationPhrase || typedPhrase.toLowerCase() === confirmationPhrase.toLowerCase()
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
        {confirmationPhrase && (
          <div className="confirm-modal-input">
            <label>
              Type <strong>{confirmationPhrase}</strong> to confirm
            </label>
            <input
              type="text"
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              placeholder={confirmationPhrase}
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
            autoFocus={!confirmationPhrase}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
