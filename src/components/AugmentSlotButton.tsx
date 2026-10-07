import type { ButtonHTMLAttributes, JSX, Ref } from 'react'
import './AugmentSlotButton.css'

interface AugmentSlotButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className'
> {
  family: string
  label: string
  name: string
  ref?: Ref<HTMLButtonElement>
}

const AUGMENT_SYMBOL_BY_SLOT: Record<string, { letter: string; appearance: string }> = {
  'standard:blue': { letter: 'B', appearance: 'blue' },
  'standard:red': { letter: 'R', appearance: 'red' },
  'standard:yellow': { letter: 'Y', appearance: 'yellow' },
  'standard:green': { letter: 'G', appearance: 'green' },
  'standard:purple': { letter: 'P', appearance: 'purple' },
  'standard:orange': { letter: 'O', appearance: 'orange' },
  'standard:colorless': { letter: 'C', appearance: 'colorless' },
  'standard:sun': { letter: 'S', appearance: 'sun' },
  'standard:moon': { letter: 'M', appearance: 'moon' },
  dino: { letter: 'D', appearance: 'dino' },
}

export function AugmentSlotButton({
  family,
  label,
  name,
  ...buttonProps
}: AugmentSlotButtonProps): JSX.Element {
  const symbolKey = family === 'dino' ? family : `${family}:${label.toLowerCase()}`
  const symbol = AUGMENT_SYMBOL_BY_SLOT[symbolKey]
  return (
    <span className="augment-slot-control">
      <button
        {...buttonProps}
        type="button"
        className={
          symbol
            ? `augment-slot-symbol augment-slot-symbol--${symbol.appearance}`
            : 'augment-slot-word hoverable'
        }
        aria-label={symbol ? `${name} slot` : undefined}
        data-tip={`${name} slot`}
      >
        {symbol ? (
          <span aria-hidden="true">{symbol.letter}</span>
        ) : (
          <span className="augment-slot-word-label">{name}</span>
        )}
      </button>
      {symbol && <span className="augment-slot-focus-ring" aria-hidden="true" />}
    </span>
  )
}
