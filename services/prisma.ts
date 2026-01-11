import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaClient: PrismaClient | undefined

export const getPrisma = (): PrismaClient => {
  if (globalForPrisma.prisma) return globalForPrisma.prisma
  if (prismaClient) return prismaClient

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not defined in environment variables.')
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase.co') ? { rejectUnauthorized: false } : false,
  })

  const adapter = new PrismaPg(pool)
  prismaClient = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

  if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prismaClient
  return prismaClient
}

export const prisma = getPrisma() // Backward compatibility for existing imports
export default prisma
