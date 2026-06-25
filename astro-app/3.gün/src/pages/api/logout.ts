import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../lib/auth';

export const POST: APIRoute = async ({ cookies, request }) => {
  cookies.delete(SESSION_COOKIE, {
    path: '/'
  });

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL('/login', request.url).toString()
    }
  });
};
