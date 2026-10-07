import { useCallback, useId, useRef, useState, type JSX } from 'react'
import { ArrowUpDown, ChevronDown } from 'lucide-react'
import {
  lifeLabelOf,
  lifeNumbersOf,
  owningCharacterOf,
  plannedBuildLabelOf,
  raceAndClassLabelOf,
  useCharacters,
  type Character,
  type Life,
} from '../features/character'
import { BuildPickerMenu } from './BuildPickerMenu'
import './NavBarCharacterCard.css'

interface BuildIdentity {
  name: string
  detail: string
}

type CharacterCardMenu = 'switcher' | 'comparePicker'

function buildIdentityOf(build: Life, characters: Character[]): BuildIdentity {
  const raceAndClassSplit = raceAndClassLabelOf(build)
  const owningCharacter = owningCharacterOf(characters, build.id)
  if (!owningCharacter) {
    return { name: plannedBuildLabelOf(build), detail: `${raceAndClassSplit} · planned` }
  }
  const isCurrentLife = owningCharacter.lives[owningCharacter.currentLifeIndex]?.id === build.id
  return {
    name: owningCharacter.name,
    detail: isCurrentLife
      ? raceAndClassSplit
      : `${raceAndClassSplit} · ${lifeLabelOf(build, lifeNumbersOf(owningCharacter))}`,
  }
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function BuildIdentityText({ identity }: { identity: BuildIdentity }): JSX.Element {
  return (
    <span className="nav-bar-build-button-text">
      <span className="nav-bar-build-button-name">{identity.name}</span>
      <span className="nav-bar-build-button-detail">{identity.detail}</span>
    </span>
  )
}

export function NavBarCharacterCard({ isExpanded }: { isExpanded: boolean }): JSX.Element {
  const {
    characters,
    viewedBuild,
    comparisonBuild,
    viewBuild,
    setComparisonBuildId,
    swapViewedAndComparedBuilds,
  } = useCharacters()
  const [openCardMenu, setOpenCardMenu] = useState<CharacterCardMenu | null>(null)
  const switcherId = useId()
  const comparePickerId = useId()
  const viewedBuildButtonRef = useRef<HTMLButtonElement | null>(null)
  const comparisonButtonRef = useRef<HTMLButtonElement | null>(null)

  const closeCardMenu = useCallback((): void => setOpenCardMenu(null), [])

  function toggleCardMenu(menu: CharacterCardMenu): void {
    setOpenCardMenu((openMenu) => (openMenu === menu ? null : menu))
  }

  function viewPickedBuild(owningCharacterId: string | null, buildId: string): void {
    viewBuild(owningCharacterId, buildId)
    closeCardMenu()
  }

  function compareWith(buildId: string | null): void {
    setComparisonBuildId(buildId)
    closeCardMenu()
  }

  const viewedIdentity = buildIdentityOf(viewedBuild, characters)
  const comparisonIdentity = comparisonBuild ? buildIdentityOf(comparisonBuild, characters) : null

  const cardClassName = [
    'nav-bar-character-card',
    !isExpanded && 'nav-bar-character-card--collapsed',
    comparisonIdentity && 'nav-bar-character-card--comparing',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div className={cardClassName} role="group" aria-label="Build selection">
        <button
          ref={viewedBuildButtonRef}
          type="button"
          className="nav-bar-build-button focus-ring-proxy"
          aria-label={`Viewed build: ${viewedIdentity.name} · ${viewedIdentity.detail}`}
          aria-expanded={openCardMenu === 'switcher'}
          aria-controls={openCardMenu === 'switcher' ? switcherId : undefined}
          title={isExpanded ? undefined : viewedIdentity.name}
          onClick={() => toggleCardMenu('switcher')}
        >
          {isExpanded ? (
            <>
              <BuildIdentityText identity={viewedIdentity} />
              <ChevronDown size={16} className="nav-bar-character-chevron" />
            </>
          ) : (
            <span className="nav-bar-build-button-initial">{initialOf(viewedIdentity.name)}</span>
          )}
        </button>

        <div className="nav-bar-character-vs" aria-hidden="true">
          VS
        </div>

        <button
          ref={comparisonButtonRef}
          type="button"
          className="nav-bar-build-button nav-bar-build-button--comparison focus-ring-proxy"
          aria-label={
            comparisonIdentity
              ? `Compared build: ${comparisonIdentity.name} · ${comparisonIdentity.detail}`
              : 'Compare…'
          }
          aria-expanded={openCardMenu === 'comparePicker'}
          aria-controls={openCardMenu === 'comparePicker' ? comparePickerId : undefined}
          title={isExpanded ? undefined : (comparisonIdentity?.name ?? 'Compare…')}
          onClick={() => toggleCardMenu('comparePicker')}
        >
          {isExpanded ? (
            <>
              {comparisonIdentity ? (
                <BuildIdentityText identity={comparisonIdentity} />
              ) : (
                <span className="nav-bar-character-compare-prompt">Compare…</span>
              )}
              <ChevronDown size={16} className="nav-bar-character-chevron" />
            </>
          ) : (
            <span className="nav-bar-build-button-initial">
              {comparisonIdentity ? initialOf(comparisonIdentity.name) : '—'}
            </span>
          )}
        </button>

        <button
          type="button"
          className="nav-bar-character-swap focus-ring-proxy"
          aria-label="Swap"
          title="Swap the viewed and compared builds"
          disabled={!comparisonBuild}
          onClick={swapViewedAndComparedBuilds}
        >
          <ArrowUpDown size={12} />
          {isExpanded && <span>Swap</span>}
        </button>
      </div>

      {openCardMenu === 'switcher' && (
        <BuildPickerMenu
          id={switcherId}
          anchorRef={viewedBuildButtonRef}
          label="Switch build"
          selectedBuildId={viewedBuild.id}
          onPick={viewPickedBuild}
          onClose={closeCardMenu}
        />
      )}

      {openCardMenu === 'comparePicker' && (
        <BuildPickerMenu
          id={comparePickerId}
          anchorRef={comparisonButtonRef}
          label="Compare against"
          selectedBuildId={comparisonBuild?.id ?? null}
          excludedBuildId={viewedBuild.id}
          leadingRows={
            comparisonBuild && (
              <>
                <button
                  type="button"
                  className="anchored-menu-row"
                  onClick={() => compareWith(null)}
                >
                  Stop comparing
                </button>
                <div className="anchored-menu-divider" />
              </>
            )
          }
          onPick={(_owningCharacterId, buildId) => compareWith(buildId)}
          onClose={closeCardMenu}
        />
      )}
    </>
  )
}
