/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      id: string;
      email: string;
      role: 'ADMIN' | 'CANDIDATE';
      name?: string;
    } | null;
  }
}
