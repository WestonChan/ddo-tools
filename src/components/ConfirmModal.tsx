import { useId, useState, type JSX } from 'react'
import { Modal } from './Modal'
import './ConfirmModal.css'

/**
 * Generic confirmation dialog with optional typed-input confirmation.
 * A `centered` <Modal>, so it inherits Escape / backdrop dismissal, focus
 * containment, and the background-inert registration.
 *
 * Enter confirms via native form semantics (a <form> around the body plus a
 * submit button) rather than a key listener: implicit submission already
 * handles Enter from the text field and from the focused button, and it stays
 * out of Modal's chrome, where Enter isn't the modal's business.
 */
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

  // The backdrop keeps Modal's default "Close dialog" name rather than
  // "Cancel": a second button named Cancel would make role queries (and a
  // screen-reader button list) ambiguous against the visible one below.
  return (
    <Modal variant="centered" onClose={onCancel} labelledBy={titleId} className="confirm-modal">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          // Belt-and-braces. The disabled submit button already swallows
          // implicit submission, but the typed-confirmation gate belongs on
          // the path that fires onConfirm, not only on the control that
          // usually reaches it.
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
          {/* Explicit type="button": a bare <button> in a form defaults to
              submit, which would confirm instead of cancel. It's also what
              keeps user-event's / the browser's default-button lookup landing
              on the confirm button below. */}
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          {/* No onClick — submission is the single confirm path, so click and
              Enter can't both fire. autoFocus only when nothing has to be
              typed: default-focusing the primary action is the platform
              convention for non-destructive confirms, and the destructive
              path is the requireInput one, where the input autofocuses
              instead and the disabled gate blocks a premature Enter. */}
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
