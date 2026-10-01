import { Fragment, type JSX, type ReactNode, type RefObject } from 'react'
import { AnchoredMenu } from '../components'
import {
  lifeLabelOf,
  lifeNumbersOf,
  plannedBuildLabelOf,
  useCharacters,
  type Life,
} from '../features/character'

interface BuildPickerMenuProps {
  id: string
  anchorRef: RefObject<HTMLElement | null>
  label: string
  selectedBuildId: string | null
  excludedBuildId?: string
  leadingRows?: ReactNode
  onPick: (owningCharacterId: string | null, buildId: string) => void
  onClose: () => void
}

const BUILD_PICKER_MENU_WIDTH_PX = 216

function BuildPickerRow({
  isSelected,
  onPick,
  children,
}: {
  isSelected: boolean
  onPick: () => void
  children: ReactNode
}): JSX.Element {
  return (
    <button
      type="button"
      className={`anchored-menu-row${isSelected ? ' anchored-menu-row--selected' : ''}`}
      aria-current={isSelected || undefined}
      onClick={onPick}
    >
      {children}
    </button>
  )
}

export function BuildPickerMenu({
  id,
  anchorRef,
  label,
  selectedBuildId,
  excludedBuildId,
  leadingRows,
  onPick,
  onClose,
}: BuildPickerMenuProps): JSX.Element {
  const { characters, plannedBuilds } = useCharacters()
  const isPickable = (build: Life): boolean => build.id !== excludedBuildId
  const pickablePlannedBuilds = plannedBuilds.filter(isPickable)

  return (
    <AnchoredMenu
      id={id}
      anchorRef={anchorRef}
      placement="below"
      widthPx={BUILD_PICKER_MENU_WIDTH_PX}
      label={label}
      onClose={onClose}
    >
      {leadingRows}
      {characters.map((character) => {
        const lifeNumbersByLifeId = lifeNumbersOf(character)
        const currentLifeId = character.lives[character.currentLifeIndex]?.id
        const pickableLives = character.lives.filter(isPickable)
        if (pickableLives.length === 0) return null
        return (
          <Fragment key={character.id}>
            <div className="anchored-menu-eyebrow section-label">{character.name}</div>
            {pickableLives.map((life) => (
              <BuildPickerRow
                key={life.id}
                isSelected={life.id === selectedBuildId}
                onPick={() => onPick(character.id, life.id)}
              >
                {lifeLabelOf(life, lifeNumbersByLifeId)}
                {life.id === currentLifeId ? ' (current)' : ''}
              </BuildPickerRow>
            ))}
          </Fragment>
        )
      })}
      {pickablePlannedBuilds.length > 0 && (
        <div className="anchored-menu-eyebrow section-label">Planned builds</div>
      )}
      {pickablePlannedBuilds.map((plannedBuild) => (
        <BuildPickerRow
          key={plannedBuild.id}
          isSelected={plannedBuild.id === selectedBuildId}
          onPick={() => onPick(null, plannedBuild.id)}
        >
          {plannedBuildLabelOf(plannedBuild)} (planned)
        </BuildPickerRow>
      ))}
    </AnchoredMenu>
  )
}
