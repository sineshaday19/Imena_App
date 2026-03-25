import type { ReactNode } from 'react'

interface CenteredLayoutProps {
  children: ReactNode
  wide?: boolean
}

export default function CenteredLayout({ children, wide = false }: CenteredLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F5F7F6] flex items-start sm:items-center justify-center sm:px-6 sm:py-8">
      <div
        className={[
          'w-full bg-white flex flex-col',
          'min-h-screen sm:min-h-0',
          'sm:rounded-2xl sm:shadow-soft sm:overflow-hidden',
          wide ? 'sm:max-w-3xl lg:max-w-5xl' : 'sm:max-w-lg',
          'sm:max-h-[92vh]',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  )
}
