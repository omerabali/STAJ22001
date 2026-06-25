const DEFAULT_EMAIL = 'demo@cvlens.dev';
const DEFAULT_PASSWORD = 'cv-lens-demo';
const DEFAULT_SECRET = 'dev-session-secret';

export const SESSION_COOKIE = 'cv_lens_session';

export function getDemoCredentials() {
  return {
    email: import.meta.env.AUTH_USERNAME ?? DEFAULT_EMAIL,
    password: import.meta.env.AUTH_PASSWORD ?? DEFAULT_PASSWORD
  };
}

function getSessionSecret() {
  return import.meta.env.AUTH_SESSION_SECRET ?? DEFAULT_SECRET;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const binary = atob(padded.replaceAll('-', '+').replaceAll('_', '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export async function createSessionToken(email: string) {
  const signature = await sha256(`${email}:${getSessionSecret()}`);
  return `${toBase64Url(email)}.${signature}`;
}

export async function readSessionUser(token?: string) {
  if (!token) {
    return null;
  }

  const [encodedEmail, signature] = token.split('.');
  if (!encodedEmail || !signature) {
    return null;
  }

  const email = fromBase64Url(encodedEmail);
  const expectedToken = await createSessionToken(email);

  if (token !== expectedToken) {
    return null;
  }

  return {
    email,
    name: email.split('@')[0],
    role: 'CV Lens Aday Analisti'
  };
}

export function isValidLogin(email: string, password: string) {
  const credentials = getDemoCredentials();
  return email === credentials.email && password === credentials.password;
}
