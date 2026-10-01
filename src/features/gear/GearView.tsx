import type { JSX } from 'react'
import { WireframePlaceholder } from '../../components'
import { GEAR_SLOTS } from './gearSlots'
import './GearView.css'

export function GearView(): JSX.Element {
  return (
    <div className="page gear-view">
      <div className="underline-tabs gear-view-toolbar">
        <button type="button" className="underline-tab underline-tab--active">
          Raid set
        </button>
        <button type="button" className="underline-tab gear-view-new-set-tab">
          + New set
        </button>
        <div className="gear-view-modes">
          <button type="button" className="btn-ghost-sm">
            Finder
          </button>
          <button type="button" className="btn-ghost-sm">
            Compare
          </button>
        </div>
      </div>

      <p className="gear-view-tile-legend">
        Tile tags: pinned stats covered / <span className="num">4</span> · +N unique bonus types
      </p>

      <ul className="gear-view-slots" aria-label="Gear slots">
        {GEAR_SLOTS.map((gearSlot) => (
          <li key={gearSlot} className="gear-view-slot">
            <span className="section-label">{gearSlot}</span>
            <span className="gear-view-slot-item">Empty</span>
          </li>
        ))}
      </ul>

      <WireframePlaceholder
        label="Compare list — items added from Resources, swap in per slot"
        minHeightPx={80}
      />
      <WireframePlaceholder
        label="Slot detail — affixes, augments, set membership, ML"
        hint="Augment slots click to picker"
        minHeightPx={140}
      />
    </div>
  )
}
