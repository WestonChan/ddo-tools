import type { ReactNode } from 'react'
import {
  detailCardSection,
  type DetailCardDefinition,
  type DetailCardFact,
} from '../../../../components/DetailCard'
import { ResourceStatusView } from './ResourceStatusView'

export function resourceStatusDefinition({
  kicker,
  name,
  facts,
  status,
}: {
  kicker: string
  name: string
  facts: readonly DetailCardFact[]
  status: ReactNode
}): DetailCardDefinition {
  return {
    kicker,
    name,
    facts,
    sections: [
      detailCardSection({ key: 'status', entries: [status], FullView: ResourceStatusView }),
    ],
  }
}
