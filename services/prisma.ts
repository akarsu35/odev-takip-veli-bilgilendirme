import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  throw new Error('DATABASE_URL is not defined in environment variables.')
}

if (process.env.NODE_ENV === 'production') {
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase.co') ? { rejectUnauthorized: false } : false,
  })
  const adapter = new PrismaPg(pool)
  prisma = new PrismaClient({
    adapter,
    log: ['error'],
  })
} else {
  if (!globalForPrisma.prisma) {
    const pool = new pg.Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : false,
    })
    const adapter = new PrismaPg(pool)
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: ['query', 'error', 'warn'],
    })
  }
  prisma = globalForPrisma.prisma
}

export const getPrisma = (): PrismaClient => prisma

export default getPrisma
