import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

const getDbUrl = () => process.env.DATABASE_URL || process.env.DIRECT_URL

if (!globalForPrisma.prisma) {
  const dbUrl = getDbUrl()
  if (!dbUrl) {
    console.error(
      'CRITICAL: No database connection URL found in environment variables.',
    )
  } else {
    try {
      const isSupabase =
        dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com')
      const pool = new pg.Pool({
        connectionString: dbUrl,
        ssl: isSupabase ? { rejectUnauthorized: false } : false,
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      })

      const adapter = new PrismaPg(pool)
      globalForPrisma.prisma = new PrismaClient({
        adapter,
        log: ['query', 'info', 'warn', 'error'],
      })
      console.log('PrismaClient initialized successfully.')
    } catch (error) {
      console.error('PrismaClient initialization error:', error)
    }
  }
}

export const getPrisma = (): PrismaClient => {
  const p = globalForPrisma.prisma
  if (!p) {
    const dbUrl = getDbUrl()
    throw new Error(
      `PrismaClient initialization failed. DATABASE_URL is ${dbUrl ? 'present' : 'MISSING'}.`,
    )
  }
  return p
}

export default getPrisma
