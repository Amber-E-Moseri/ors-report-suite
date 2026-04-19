import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      hasSession: Boolean(data.session),
      projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Supabase health error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
