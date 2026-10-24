import { lazyRouteComponent } from '@tanstack/react-router'

export const BuildOverviewView = lazyRouteComponent(
  () => import('../features/build/lazyViews'),
  'BuildOverviewView',
)
export const BuildPlanView = lazyRouteComponent(
  () => import('../features/build/lazyViews'),
  'BuildPlanView',
)
export const CharacterView = lazyRouteComponent(
  () => import('../features/character/lazyViews'),
  'CharacterView',
)
export const GearView = lazyRouteComponent(() => import('../features/gear/lazyViews'), 'GearView')
export const ResourcesView = lazyRouteComponent(
  () => import('../features/resources/lazyViews'),
  'ResourcesView',
)
export const SettingsView = lazyRouteComponent(
  () => import('../features/settings/lazyViews'),
  'SettingsView',
)
