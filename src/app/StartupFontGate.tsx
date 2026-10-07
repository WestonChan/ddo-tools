import { useEffect, useState, type JSX, type ReactNode } from 'react'
import { ApiGate } from '../components'
import './StartupFontGate.css'

const APP_FONT_WAIT_CAP_MS = 1500

interface StartupFontGateProps {
  fontsReady: Promise<unknown>
  children: ReactNode
}

export function StartupFontGate({ fontsReady, children }: StartupFontGateProps): JSX.Element {
  const [areFontsPending, setAreFontsPending] = useState(true)

  useEffect(() => {
    let isWaiting = true
    const cap = window.setTimeout(() => {
      isWaiting = false
      setAreFontsPending(false)
    }, APP_FONT_WAIT_CAP_MS)
    const revealApp = (): void => {
      if (!isWaiting) return
      isWaiting = false
      window.clearTimeout(cap)
      setAreFontsPending(false)
    }
    void fontsReady.then(revealApp, revealApp)
    return () => {
      isWaiting = false
      window.clearTimeout(cap)
    }
  }, [fontsReady])

  return (
    <>
      <div
        className={areFontsPending ? 'startup-font-gate__app--hidden' : undefined}
        aria-hidden={areFontsPending}
        inert={areFontsPending || undefined}
      >
        {children}
      </div>
      {areFontsPending && (
        <div className="startup-font-gate__skeleton">
          <ApiGate isPending>{null}</ApiGate>
        </div>
      )}
    </>
  )
}
