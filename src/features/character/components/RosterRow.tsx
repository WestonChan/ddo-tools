import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react'

function rosterStatusLabel(isActive: boolean, isComparing: boolean): string {
  if (isActive && isComparing) return 'active · comparing'
  if (isActive) return 'active'
  if (isComparing) return 'comparing'
  return ''
}

function rosterRowClassName(isActive: boolean, isComparing: boolean): string {
  if (isActive) return 'roster-row roster-row--active'
  if (isComparing) return 'roster-row roster-row--comparing'
  return 'roster-row'
}

interface RosterRowButtonProps {
  name: string
  facts: ReactNode[]
  isActive: boolean
  isComparing: boolean
  onSelect: () => void
}

function RosterRowButton({
  name,
  facts,
  isActive,
  isComparing,
  onSelect,
}: RosterRowButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className={rosterRowClassName(isActive, isComparing)}
      aria-current={isActive || undefined}
      onClick={onSelect}
    >
      <span className="roster-row-name">{name}</span>
      <span className="roster-row-facts">
        {facts.filter(Boolean).map((fact, factIndex) => (
          <span key={factIndex} className="roster-row-fact">
            {fact}
          </span>
        ))}
      </span>
      <span className="roster-row-status">{rosterStatusLabel(isActive, isComparing)}</span>
    </button>
  )
}

interface RosterRowProps extends RosterRowButtonProps {
  actions: ReactNode
}

export function RosterRow({ actions, ...rosterRowButtonProps }: RosterRowProps): JSX.Element {
  return (
    <div className="roster-entry">
      <RosterRowButton {...rosterRowButtonProps} />
      <span className="roster-entry-actions">{actions}</span>
    </div>
  )
}

interface RenamableRosterRowProps extends RosterRowProps {
  storedName: string
  nameInputLabel: string
  isRenaming: boolean
  onRename: (newName: string) => void
  onStopRenaming: () => void
  focusRenameButton: () => void
}

export function RenamableRosterRow({
  storedName,
  nameInputLabel,
  isRenaming,
  onRename,
  onStopRenaming,
  focusRenameButton,
  actions,
  ...rosterRowButtonProps
}: RenamableRosterRowProps): JSX.Element {
  return (
    <div className="roster-entry">
      {isRenaming ? (
        <RosterRowNameInput
          label={nameInputLabel}
          storedName={storedName}
          onCommit={(newName) => {
            onRename(newName)
            onStopRenaming()
          }}
          onCancel={onStopRenaming}
          returnFocus={focusRenameButton}
        />
      ) : (
        <RosterRowButton {...rosterRowButtonProps} />
      )}
      <span className="roster-entry-actions">{actions}</span>
    </div>
  )
}

interface RosterRowNameInputProps {
  label: string
  storedName: string
  onCommit: (newName: string) => void
  onCancel: () => void
  returnFocus: () => void
}

function RosterRowNameInput({
  label,
  storedName,
  onCommit,
  onCancel,
  returnFocus,
}: RosterRowNameInputProps): JSX.Element {
  const [draftName, setDraftName] = useState(storedName)
  const inputRef = useRef<HTMLInputElement>(null)
  const isSettledRef = useRef(false)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function settleWith(settle: () => void): void {
    if (isSettledRef.current) return
    isSettledRef.current = true
    settle()
  }

  return (
    <input
      ref={inputRef}
      className="roster-row roster-row-name-input"
      aria-label={label}
      value={draftName}
      placeholder="Name…"
      onChange={(e) => setDraftName(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') e.preventDefault()
        if (e.key === 'Enter') {
          settleWith(() => {
            returnFocus()
            onCommit(draftName.trim())
          })
        }
        if (e.key === 'Escape') {
          settleWith(() => {
            returnFocus()
            onCancel()
          })
        }
      }}
      onBlur={(e) =>
        settleWith(() => {
          if (e.relatedTarget === null) returnFocus()
          onCommit(draftName.trim())
        })
      }
    />
  )
}
