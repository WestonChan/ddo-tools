import { useState, useRef, useEffect, type JSX } from 'react'
import './EditableText.css'

interface EditableTextProps {
  text: string
  placeholder?: string
  className?: string
  onCommit: (committedText: string) => void
}

export function EditableText({
  text,
  placeholder = 'Name...',
  className,
  onCommit,
}: EditableTextProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const [draftText, setDraftText] = useState(text)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  function startEditing(e: React.MouseEvent): void {
    e.stopPropagation()
    e.preventDefault()
    setDraftText(text)
    setIsEditing(true)
  }

  function commitDraftText(): void {
    const trimmed = draftText.trim()
    setIsEditing(false)
    onCommit(trimmed)
  }

  function cancelEditing(): void {
    setIsEditing(false)
    setDraftText(text)
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className={`editable-text-input ${className ?? ''}`}
        value={draftText}
        onChange={(e) => setDraftText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitDraftText()
          if (e.key === 'Escape') cancelEditing()
        }}
        onBlur={commitDraftText}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <span className={`editable-text ${className ?? ''}`} onClick={startEditing}>
      {text ? (
        <span className="editable-text-display">{text}</span>
      ) : (
        <span className="editable-text-display editable-text-placeholder">{placeholder}</span>
      )}
    </span>
  )
}
