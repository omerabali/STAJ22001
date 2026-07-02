import { defineMiddleware } from 'astro:middleware';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const onRequest = defineMiddleware((context, next) => {
  const token = context.cookies.get('token')?.value;
  const user = token ? parseJwt(token) : null;
  const path = context.url.pathname;

  // Save user object to Astro.locals
  context.locals.user = user;

  console.log(`[MIDDLEWARE] Path: ${path} | Token exists: ${!!token} | User parsed: ${JSON.stringify(user)}`);

  // Define route groups
  const isAdminRoute = path.startsWith('/admin');
  const isCandidateRoute = path.startsWith('/profile') || path.startsWith('/analyses') || path === '/settings';
  const isAuthRoute = path === '/login' || path === '/register';

  // 1. Unauthenticated users trying to access protected routes
  if (!user && (isAdminRoute || isCandidateRoute)) {
    console.log(`[MIDDLEWARE] Redirecting unauthenticated user from ${path} to /login`);
    return context.redirect('/login');
  }

  // 2. Authenticated users
  if (user) {
    // Prevent CANDIDATE from accessing ADMIN routes
    if (isAdminRoute && user.role !== 'ADMIN') {
      return context.redirect('/profile');
    }
    
    // Prevent ADMIN from accessing CANDIDATE routes
    if (isCandidateRoute && user.role === 'ADMIN') {
      return context.redirect('/admin/dashboard');
    }

    // Redirect away from auth pages if already logged in
    if (isAuthRoute || path === '/') {
      if (user.role === 'ADMIN') {
        return context.redirect('/admin/dashboard');
      } else {
        return context.redirect('/profile');
      }
    }
  }

  return next();
});
