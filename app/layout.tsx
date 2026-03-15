import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ORS Report Suite',
  description: 'Reporting and analytics suite for ORS data',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
