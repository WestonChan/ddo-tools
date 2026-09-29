import { useState, useEffect, type JSX } from 'react'
import { Sun, Moon, Check } from 'lucide-react'
import { useTheme } from '../../hooks'
import { ACCENT_PRESETS, applyAccent, saveAccent, activeAccent, restoreAccent } from '../../lib/accent'
import './SettingsView.css'

export function SettingsView(): JSX.Element {
  const { theme, toggleTheme } = useTheme()
  const [selectedAccent, setSelectedAccent] = useState<string>(activeAccent)

  useEffect(() => restoreAccent(), [])

  return (
    <div className="settings-view">
      <h2 className="settings-view-title">Settings</h2>

      <div className="settings-view-section">
        <div className="settings-view-label">Theme</div>
        <div className="settings-view-theme-toggle">
          <button
            className={`settings-view-theme-opt hoverable${theme === 'light' ? ' active' : ''}`}
            onClick={() => { if (theme !== 'light') toggleTheme() }}
          >
            <Sun size={16} /> Light
          </button>
          <button
            className={`settings-view-theme-opt hoverable${theme === 'dark' ? ' active' : ''}`}
            onClick={() => { if (theme !== 'dark') toggleTheme() }}
          >
            <Moon size={16} /> Dark
          </button>
        </div>
      </div>

      <div className="settings-view-section">
        <div className="settings-view-label">Accent Color</div>
        <div className="settings-view-accent-grid">
          {ACCENT_PRESETS.map((accentPreset) => (
            <button
              key={accentPreset.name}
              className={`settings-view-accent-swatch hoverable${selectedAccent === accentPreset.color ? ' selected' : ''}`}
              onClick={() => {
                applyAccent(accentPreset.color)
                saveAccent(accentPreset.color)
                setSelectedAccent(accentPreset.color)
              }}
            >
              <span className="settings-view-accent-dot" style={{ background: accentPreset.color }} />
              <span className="settings-view-accent-name">{accentPreset.name}</span>
              {selectedAccent === accentPreset.color && (
                <span className="settings-view-accent-check"><Check size={14} /></span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
