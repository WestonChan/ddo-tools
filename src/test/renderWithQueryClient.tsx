import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render as renderComponent } from '@testing-library/react'

export function render(
  ...[component, options]: Parameters<typeof renderComponent>
): ReturnType<typeof renderComponent> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function QueryWrapper({ children }: { children: ReactNode }): ReactNode {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return renderComponent(component, { ...options, wrapper: QueryWrapper })
}
