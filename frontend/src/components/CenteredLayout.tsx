import type { ReactNode } from 'react'

interface CenteredLayoutProps {
  children: ReactNode
  /** Wide layout for tablet/desktop dashboards. Default: false (card mode). */
  wide?: boolean
}

/**
 * Responsive shell used by all pages.
 *
 * - Phone  (<640px)  : full-screen, no rounding, no shadow
 * - Tablet (640-1023): centered card, max-w-2xl, rounded card
 * - Desktop (≥1024px): wider centered layout, max-w-5xl, full height sidebar style when wide=true
 */
export default function CenteredLayout({ children, wide = false }: CenteredLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F5F7F6] flex items-start sm:items-center justify-center sm:px-6 sm:py-8">
      <div
        className={[
          'w-full bg-white flex flex-col',
          // Mobile: no rounding, fills screen
          'min-h-screen sm:min-h-0',
          // Tablet+: card with rounding & shadow
          'sm:rounded-2xl sm:shadow-soft sm:overflow-hidden',
          // Width cap
          wide ? 'sm:max-w-3xl lg:max-w-5xl' : 'sm:max-w-lg',
          // Desktop: taller card
          'sm:max-h-[92vh]',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  )
}
