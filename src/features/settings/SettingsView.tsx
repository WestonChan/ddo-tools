import { useState, type CSSProperties, type JSX, type ReactNode } from 'react'
import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { WireframePlaceholder } from '../../components'
import { useTheme, type ThemePreference } from '../../hooks'
import {
  ACCENT_PRESETS,
  applyAccent,
  saveAccent,
  activeAccent,
  type AccentPreset,
} from '../../lib/accent'
import './SettingsView.css'

const THEME_OPTIONS: { themePreference: ThemePreference; label: string; Icon: LucideIcon }[] = [
  { themePreference: 'dark', label: 'Dark', Icon: Moon },
  { themePreference: 'light', label: 'Light', Icon: Sun },
  { themePreference: 'system', label: 'System', Icon: Monitor },
]

export function SettingsView(): JSX.Element {
  return (
    <div className="page settings-view">
      <h2 className="settings-view-title">Settings</h2>

      <AppearanceSection />

      <section className="settings-view-section">
        <div className="section-label">Owned content</div>
        <WireframePlaceholder
          label="F2P / Premium / VIP preset + per-pack toggles"
          minHeightPx={160}
        />
      </section>

      <section className="settings-view-section">
        <div className="section-label">Data</div>
        <WireframePlaceholder label="user.db export / import" minHeightPx={60} />
      </section>
    </div>
  )
}

function AppearanceSection(): JSX.Element {
  const { themePreference, setThemePreference } = useTheme()
  const [selectedAccentName, setSelectedAccentName] = useState<string>(activeAccent)

  function pickAccent(preset: AccentPreset): void {
    applyAccent(preset.name)
    saveAccent(preset.name)
    setSelectedAccentName(preset.name)
  }

  return (
    <section className="settings-view-appearance">
      <div className="section-label settings-view-appearance-eyebrow">Appearance</div>

      <AppearanceRow
        title="Theme"
        hint={themePreference === 'system' ? 'Follows your OS setting' : undefined}
      >
        <div
          className="segmented-control segmented-control--joined"
          role="group"
          aria-label="Theme"
        >
          {THEME_OPTIONS.map((option) => {
            const isActive = themePreference === option.themePreference
            return (
              <button
                key={option.themePreference}
                type="button"
                aria-pressed={isActive}
                className={`segmented-control-segment${isActive ? ' segmented-control-segment--active' : ''}`}
                onClick={() => setThemePreference(option.themePreference)}
              >
                <option.Icon size={14} />
                {option.label}
              </button>
            )
          })}
        </div>
      </AppearanceRow>

      <AppearanceRow title="Accent" hint="Selection, primary action, links">
        <div className="settings-view-accent-swatches" role="group" aria-label="Accent">
          {ACCENT_PRESETS.map((preset) => {
            const isSelected = selectedAccentName === preset.name
            return (
              <button
                key={preset.name}
                type="button"
                aria-pressed={isSelected}
                className="settings-view-accent-swatch"
                style={
                  {
                    '--swatch-fill': preset.ramp[400],
                    '--swatch-border': preset.ramp[500],
                  } as CSSProperties
                }
                onClick={() => pickAccent(preset)}
              >
                <span className="settings-view-accent-chip">
                  {isSelected && <Check size={12} />}
                </span>
                {preset.name}
              </button>
            )
          })}
        </div>
      </AppearanceRow>

      <p className="settings-view-appearance-note">
        Damage-type, enhancement-tree and augment colors never change — they encode meaning. Class
        trees stay gold regardless of accent.
      </p>
    </section>
  )
}

function AppearanceRow({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="settings-view-row">
      <div className="settings-view-row-label">
        <span className="settings-view-row-title">{title}</span>
        {hint && <span className="settings-view-row-hint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
