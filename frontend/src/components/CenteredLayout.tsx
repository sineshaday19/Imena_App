import type { ReactNode } from 'react'

interface CenteredLayoutProps {
  children: ReactNode
}

export default function CenteredLayout({ children }: CenteredLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7F6] px-4 py-6">
      {children}
    </div>
  )
}
