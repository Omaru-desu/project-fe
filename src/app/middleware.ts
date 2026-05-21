
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
 
  // Public routes — always allow
  if (pathname === '/' || pathname.startsWith('/login')) {
    // If already logged in, skip landing/login and go straight to /projects
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name) => request.cookies.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return NextResponse.redirect(new URL('/projects', request.url))
    return NextResponse.next()
  }
 
  // Protected routes — require auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => request.cookies.get(name)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
 
  if (!user) {
    // Not authenticated → send to landing page
    return NextResponse.redirect(new URL('/', request.url))
  }
 
  return NextResponse.next()
}
 
export const config = {
  matcher: [
    '/',
    '/login',
    '/projects',
    '/projects/:path*',
    '/dashboard/:path*',
  ],
}