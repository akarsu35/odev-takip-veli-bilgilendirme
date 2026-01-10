import { defineConfig, env } from '@prisma/config'
import 'dotenv/config'

export default defineConfig({
  engine: 'classic',
  datasource: {
    url: env('DATABASE_URL'),
  },
})
