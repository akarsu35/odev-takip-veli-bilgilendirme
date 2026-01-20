import { defineConfig, env } from '@prisma/config'
import 'dotenv/config'

export default defineConfig({
  engine: 'classic',
  datasource: {
    url: env('DIRECT_URL') || env('DATABASE_URL'),
  },
})
