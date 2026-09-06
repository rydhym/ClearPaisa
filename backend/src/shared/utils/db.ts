import 'dotenv/config';

// Neon recommends its pooled endpoint for application traffic. Besides reducing
// connection pressure, it avoids a Windows Schannel failure seen with Prisma's
// native engine against some direct Neon endpoints.
let runtimeDatabaseUrl = process.env.DATABASE_URL;
if (runtimeDatabaseUrl) {
  try {
    const parsed = new URL(runtimeDatabaseUrl);
    if (parsed.hostname.endsWith('.aws.neon.tech') && !parsed.hostname.includes('-pooler.')) {
      const firstDot = parsed.hostname.indexOf('.');
      parsed.hostname = `${parsed.hostname.slice(0, firstDot)}-pooler${parsed.hostname.slice(firstDot)}`;
      runtimeDatabaseUrl = parsed.toString();
      process.env.DATABASE_URL = runtimeDatabaseUrl;
    }
  } catch {
    // Prisma will provide the actionable validation error for malformed URLs.
  }
}

// Load Prisma only after the runtime URL has been normalized. The native query
// engine reads DATABASE_URL while the generated client module initializes.
const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const prisma = new PrismaClient(
  runtimeDatabaseUrl ? { datasources: { db: { url: runtimeDatabaseUrl } } } : undefined
);

export default prisma;
