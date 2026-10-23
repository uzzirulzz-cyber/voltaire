import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

/**
 * Serverless cold-start guard (Vercel).
 *
 * /tmp is the only writable path in a serverless function and starts EMPTY
 * on every cold start. DATABASE_URL points at file:/tmp/custom.db, so Prisma
 * would auto-create an EMPTY database — `SELECT 1` works (health check) but
 * every real query fails ("table does not exist") and all sign-ins die with
 * "Failed to finish Firebase sign-in".
 *
 * The repository's db/custom.db (schema + data, 77KB) is bundled into the
 * function via `outputFileTracingIncludes` in next.config.ts. On first
 * import we copy it into place. Data written at runtime is ephemeral per
 * instance — swap DATABASE_URL to a managed Postgres for durability.
 */
function ensureSqliteDatabase(): void {
  const url = process.env.DATABASE_URL || ''
  if (!url.startsWith('file:')) return // non-SQLite (e.g. Postgres) — nothing to do
  const target = url.slice('file:'.length)
  if (!target || target.startsWith('./') || target.startsWith('../')) return
  if (fs.existsSync(target)) return

  const candidates = [
    path.join(process.cwd(), 'db', 'custom.db'),
    path.join(process.cwd(), 'db/custom.db'),
    path.join(process.cwd(), '../db/custom.db'),
    path.join(process.cwd(), '../../db/custom.db'),
  ]
  for (const source of candidates) {
    try {
      if (fs.existsSync(source)) {
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.copyFileSync(source, target)
        return
      }
    } catch {
      /* try the next candidate */
    }
  }
}

ensureSqliteDatabase()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db