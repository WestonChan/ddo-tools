import { useEffect, useRef, useState, type JSX } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiErrorNotice, HoverCardPreview, PageSection } from '../../../components'
import { useSectionScrollSpy } from '../../../hooks'
import { API_NETWORK_ERROR, ApiError, apiDetailPath } from '../../../lib/api'
import { ItemDetailCard, ItemHoverCard } from '../components/detail/ItemDetailCard'
import '../ResourcesView.css'
import './ComponentGalleryView.css'
import { COMPONENT_GALLERY_SECTIONS } from './componentGallerySections'
import { GALLERY_SETS, gallerySlug, galleryItemBySlug } from './galleryItems'
import { removeGalleryQueries, seedGalleryQueries } from './gallerySeed'
import {
  GALLERY_SECTION_SUBTITLES,
  GALLERY_SPECIMENS,
  type GallerySpecimen,
} from './gallerySpecimens'

const SECTION_IDS = COMPONENT_GALLERY_SECTIONS.map((section) => section.id)

function useSeededGalleryQueries(): void {
  const queryClient = useQueryClient()
  const [seededQueryKeys] = useState(() => seedGalleryQueries(queryClient))
  useEffect(() => {
    seedGalleryQueries(queryClient)
    return () => removeGalleryQueries(queryClient, seededQueryKeys)
  }, [queryClient, seededQueryKeys])
}

function statusFor(specimen: GallerySpecimen): JSX.Element | string | null {
  const missingItemPath = apiDetailPath('items', gallerySlug('missing'))
  switch (specimen.state) {
    case 'loading':
      return 'Loading item…'
    case 'unavailable':
      return 'Item unavailable'
    case 'item-error':
      return (
        <ApiErrorNotice
          error={new ApiError(API_NETWORK_ERROR, 0, 'Failed to fetch')}
          path={missingItemPath}
          missingResourceName="item"
          onRetry={() => {}}
        />
      )
    case 'set-error':
      return (
        <ApiErrorNotice
          error={new ApiError(API_NETWORK_ERROR, 0, 'Failed to fetch')}
          path={apiDetailPath('sets', gallerySlug('stormforged'))}
          missingResourceName="set"
          onRetry={() => {}}
        />
      )
    default:
      return null
  }
}

function ItemSpecimen({ specimen }: { specimen: GallerySpecimen }): JSX.Element {
  const item =
    specimen.itemSlug === null || specimen.state === 'loading' || specimen.state === 'unavailable'
      ? null
      : galleryItemBySlug(specimen.itemSlug)
  const hasLoadedItem = item !== null && specimen.state !== 'item-error'
  const cardProps = {
    item: hasLoadedItem ? item : null,
    setDetails:
      hasLoadedItem && specimen.state !== 'set-error'
        ? GALLERY_SETS.filter((set) => item.sets.some((itemSet) => itemSet.slug === set.slug))
        : [],
    status: statusFor(specimen),
    matchingBonuses: specimen.matchingBonuses ? [...specimen.matchingBonuses] : [],
    onOpenItem: () => {},
  }
  return (
    <article className="component-gallery__specimen">
      <header className="component-gallery__specimen-header">
        <h3 className="component-gallery__specimen-title">{specimen.title}</h3>
        <p className="component-gallery__specimen-branch">{specimen.branch}</p>
      </header>
      <div className="component-gallery__pair">
        <figure className="component-gallery__figure">
          <figcaption className="section-label">Detail pane</figcaption>
          <section className="resources-detail-pane">
            <div className="resources-detail-pane-body">
              <div className="resources-detail">
                <ItemDetailCard {...cardProps} />
              </div>
            </div>
          </section>
        </figure>
        <figure className="component-gallery__figure component-gallery__figure--tooltip">
          <figcaption className="section-label">Tooltip</figcaption>
          <HoverCardPreview>
            <ItemHoverCard {...cardProps} />
          </HoverCardPreview>
        </figure>
      </div>
    </article>
  )
}

export function ComponentGalleryView(): JSX.Element {
  const pageEndRef = useRef<HTMLDivElement | null>(null)
  useSeededGalleryQueries()
  useSectionScrollSpy('/dev/components', SECTION_IDS, pageEndRef)
  return (
    <div className="page">
      <div className="component-gallery">
        <header className="component-gallery__header">
          <h1 className="component-gallery__title">Interface components</h1>
          <p className="component-gallery__note">
            Development only. Every specimen is static data shown as the detail pane and the tooltip
            side by side; hover, pin and click work as in the real view, and nothing calls the API.
            Add a specimen here whenever a component gains a branch.
          </p>
        </header>
        {COMPONENT_GALLERY_SECTIONS.map((section) => (
          <PageSection
            key={section.id}
            id={section.id}
            title={section.label}
            subtitle={GALLERY_SECTION_SUBTITLES[section.id]}
          >
            <div className="component-gallery__specimens">
              {GALLERY_SPECIMENS.filter((specimen) => specimen.section === section.id).map(
                (specimen) => (
                  <ItemSpecimen key={specimen.title} specimen={specimen} />
                ),
              )}
            </div>
          </PageSection>
        ))}
      </div>
      <div ref={pageEndRef} aria-hidden />
    </div>
  )
}
