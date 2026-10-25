import {
  Gem,
  Layers,
  MapPin,
  MousePointerClick,
  ShieldHalf,
  Sparkles,
  Sword,
  Tag,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'

export type ComponentGallerySectionId =
  | 'header'
  | 'weapons'
  | 'armor'
  | 'enchantments'
  | 'sets'
  | 'augments'
  | 'sources'
  | 'clickies'
  | 'status'

export interface ComponentGallerySection {
  id: ComponentGallerySectionId
  label: string
  Icon: LucideIcon
}

export const COMPONENT_GALLERY_SECTIONS: readonly ComponentGallerySection[] = [
  { id: 'header', label: 'Header and chips', Icon: Tag },
  { id: 'weapons', label: 'Weapons', Icon: Sword },
  { id: 'armor', label: 'Armor and shields', Icon: ShieldHalf },
  { id: 'enchantments', label: 'Enchantments', Icon: Sparkles },
  { id: 'sets', label: 'Sets', Icon: Layers },
  { id: 'augments', label: 'Augment slots', Icon: Gem },
  { id: 'sources', label: 'Obtained from', Icon: MapPin },
  { id: 'clickies', label: 'Clickies', Icon: MousePointerClick },
  { id: 'status', label: 'Loading and errors', Icon: TriangleAlert },
]
