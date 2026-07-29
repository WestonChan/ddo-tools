import { useState, useEffect, type JSX } from 'react'
import { Sun, Moon, Check } from 'lucide-react'
import { useTheme } from '../../hooks'
import { ACCENT_PRESETS, applyAccent, resolveActiveAccent, restoreAccent } from '../../lib/accent'
import './SettingsView.css'

export function SettingsView(): JSX.Element {
  const { theme, toggle } = useTheme()
  const [activeAccent, setActiveAccent] = useState<string>(resolveActiveAccent)

  useEffect(() => restoreAccent(), [])

  return (
    <div className="settings-view">
      <h2 className="settings-view-title">Settings</h2>

      <div className="settings-view-section">
        <div className="settings-view-label">Theme</div>
        <div className="settings-view-theme-toggle">
          <button
            className={`settings-view-theme-opt hoverable${theme === 'light' ? ' active' : ''}`}
            onClick={() => { if (theme !== 'light') toggle() }}
          >
            <Sun size={16} /> Light
          </button>
          <button
            className={`settings-view-theme-opt hoverable${theme === 'dark' ? ' active' : ''}`}
            onClick={() => { if (theme !== 'dark') toggle() }}
          >
            <Moon size={16} /> Dark
          </button>
        </div>
      </div>

      <div className="settings-view-section">
        <div className="settings-view-label">Accent Color</div>
        <div className="settings-view-accent-grid">
          {ACCENT_PRESETS.map((t) => (
            <button
              key={t.name}
              className={`settings-view-accent-swatch hoverable${activeAccent === t.accent ? ' selected' : ''}`}
              onClick={() => {
                applyAccent(t.accent)
                setActiveAccent(t.accent)
              }}
            >
              <span className="settings-view-accent-dot" style={{ background: t.accent }} />
              <span className="settings-view-accent-name">{t.name}</span>
              {activeAccent === t.accent && (
                <span className="settings-view-accent-check"><Check size={14} /></span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
