import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { isAgentAllowlistConfigured, isAllowedAgentEmail, isProductionDeployment } from '@/lib/agent-access';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function withSecurityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname === '/api' || pathname.startsWith('/api/');
  const isLogin = pathname === '/login';

  if (!SUPABASE_URL || !SUPABASE_KEY || (isProductionDeployment() && !isAgentAllowlistConfigured())) {
    if (isApi) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Application authentication is not configured.' }, { status: 503 }),
        request
      );
    }
    if (isLogin) return withSecurityHeaders(NextResponse.next(), request);

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = 'setup=missing';
    return withSecurityHeaders(NextResponse.redirect(loginUrl), request);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  const allowed = Boolean(user && !error && isAllowedAgentEmail(user.email));

  if (isLogin && allowed) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.search = '';
    return withSecurityHeaders(NextResponse.redirect(homeUrl), request);
  }

  if (user && !error && !allowed) {
    if (isApi) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'This account is not authorized for Vahan AI.' }, { status: 403 }),
        request
      );
    }
    if (!isLogin) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.search = 'access=denied';
      return withSecurityHeaders(NextResponse.redirect(loginUrl), request);
    }
  }

  if (!isLogin && (!allowed || error)) {
    if (isApi) {
      return withSecurityHeaders(NextResponse.json({ error: 'Authentication required.' }, { status: 401 }), request);
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    return withSecurityHeaders(NextResponse.redirect(loginUrl), request);
  }

  return withSecurityHeaders(response, request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)'],
};
