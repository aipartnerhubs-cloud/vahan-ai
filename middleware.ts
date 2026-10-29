import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function withSecurityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cache-Control', 'no-store, max-age=0');

  if (request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}

function isApiPath(pathname: string) {
  return pathname === '/api' || pathname.startsWith('/api/');
}

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/login';
  const isApi = isApiPath(pathname);

  if (!isConfigured()) {
    if (isApi) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: 'Application authentication is not configured.' },
          { status: 503 }
        ),
        request
      );
    }

    if (isLoginPage) {
      return withSecurityHeaders(NextResponse.next(), request);
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '?setup=missing';
    return withSecurityHeaders(NextResponse.redirect(loginUrl), request);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Validate the session with Supabase; do not trust client-supplied user data.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (isLoginPage && user && !error) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.search = '';
    return withSecurityHeaders(NextResponse.redirect(homeUrl), request);
  }

  if (!isLoginPage && (!user || error)) {
    if (isApi) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
        request
      );
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
