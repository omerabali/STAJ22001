/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly AUTH_USERNAME?: string;
  readonly AUTH_PASSWORD?: string;
  readonly AUTH_SESSION_SECRET?: string;
  readonly PUBLIC_APP_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
