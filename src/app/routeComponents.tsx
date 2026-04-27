import type { JSX } from 'react'
import { Link } from '@tanstack/react-router'

function Placeholder({ message }: { message: string }): JSX.Element {
  return <div className="section-placeholder">{message}</div>
}

const makeView =
  (message: string) =>
  (): JSX.Element =>
    <Placeholder message={message} />

export const BuildPlanView = makeView('Build Plan coming in Phase 5.')
export const OverviewView = makeView('Build Overview coming in Phase 10.')
export const GearView = makeView('Gear Planner coming in Phase 6.')
export const DamageCalcView = makeView('Damage Calculator coming in a future update.')
export const FarmChecklistView = makeView('Farm Checklist coming in Phase 8.')
export const DebugView = makeView('Debug / Data Browser coming in Phase 2.')

export function NotFoundView(): JSX.Element {
  return (
    <div className="section-placeholder">
      Page not found. <Link to="/">Go home</Link>
    </div>
  )
}
