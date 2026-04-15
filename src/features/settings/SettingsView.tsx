import { useState, useEffect } from 'react'
import { Sun, Moon, Check } from 'lucide-react'
import { useTheme, THEMES, applyAccent, restoreAccent } from '../../hooks'
import './SettingsView.css'

function getActiveAccent(): string | null {
  try {
    const stored = localStorage.getItem('accent')
    if (!stored) return null
    return JSON.parse(stored).accent ?? null
  } catch {
    return null
  }
}

export function SettingsView() {
  const { theme, toggle } = useTheme()
  const [activeAccent, setActiveAccent] = useState<string | null>(getActiveAccent)

  useEffect(() => restoreAccent(), [])

  return (
    <div className="settings-view">
      <h2 className="settings-view-title">Settings</h2>

      <div className="settings-view-section">
        <div className="settings-view-label">Theme</div>
        <div className="settings-view-theme-toggle">
          <button
            className={`settings-view-theme-opt${theme === 'light' ? ' active' : ''}`}
            onClick={() => { if (theme !== 'light') toggle() }}
          >
            <Sun size={16} /> Light
          </button>
          <button
            className={`settings-view-theme-opt${theme === 'dark' ? ' active' : ''}`}
            onClick={() => { if (theme !== 'dark') toggle() }}
          >
            <Moon size={16} /> Dark
          </button>
        </div>
      </div>

      <div className="settings-view-section">
        <div className="settings-view-label">Accent Color</div>
        <div className="settings-view-accent-grid">
          {THEMES.map((t) => (
            <button
              key={t.name}
              className={`settings-view-accent-swatch${activeAccent === t.accent ? ' selected' : ''}`}
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
