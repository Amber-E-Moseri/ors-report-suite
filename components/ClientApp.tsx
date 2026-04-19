'use client'

import dynamic from 'next/dynamic'

const AppShell = dynamic(
  () => import('@/components/AppShell').then(m => ({ default: m.AppShell })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-8 h-8 rounded-full border-4 mx-auto mb-3 spin"
            style={{ borderColor: '#2A5298', borderTopColor: 'transparent' }}
          />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    ),
  }
)

export function ClientApp() {
  return <AppShell />
}
