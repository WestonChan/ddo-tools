import type { JSX } from 'react'
import { PageSection, WireframePlaceholder } from '../../components'
import { Hotbars } from './components/Hotbars'
import './BuildOverviewView.css'

export function BuildOverviewView(): JSX.Element {
  return (
    <div className="page build-overview-view">
      <PageSection
        title="Active abilities"
        subtitle="hotbar — hover for detail, click → Damage calc"
      >
        <Hotbars />
      </PageSection>
      <PageSection title="Passive feats & abilities" subtitle="actives live in the hotbars above">
        <WireframePlaceholder
          label="Passive list — feats, enhancements, destiny passives, grouped by source"
          hint="Rows link into Resources detail"
          minHeightPx={120}
        />
      </PageSection>
      <PageSection title="Buffs & stances" subtitle="toggles feed the stats panel">
        <WireframePlaceholder
          label="Buff toggles · stances · external buffs"
          hint="Toggling recomputes the stats panel on the right"
          minHeightPx={90}
        />
      </PageSection>
    </div>
  )
}
