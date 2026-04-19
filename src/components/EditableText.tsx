import { useState, useRef, useEffect, type JSX } from 'react'
import './EditableText.css'

interface EditableTextProps {
  value: string
  placeholder?: string
  className?: string
  onCommit: (newValue: string) => void
}

export function EditableText({
  value,
  placeholder = 'Name...',
  className,
  onCommit,
}: EditableTextProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function startEdit(e: React.MouseEvent): void {
    e.stopPropagation()
    e.preventDefault()
    setDraft(value)
    setEditing(true)
  }

  function commit(): void {
    const trimmed = draft.trim()
    setEditing(false)
    onCommit(trimmed)
  }

  function cancel(): void {
    setEditing(false)
    setDraft(value)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`editable-text-input ${className ?? ''}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') cancel()
        }}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <span className={`editable-text ${className ?? ''}`} onClick={startEdit}>
      {value ? (
        <span className="editable-text-display">{value}</span>
      ) : (
        <span className="editable-text-display editable-text-placeholder">{placeholder}</span>
      )}
    </span>
  )
}
