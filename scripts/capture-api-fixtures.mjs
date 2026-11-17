import { format, resolveConfig } from 'prettier'
import { writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

const manifest = {
  'src/lib/api/fixtures/rejected-pack-value.json': {
    path: `/v1/items?${new URLSearchParams({ pack: '  a"b\\c; accepted values: x  ' })}`,
    status: 400,
  },
  'src/lib/api/fixtures/rejected-bonus-value.json': {
    path: '/v1/items?bonus=Made-Up',
    status: 400,
  },
  'src/lib/api/fixtures/rejected-bonus-type.json': {
    path: '/v1/items?bonus=Strength:Nope',
    status: 400,
  },
  'src/lib/api/fixtures/rejected-sort.json': { path: '/v1/items?sort=bogus', status: 400 },
  'src/lib/api/fixtures/rejected-view.json': { path: '/v1/items?view=bogus', status: 400 },
  'src/features/resources/queries/fixtures/item-rune-arm-of-the-great-decay.json':
    '/v1/items/rune-arm-of-the-great-decay',
  'src/features/resources/queries/fixtures/equipment-slots.json': '/v1/equipment-slots?limit=20',
  'src/lib/api/openapi/v1.json': '/v1/openapi.json',
  'src/features/resources/queries/fixtures/item-legendary-rapier-of-the-oozing-hunger.json':
    '/v1/items/legendary-rapier-of-the-oozing-hunger',
  'src/features/resources/queries/fixtures/weapon-abilities.json': '/v1/weapon-abilities?limit=6',
  'src/features/resources/queries/fixtures/item-materials.json': '/v1/item-materials?limit=50',
  'src/features/resources/queries/fixtures/augment-slot-types-filter-families.json':
    '/v1/augment-slot-types?family=standard&family=dino&family=lamordia&family=upgrade&limit=100',
  'src/features/resources/queries/fixtures/crafting-systems.json': '/v1/crafting-systems?limit=100',
  'src/features/resources/queries/fixtures/effect-elemental-resistance.json':
    '/v1/effects/elemental-resistance?items_limit=1&items_offset=15&augments_limit=0&set_tiers_limit=0',
  'src/features/resources/queries/fixtures/item-docent-of-shadow-level-8.json':
    '/v1/items/docent-of-shadow-level-8',
  'src/features/resources/queries/fixtures/effect-false-life.json':
    '/v1/effects/false-life?items_limit=1&augments_limit=1&set_tiers_limit=1',
  'src/features/resources/queries/fixtures/feat-wild-shape-plague-wolf.json':
    '/v1/feats/wild-shape-plague-wolf',
  'src/features/resources/queries/fixtures/item-epic-deaths-rampart.json':
    '/v1/items/epic-deaths-rampart',
  'src/features/resources/queries/fixtures/item-cutthroats-smallblade-level-8.json':
    '/v1/items/cutthroats-smallblade-level-8',
  'src/features/resources/queries/fixtures/effects-page-spellsight.json':
    '/v1/effects?q=spellsight&limit=3',
  'src/features/resources/queries/fixtures/effects-page-mighty.json':
    '/v1/effects?q=mighty&limit=1',
  'src/features/resources/queries/fixtures/effects-page-strength.json':
    '/v1/effects?q=strength&limit=1',
  'src/features/resources/queries/fixtures/item-legendary-bracers-of-the-demons-consort.json':
    '/v1/items/legendary-bracers-of-the-demons-consort',
  'src/features/resources/queries/fixtures/set-the-legendary-deserts-starless-nights.json':
    '/v1/sets/the-legendary-deserts-starless-nights',
  'src/features/resources/queries/fixtures/quest-death-house.json': '/v1/quests/death-house',
  'src/features/resources/queries/fixtures/quests-page-caught-in-the-web.json':
    '/v1/quests?q=caught%20in%20the%20web&limit=1',
  'src/features/resources/queries/fixtures/sets-null-icon-page.json':
    '/v1/sets?q=Conduit%20of%20the%20Titans&limit=1',
  'src/features/resources/queries/fixtures/adventure-pack-magic-of-myth-drannor.json':
    '/v1/adventure-packs/magic-of-myth-drannor?items_limit=200',
  'src/features/resources/queries/fixtures/crafting-system-slave-lords-crafting.json':
    '/v1/crafting-systems/slave-lords-crafting',
  'src/features/resources/queries/fixtures/item-barovian-handwraps.json':
    '/v1/items/barovian-handwraps',
  'src/features/resources/queries/fixtures/effect-curse-of-weakness.json':
    '/v1/effects/curse-of-weakness?items_limit=1&augments_limit=1&set_tiers_limit=1',
  'src/features/resources/queries/fixtures/effect-charisma-skills.json':
    '/v1/effects/charisma-skills?items_limit=1&augments_limit=1&set_tiers_limit=1',
  'src/features/resources/queries/fixtures/effect-riposte.json':
    '/v1/effects/riposte?items_limit=1&augments_limit=1&set_tiers_limit=1',
  'src/features/resources/queries/fixtures/effect-charisma.json':
    '/v1/effects/charisma?items_limit=1&augments_limit=1&set_tiers_limit=1',
  'src/features/resources/queries/fixtures/augment-eldritch-rune-of-skill--charisma.json':
    '/v1/augments/eldritch-rune-of-skill--charisma',
  'src/features/resources/queries/fixtures/augment-martial--shocking-burst-stunning-10-heightened-awareness-4.json':
    '/v1/augments/martial--shocking-burst-stunning-10-heightened-awareness-4',
  'src/features/resources/queries/fixtures/augment-solar-gem-of-physical-resistance-rating-heroic.json':
    '/v1/augments/solar-gem-of-physical-resistance-rating-heroic',
  'src/features/resources/queries/fixtures/effect-strength.json':
    '/v1/effects/strength?items_limit=1&augments_limit=1&set_tiers_limit=1',
  'src/features/resources/queries/fixtures/item-epic-ethereal-bracers.json':
    '/v1/items/epic-ethereal-bracers',
  'src/features/resources/queries/fixtures/item-greatsword-of-the-fallen-age.json':
    '/v1/items/greatsword-of-the-fallen-age',
  'src/features/resources/queries/fixtures/item-1-quarterstaff-of-lesser-halfling-bane.json':
    '/v1/items/1-quarterstaff-of-lesser-halfling-bane',
  'src/features/resources/queries/fixtures/item-absolute-judgement.json':
    '/v1/items/absolute-judgement',
  'src/features/resources/queries/fixtures/item-adversion.json': '/v1/items/adversion',
  'src/features/resources/queries/fixtures/item-aegis-of-the-deep.json':
    '/v1/items/aegis-of-the-deep',
  'src/features/resources/queries/fixtures/item-stolen-necklace-level-25.json':
    '/v1/items/stolen-necklace-level-25',
  'src/features/resources/queries/fixtures/item-tower-shield-of-the-fallen-age.json':
    '/v1/items/tower-shield-of-the-fallen-age',
  'src/features/resources/queries/fixtures/item-beholder-plate-armor.json':
    '/v1/items/beholder-plate-armor',
  'src/features/resources/queries/fixtures/item-blight-inferno.json': '/v1/items/blight-inferno',
  'src/features/resources/queries/fixtures/effects-page-groups.json':
    '/v1/effects?limit=4&kind=group',
  'src/features/resources/queries/fixtures/effects-page.json': '/v1/effects?limit=3&q=absorption',
  'src/features/resources/queries/fixtures/set-captains-set.json': '/v1/sets/captains-set',
  'src/features/resources/queries/fixtures/set-the-devils-handiwork.json':
    '/v1/sets/the-devils-handiwork',
  'src/features/resources/queries/fixtures/set-adherent-of-the-mists-set-heroic.json':
    '/v1/sets/adherent-of-the-mists-set-heroic',
  'src/features/resources/queries/fixtures/set-devoted-heart.json': '/v1/sets/devoted-heart',
  'src/features/resources/queries/fixtures/event-treasure-of-crystal-cove.json':
    '/v1/events/treasure-of-crystal-cove',
  'src/features/resources/queries/fixtures/item-barbettes-bracers.json':
    '/v1/items/barbettes-bracers',
  'src/features/resources/queries/fixtures/quest-chain-the-lost-seekers.json':
    '/v1/quest-chains/the-lost-seekers',
  'src/features/resources/queries/fixtures/saga-the-haunting-of-saltmarsh.json':
    '/v1/sagas/the-haunting-of-saltmarsh',
  'src/features/resources/queries/fixtures/set-conduit-of-the-titans.json':
    '/v1/sets/conduit-of-the-titans',
  'src/features/resources/queries/fixtures/sets-page.json': '/v1/sets?limit=3',
  'src/lib/api/fixtures/adventure-packs.json': '/v1/adventure-packs?limit=67',
  'src/lib/api/fixtures/optional-buffs.json': '/v1/optional-buffs?limit=50',
  'src/test/fixtures/vendor-morten-edgewright.json': '/v1/vendors/morten-edgewright',
}

const captures = Object.entries(manifest).map(([file, capture]) => {
  const { path, status } = typeof capture === 'string' ? { path: capture, status: 200 } : capture
  const isSpecification = path.endsWith('/openapi.json')
  const isValidDestination = isSpecification
    ? file.startsWith('src/lib/api/openapi/')
    : file.includes('/fixtures/')
  if (!isValidDestination) throw new Error(`Invalid capture placement: ${file} ← ${path}`)
  return { file, path, status, isSpecification }
})

const { values } = parseArgs({
  options: {
    api: { type: 'string', default: 'https://ddo-data.fly.dev' },
    file: { type: 'string', multiple: true },
  },
})
for (const file of values.file ?? []) {
  if (!Object.hasOwn(manifest, file)) throw new Error(`Unknown capture: ${file}`)
}
for (const { file, path, status, isSpecification } of captures) {
  if (values.file && !values.file.includes(file)) continue
  const response = await fetch(new URL(path, values.api))
  if (response.status !== status) {
    throw new Error(`${path}: expected HTTP ${status}, received ${response.status}`)
  }
  const body = await response.text()
  JSON.parse(body)
  await writeFile(
    new URL(`../${file}`, import.meta.url),
    isSpecification ? await format(body, { ...(await resolveConfig(file)), parser: 'json' }) : body,
  )
  console.info(`${file} ← ${response.url}`)
}
