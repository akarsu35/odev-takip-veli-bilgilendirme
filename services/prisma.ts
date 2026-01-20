import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error(
    'CRITICAL: DATABASE_URL is not defined in environment variables.',
  )
}

if (!globalForPrisma.prisma) {
  try {
    const isSupabase =
      dbUrl?.includes('supabase.co') || dbUrl?.includes('supabase.com')
    const pool = new pg.Pool({
      connectionString: dbUrl,
      ssl: isSupabase ? { rejectUnauthorized: false } : false,
      max: 1, // Minimize connections per lambda instance
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    const adapter = new PrismaPg(pool)
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    })
    console.log('PrismaClient initialized successfully')
  } catch (error) {
    console.error('Failed to initialize PrismaClient:', error)
  }
}

prisma = globalForPrisma.prisma!

export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    throw new Error('PrismaClient is not initialized. Check your DATABASE_URL.')
  }
  return prisma
}

export default getPrisma
