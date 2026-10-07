import { Fragment, type JSX, type ReactNode } from 'react'

export function ResourceStatusView({ entries }: { entries: readonly ReactNode[] }): JSX.Element {
  return (
    <>
      {entries.map((entry, index) => (
        <Fragment key={index}>{entry}</Fragment>
      ))}
    </>
  )
}
