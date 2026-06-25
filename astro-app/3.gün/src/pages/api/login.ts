import type { APIRoute } from 'astro';
import { createSessionToken, isValidLogin, SESSION_COOKIE } from '../../lib/auth';

function redirectTo(path: string, request: Request) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(path, request.url).toString()
    }
  });
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const contentType = request.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await request.json() : Object.fromEntries(await request.formData());

  const email = String(payload.email ?? '').trim();
  const password = String(payload.password ?? '');

  if (!isValidLogin(email, password)) {
    if (isJson) {
      return Response.json({ ok: false, message: 'Invalid credentials' }, { status: 401 });
    }

    return redirectTo('/login?error=credentials', request);
  }

  cookies.set(SESSION_COOKIE, await createSessionToken(email), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60
  });

  if (isJson) {
    return Response.json({ ok: true, redirectTo: '/dashboard' });
  }

  return redirectTo('/dashboard', request);
};
