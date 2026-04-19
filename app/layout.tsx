import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'ORS Report Suite',
  description: 'Reporting and analytics suite for ORS data',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* Suppress extension-injected body attribute mismatches (e.g. ClickUp); do not use this to mask real app hydration bugs. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
