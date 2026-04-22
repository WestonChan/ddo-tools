import type { JSX } from 'react'
import { Link } from '@tanstack/react-router'

// Placeholder views for routes still to be built. Each is a single-line
// message pending its real implementation in a later phase per roadmap.
function Placeholder({ message }: { message: string }): JSX.Element {
  return <div className="section-placeholder">{message}</div>
}

export function BuildPlanView(): JSX.Element {
  return <Placeholder message="Build Plan coming in Phase 5." />
}

export function OverviewView(): JSX.Element {
  return <Placeholder message="Build Overview coming in Phase 10." />
}

export function GearView(): JSX.Element {
  return <Placeholder message="Gear Planner coming in Phase 6." />
}

export function DamageCalcView(): JSX.Element {
  return <Placeholder message="Damage Calculator coming in a future update." />
}

export function FarmChecklistView(): JSX.Element {
  return <Placeholder message="Farm Checklist coming in Phase 8." />
}

export function DebugView(): JSX.Element {
  return <Placeholder message="Debug / Data Browser coming in Phase 2." />
}

export function NotFoundView(): JSX.Element {
  return (
    <div className="section-placeholder">
      Page not found. <Link to="/build-plan">Go to Build Plan</Link>
    </div>
  )
}
