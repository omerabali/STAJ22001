import type { APIRoute } from 'astro';
import { readSessionUser, SESSION_COOKIE } from '../../lib/auth';

export const GET: APIRoute = async ({ cookies }) => {
  const user = await readSessionUser(cookies.get(SESSION_COOKIE)?.value);

  return Response.json({
    authenticated: Boolean(user),
    user
  });
};
